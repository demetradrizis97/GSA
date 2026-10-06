const COUNTRY_DATA_URL = "./data-countries-110m.geojson";

const SEERIST_API_BASE_URL = "https://api.platform.seerist.com";
const VZLA_FOLDER_ID = "3e639ebc-58ae-45bf-87b0-2d0542cae323";
const SEERIST_CONTENT_CONCURRENCY = 5;

const INTENSITY_STYLES = {
  low: {
    label: "Low",
    color: "#5fb0ff",
    glow: "rgba(95, 176, 255, 0.45)"
  },
  elevated: {
    label: "Elevated",
    color: "#4fe0c2",
    glow: "rgba(79, 224, 194, 0.45)"
  },
  high: {
    label: "High",
    color: "#ffbf5f",
    glow: "rgba(255, 191, 95, 0.5)"
  },
  critical: {
    label: "Critical",
    color: "#ff6b6b",
    glow: "rgba(255, 107, 107, 0.52)"
  }
};

const BASE_LAYERS = {
  current: {
    kind: "vector"
  },
  blueMarble: {
    kind: "texture",
    projection: "equirectangular",
    src: "./assets/blue-marble-2048.png"
  },
  openStreetMap: {
    kind: "texture",
    projection: "webMercator",
    src: "./assets/osm-world-z4-4096.png"
  }
};

const canvas = document.getElementById("globe");
const ctx = canvas.getContext("2d");

const reportCountEl = document.getElementById("report-count");
const reportCardShellEl = document.querySelector(".map-overlay-card");
const reportCardEl = document.getElementById("report-card");
const importFeedbackEl = document.getElementById("import-feedback");

const refreshNewsBtn = document.getElementById("refresh-news-btn");
const closeCardBtn = document.getElementById("close-card-btn");
const feedStatusEl = document.getElementById("feed-status");

const seeristBaseUrlEl = document.getElementById("seerist-base-url");
const seeristTokenEl = document.getElementById("seerist-token");
const seeristToggleEl = document.getElementById("seerist-toggle");
const seeristBodyEl = document.getElementById("seerist-body");
const loadSeeristVzlaBtn = document.getElementById("load-seerist-vzla");

const layerButtons = Array.from(
  document.querySelectorAll(".layer-option")
);

let countryFeatures = [];
let reportMarkers = [];
let projectedMarkers = [];
let selectedReportId = null;
let allLiveReports = [];

const textureLayers = new Map();
const textureBuffer = document.createElement("canvas");
const textureBufferCtx = textureBuffer.getContext("2d");

const state = {
  baseLayer: "current",
  rotationLon: -25,
  rotationLat: -12,
  zoom: 1,
  dragging: false,
  pointerDown: null,
  selectedMarker: null,
  selectedMarkerPosition: null,
  view: {
    centerX: 0,
    centerY: 0,
    radius: 0
  }
};

/* ------------------------------------------------------------------
   General utility functions
   ------------------------------------------------------------------ */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function toDegrees(value) {
  return (value * 180) / Math.PI;
}

function normalizeLongitude(value) {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeLatLon(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }

  return {
    latitude,
    longitude
  };
}

function getIntensityLevel(score) {
  const value = Number(score);

  if (!Number.isFinite(value)) {
    return "low";
  }

  if (value >= 85) {
    return "critical";
  }

  if (value >= 65) {
    return "high";
  }

  if (value >= 40) {
    return "elevated";
  }

  return "low";
}

function getReportStyle(report) {
  const level = report.intensityLevel ||
    getIntensityLevel(report.intensityScore);

  return INTENSITY_STYLES[level] || INTENSITY_STYLES.low;
}

/* ------------------------------------------------------------------
   Globe projection and rotation
   ------------------------------------------------------------------ */

function latLonFromNormalized(nx, ny, centerLon, centerLat) {
  const rho = Math.min(1, Math.hypot(nx, ny));
  const c = Math.asin(rho);

  const phi0 = toRadians(centerLat);
  const lambda0 = toRadians(centerLon);

  let phi = phi0;
  let lambda = lambda0;

  if (rho > 1e-6) {
    const sinC = Math.sin(c);
    const cosC = Math.cos(c);

    phi = Math.asin(
      cosC * Math.sin(phi0) +
      (ny * sinC * Math.cos(phi0)) / rho
    );

    lambda = lambda0 + Math.atan2(
      nx * sinC,
      rho * Math.cos(phi0) * cosC -
      ny * Math.sin(phi0) * sinC
    );
  }

  return {
    lat: clamp(toDegrees(phi), -90, 90),
    lon: normalizeLongitude(toDegrees(lambda))
  };
}

function projectPointWithCenter(
  lat,
  lon,
  centerLon,
  centerLat,
  radius,
  centerX,
  centerY
) {
  const phi = toRadians(lat);
  const lambda = toRadians(lon);
  const phi0 = toRadians(centerLat);
  const lambda0 = toRadians(centerLon);

  const delta = lambda - lambda0;

  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosPhi0 = Math.cos(phi0);
  const sinPhi0 = Math.sin(phi0);
  const cosDelta = Math.cos(delta);
  const sinDelta = Math.sin(delta);

  const depth =
    sinPhi0 * sinPhi +
    cosPhi0 * cosPhi * cosDelta;

  const x = radius * cosPhi * sinDelta;

  const y = radius * (
    cosPhi0 * sinPhi -
    sinPhi0 * cosPhi * cosDelta
  );

  return {
    x: centerX + x,
    y: centerY - y,
    visible: depth > 0.0001,
    depth
  };
}

function projectPoint(lat, lon, radius, centerX, centerY) {
  return projectPointWithCenter(
    lat,
    lon,
    state.rotationLon,
    state.rotationLat,
    radius,
    centerX,
    centerY
  );
}

function clampPointerToSphere(pointer) {
  const { centerX, centerY, radius } = state.view;

  if (!radius) {
    return null;
  }

  let x = (pointer.x - centerX) / radius;
  let y = (centerY - pointer.y) / radius;

  const length = Math.hypot(x, y);

  if (length > 1) {
    x /= length;
    y /= length;
  }

  return {
    x,
    y,
    inside: length <= 1
  };
}

function invertPoint(pointer) {
  const point = clampPointerToSphere(pointer);

  if (!point || !point.inside) {
    return null;
  }

  return {
    ...latLonFromNormalized(
      point.x,
      point.y,
      state.rotationLon,
      state.rotationLat
    ),
    inside: true
  };
}

function solveRotationForAnchor(anchor, pointer) {
  const clamped = clampPointerToSphere(pointer);

  if (!clamped) {
    return null;
  }

  const x = clamped.x;
  const y = clamped.y;
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));

  const phi = toRadians(anchor.lat);
  const lambda = toRadians(anchor.lon);

  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  if (Math.abs(cosPhi) < 1e-6) {
    return null;
  }

  const sinDelta = clamp(x / cosPhi, -1, 1);

  const cosDeltaMagnitude = Math.sqrt(
    Math.max(0, 1 - sinDelta * sinDelta)
  );

  const candidates = [];

  for (const sign of [1, -1]) {
    const cosDelta = sign * cosDeltaMagnitude;

    const a = sinPhi;
    const b = cosPhi * cosDelta;

    const phi0 = Math.atan2(
      a * z - b * y,
      a * y + b * z
    );

    const lambda0 = lambda - Math.atan2(
      sinDelta,
      cosDelta
    );

    const candidate = {
      lon: normalizeLongitude(toDegrees(lambda0)),
      lat: clamp(toDegrees(phi0), -89.999, 89.999)
    };

    const projected = projectPointWithCenter(
      anchor.lat,
      anchor.lon,
      candidate.lon,
      candidate.lat,
      state.view.radius,
      state.view.centerX,
      state.view.centerY
    );

    if (projected.visible) {
      candidates.push(candidate);
    }
  }

  if (!candidates.length) {
    return null;
  }

  candidates.sort((left, right) => {
    const leftDistance =
      Math.abs(left.lat - state.rotationLat) +
      Math.abs(left.lon - state.rotationLon);

    const rightDistance =
      Math.abs(right.lat - state.rotationLat) +
      Math.abs(right.lon - state.rotationLon);

    return leftDistance - rightDistance;
  });

  return candidates[0];
}

/* ------------------------------------------------------------------
   Globe drawing
   ------------------------------------------------------------------ */

function drawSphere(centerX, centerY, radius) {
  const glow = ctx.createRadialGradient(
    centerX - radius * 0.25,
    centerY - radius * 0.35,
    radius * 0.15,
    centerX,
    centerY,
    radius * 1.1
  );

  glow.addColorStop(0, "#183455");
  glow.addColorStop(0.4, "#08111d");
  glow.addColorStop(1, "#03070d");

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(130, 180, 255, 0.3)";
  ctx.stroke();
}

function drawSphereOutline(centerX, centerY, radius) {
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(130, 180, 255, 0.24)";
  ctx.stroke();
}

function generateSamples(start, end, step, builder) {
  const result = [];

  for (let value = start; value <= end; value += step) {
    result.push(builder(value));
  }

  return result;
}

function drawPolyline(points, centerX, centerY, radius, closePath) {
  let started = false;

  ctx.beginPath();

  for (const point of points) {
    const projected = projectPoint(
      point.lat,
      point.lon,
      radius,
      centerX,
      centerY
    );

    if (!projected.visible) {
      started = false;
      continue;
    }

    if (!started) {
      ctx.moveTo(projected.x, projected.y);
      started = true;
    } else {
      ctx.lineTo(projected.x, projected.y);
    }
  }

  if (closePath && started) {
    ctx.closePath();
  }

  ctx.stroke();
}

function drawGraticule(centerX, centerY, radius) {
  ctx.save();
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = "rgba(120, 170, 255, 0.16)";

  for (let lat = -60; lat <= 60; lat += 30) {
    drawPolyline(
      generateSamples(-180, 180, 4, (lon) => ({ lat, lon })),
      centerX,
      centerY,
      radius,
      false
    );
  }

  for (let lon = -150; lon <= 180; lon += 30) {
    drawPolyline(
      generateSamples(-85, 85, 4, (lat) => ({ lat, lon })),
      centerX,
      centerY,
      radius,
      false
    );
  }

  ctx.restore();
}

function coordinatesToLatLon(coordinates) {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number"
  ) {
    return [{
      lon: coordinates[0],
      lat: coordinates[1]
    }];
  }

  return coordinates.flatMap(coordinatesToLatLon);
}

function drawCountries(centerX, centerY, radius) {
  ctx.save();
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = "rgba(127, 200, 255, 0.32)";

  countryFeatures.forEach((feature) => {
    const geometry = feature.geometry;

    if (!geometry) {
      return;
    }

    if (geometry.type === "Polygon") {
      geometry.coordinates.forEach((ring) => {
        drawPolyline(
          coordinatesToLatLon(ring),
          centerX,
          centerY,
          radius,
          true
        );
      });
    }

    if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => {
        polygon.forEach((ring) => {
          drawPolyline(
            coordinatesToLatLon(ring),
            centerX,
            centerY,
            radius,
            true
          );
        });
      });
    }
  });

  ctx.restore();
}

function wrapUnit(value) {
  return ((value % 1) + 1) % 1;
}

function getTextureCoordinates(projection, lat, lon) {
  const u = wrapUnit((lon + 180) / 360);

  if (projection === "webMercator") {
    const limit = 85.05112878;

    const clampedLat = clamp(lat, -limit, limit);

    const mercator = Math.log(
      Math.tan(Math.PI / 4 + toRadians(clampedLat) / 2)
    );

    return {
      u,
      v: clamp(0.5 - mercator / (2 * Math.PI), 0, 1)
    };
  }

  return {
    u,
    v: clamp((90 - lat) / 180, 0, 1)
  };
}

function sampleTexturePixel(texture, lat, lon) {
  const { u, v } = getTextureCoordinates(
    texture.projection,
    lat,
    lon
  );

  const x = Math.min(
    texture.width - 1,
    Math.floor(u * (texture.width - 1))
  );

  const y = Math.min(
    texture.height - 1,
    Math.floor(v * (texture.height - 1))
  );

  const index = (y * texture.width + x) * 4;

  return [
    texture.data[index],
    texture.data[index + 1],
    texture.data[index + 2],
    texture.data[index + 3]
  ];
}

function drawTexturedSphere(centerX, centerY, radius, layerKey) {
  const texture = textureLayers.get(layerKey);

  if (!texture) {
    drawSphere(centerX, centerY, radius);
    return;
  }

  const size = Math.max(
    600,
    Math.min(
      1400,
      Math.round(radius * 2 * Math.min(window.devicePixelRatio || 1, 2))
    )
  );

  const sphereRadius = size / 2;

  if (
    textureBuffer.width !== size ||
    textureBuffer.height !== size
  ) {
    textureBuffer.width = size;
    textureBuffer.height = size;
  }

  const imageData = textureBufferCtx.createImageData(size, size);
  const pixels = imageData.data;

  for (let y = 0; y < size; y += 1) {
    const ny = (sphereRadius - (y + 0.5)) / sphereRadius;

    for (let x = 0; x < size; x += 1) {
      const nx = ((x + 0.5) - sphereRadius) / sphereRadius;
      const distanceSquared = nx * nx + ny * ny;
      const index = (y * size + x) * 4;

      if (distanceSquared > 1) {
        pixels[index + 3] = 0;
        continue;
      }

      const z = Math.sqrt(1 - distanceSquared);

      const latLon = latLonFromNormalized(
        nx,
        ny,
        state.rotationLon,
        state.rotationLat
      );

      const sample = sampleTexturePixel(
        texture,
        latLon.lat,
        latLon.lon
      );

      const shade = 0.65 + z * 0.35;

      pixels[index] = Math.round(sample[0] * shade);
      pixels[index + 1] = Math.round(sample[1] * shade);
      pixels[index + 2] = Math.round(sample[2] * shade);
      pixels[index + 3] = sample[3];
    }
  }

  textureBufferCtx.putImageData(imageData, 0, 0);

  ctx.drawImage(
    textureBuffer,
    centerX - radius,
    centerY - radius,
    radius * 2,
    radius * 2
  );

  drawSphereOutline(centerX, centerY, radius);
}

function drawBaseLayer(centerX, centerY, radius) {
  const layer = BASE_LAYERS[state.baseLayer];

  if (!layer || layer.kind === "vector") {
    drawSphere(centerX, centerY, radius);
    drawGraticule(centerX, centerY, radius);
    drawCountries(centerX, centerY, radius);
    return;
  }

  drawTexturedSphere(
    centerX,
    centerY,
    radius,
    state.baseLayer
  );
}

/* ------------------------------------------------------------------
   Report card and report-marker functions
   ------------------------------------------------------------------ */

function formatLocation(report) {
  return `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`;
}

function renderReportCard(report) {
  if (!report) {
    reportCardShellEl.hidden = true;
    reportCardEl.innerHTML = "";
    return;
  }

  const style = getReportStyle(report);

  const metadata = [
    escapeHtml(report.category || "SEERIST"),
    escapeHtml(report.source || "Seerist"),
    escapeHtml(
      report.timestamp
        ? new Date(report.timestamp).toLocaleString()
        : "No date provided"
    )
  ];

  const locationName = [
    report.country,
    report.region
  ].filter(Boolean).join(" · ");

  const articleLink = report.url
    ? `
      <a
        href="${escapeHtml(report.url)}"
        target="_blank"
        rel="noopener noreferrer"
        class="article-link-btn"
      >
        🔗 Read Story on ${escapeHtml(report.source || "Source")} ↗
      </a>
    `
    : "";

  reportCardShellEl.hidden = false;

  reportCardEl.innerHTML = `
    <div class="card-kicker">${metadata.join(" · ")}</div>

    <div class="intensity-badge">
      <span
        class="intensity-dot"
        style="background:${style.color}"
      ></span>
      ${escapeHtml(style.label)} intensity
    </div>

    <h3>${escapeHtml(report.title || "Untitled Seerist Article")}</h3>

    <p>${escapeHtml(report.summary || "No summary provided.")}</p>

    <dl class="report-meta">
      <div>
        <dt>Location</dt>
        <dd>${escapeHtml(locationName || "Coordinates available")}</dd>
      </div>

      <div>
        <dt>Source</dt>
        <dd>${escapeHtml(report.source || "Seerist")}</dd>
      </div>

      <div>
        <dt>Category</dt>
        <dd>${escapeHtml(report.category || "SEERIST")}</dd>
      </div>

      <div>
        <dt>Coordinates</dt>
        <dd>${escapeHtml(formatLocation(report))}</dd>
      </div>
    </dl>

    ${articleLink}
  `;
}

function updateReportCount() {
  reportCountEl.textContent = `${reportMarkers.length} articles`;
}

function normalizeReports(items) {
  const accepted = [];
  const rejected = [];

  items.forEach((item, index) => {
    const location = normalizeLatLon(
      item.latitude,
      item.longitude
    );

    if (!location) {
      rejected.push(index + 1);
      return;
    }

    accepted.push({
      ...item,
      id: item.id || `seerist-${index + 1}`,
      title: item.title || `Seerist Article ${index + 1}`,
      latitude: location.latitude,
      longitude: location.longitude,
      intensityScore: clamp(
        Number(item.intensityScore ?? 50),
        0,
        100
      ),
      intensityLevel: item.intensityLevel ||
        getIntensityLevel(item.intensityScore ?? 50)
    });
  });

  return {
    accepted,
    rejected
  };
}

function ingestReports(items) {
  const { accepted, rejected } = normalizeReports(items);

  reportMarkers = accepted;
  updateReportCount();

  if (rejected.length && importFeedbackEl) {
    importFeedbackEl.textContent =
      `Loaded ${accepted.length} Seerist article(s).\n\n` +
      `Skipped ${rejected.length} article(s) without valid coordinates.`;
  }

  if (!accepted.some((report) => report.id === selectedReportId)) {
    selectedReportId = null;
    state.selectedMarker = null;
    state.selectedMarkerPosition = null;
    renderReportCard(null);
  }

  drawScene();
}

function drawReports(centerX, centerY, radius) {
  projectedMarkers = [];
  state.selectedMarkerPosition = null;

  reportMarkers.forEach((report) => {
    const projected = projectPoint(
      report.latitude,
      report.longitude,
      radius,
      centerX,
      centerY
    );

    if (!projected.visible) {
      return;
    }

    const selected = report.id === selectedReportId;
    const markerRadius = selected ? 6 : 4.2;
    const style = getReportStyle(report);

    ctx.beginPath();
    ctx.arc(
      projected.x,
      projected.y,
      markerRadius,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = style.color;
    ctx.shadowColor = selected
      ? "rgba(255, 211, 109, 0.55)"
      : style.glow;

    ctx.shadowBlur = selected ? 16 : 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (selected) {
      ctx.beginPath();
      ctx.arc(
        projected.x,
        projected.y,
        markerRadius + 2.6,
        0,
        Math.PI * 2
      );

      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "rgba(255, 244, 196, 0.95)";
      ctx.stroke();
    }

    projectedMarkers.push({
      report,
      x: projected.x,
      y: projected.y,
      radius: markerRadius + 5
    });

    if (selected) {
      state.selectedMarkerPosition = {
        x: projected.x,
        y: projected.y
      };
    }
  });
}

function findMarkerAtPoint(pointer) {
  for (let index = projectedMarkers.length - 1; index >= 0; index -= 1) {
    const marker = projectedMarkers[index];

    if (
      Math.hypot(
        marker.x - pointer.x,
        marker.y - pointer.y
      ) <= marker.radius
    ) {
      return marker;
    }
  }

  return null;
}

function updateCanvasCursor(pointer) {
  if (state.dragging) {
    return;
  }

  canvas.classList.toggle(
    "is-hover-report",
    Boolean(pointer && findMarkerAtPoint(pointer))
  );
}

function positionReportCard() {
  if (!selectedReportId || !state.selectedMarkerPosition) {
    reportCardShellEl.hidden = true;
    return;
  }

  reportCardShellEl.hidden = false;

  const frameRect = canvas.parentElement.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  const width = reportCardShellEl.offsetWidth;
  const height = reportCardShellEl.offsetHeight;

  const dotX = state.selectedMarkerPosition.x +
    canvasRect.left -
    frameRect.left;

  const dotY = state.selectedMarkerPosition.y +
    canvasRect.top -
    frameRect.top;

  const gap = 18;
  const padding = 16;

  let left = dotX + gap;
  let top = dotY - height / 2;

  if (left + width > frameRect.width - padding) {
    left = dotX - width - gap;
  }

  left = clamp(left, padding, frameRect.width - width - padding);
  top = clamp(top, padding, frameRect.height - height - padding);

  reportCardShellEl.style.left = `${left}px`;
  reportCardShellEl.style.top = `${top}px`;
}

/* ------------------------------------------------------------------
   Main rendering and base-map loading
   ------------------------------------------------------------------ */

function drawScene() {
  const ratio = window.devicePixelRatio || 1;
  const bounds = canvas.getBoundingClientRect();

  const width = bounds.width;
  const height = bounds.height;

  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const centerX = width / 2;
  const centerY = height / 2;

  const radius = Math.min(width, height) * 0.43 * state.zoom;

  state.view = {
    centerX,
    centerY,
    radius
  };

  const background = ctx.createLinearGradient(
    0,
    0,
    width,
    height
  );

  background.addColorStop(0, "#08111b");
  background.addColorStop(1, "#05080f");

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  drawBaseLayer(centerX, centerY, radius);
  drawReports(centerX, centerY, radius);
  positionReportCard();
}

async function loadCountries() {
  try {
    const response = await fetch(COUNTRY_DATA_URL);
    const data = await response.json();

    countryFeatures = Array.isArray(data.features)
      ? data.features
      : [];

  } catch (error) {
    console.error("Country boundary data unavailable:", error);
  }

  drawScene();
}

function loadTextureLayer(key, layer) {
  const image = new Image();

  image.decoding = "async";

  image.addEventListener("load", () => {
    const sourceCanvas = document.createElement("canvas");

    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;

    const sourceCtx = sourceCanvas.getContext("2d");

    sourceCtx.drawImage(image, 0, 0);

    const imageData = sourceCtx.getImageData(
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height
    );

    textureLayers.set(key, {
      projection: layer.projection,
      width: sourceCanvas.width,
      height: sourceCanvas.height,
      data: imageData.data
    });

    drawScene();
  });

  image.src = layer.src;
}

function initializeBaseLayers() {
  Object.entries(BASE_LAYERS).forEach(([key, layer]) => {
    if (layer.kind === "texture") {
      loadTextureLayer(key, layer);
    }
  });

  layerButtons.forEach((button) => {
    const active = button.dataset.layer === state.baseLayer;

    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

/* ------------------------------------------------------------------
   Seerist API functions
   ------------------------------------------------------------------ */

function getSeeristBaseUrl() {
  return (seeristBaseUrlEl?.value || SEERIST_API_BASE_URL)
    .trim()
    .replace(/\/+$/, "");
}

function getSeeristToken() {
  const rawToken = seeristTokenEl?.value || "";

  // Remove common invisible characters introduced by copy/paste.
  const cleanedToken = rawToken
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/^Bearer\s+/i, "");

  // HTTP header values must not contain non-ASCII Unicode characters.
  if (/[^\x20-\x7E]/.test(cleanedToken)) {
    throw new Error(
      "The Seerist token contains a non-ASCII or hidden character. " +
      "Clear the field and paste the raw token again without quotation marks."
    );
  }

  return cleanedToken;
}

function buildSeeristUrl(baseUrl, path) {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

async function seeristApiRequest(url, token, options = {}) {
  const response = await fetch(url, {
    mode: "cors",
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const detail = typeof data === "string"
      ? data
      : JSON.stringify(data);

    throw new Error(
      `${response.status} ${response.statusText}` +
      `${detail ? `: ${detail}` : ""}`
    );
  }

  return data;
}

async function getAllSeeristFolderItems(baseUrl, token, folderId) {
  const items = [];
  const perPage = 100;

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = buildSeeristUrl(
      baseUrl,
      `/folders/${encodeURIComponent(folderId)}/items` +
      `?page=${page}&perPage=${perPage}&includeContent=true`
    );

    const result = await seeristApiRequest(
      url,
      token,
      { method: "GET" }
    );

    items.push(...(result.items || []));

    hasMore = Boolean(result.pagination?.hasMore);
    page += 1;
  }

  return items;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function workerLoop() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      results[currentIndex] = await worker(
        items[currentIndex],
        currentIndex
      );
    }
  }

  const workers = Math.min(limit, items.length);

  await Promise.all(
    Array.from(
      { length: workers },
      () => workerLoop()
    )
  );

  return results;
}

function extractSeeristLocation(article, folderItem = {}) {
  const candidates = [
    article,
    article.location,
    article.geo,
    article.geolocation,
    article.eventLocation,
    folderItem,
    folderItem.location,
    folderItem.geo,
    folderItem.geolocation
  ].filter(Boolean);

  for (const candidate of candidates) {
    const direct = normalizeLatLon(
      candidate.latitude ?? candidate.lat,
      candidate.longitude ?? candidate.lon ?? candidate.lng
    );

    if (direct) {
      return direct;
    }

    if (
      Array.isArray(candidate.coordinates) &&
      candidate.coordinates.length >= 2
    ) {
      const fromCoordinates = normalizeLatLon(
        candidate.coordinates[1],
        candidate.coordinates[0]
      );

      if (fromCoordinates) {
        return fromCoordinates;
      }
    }
  }

  const locations = [
    ...(Array.isArray(article.locations) ? article.locations : []),
    ...(Array.isArray(folderItem.locations) ? folderItem.locations : [])
  ];

  for (const location of locations) {
    const direct = normalizeLatLon(
      location.latitude ?? location.lat,
      location.longitude ?? location.lon ?? location.lng
    );

    if (direct) {
      return direct;
    }

    if (
      Array.isArray(location.coordinates) &&
      location.coordinates.length >= 2
    ) {
      const fromCoordinates = normalizeLatLon(
        location.coordinates[1],
        location.coordinates[0]
      );

      if (fromCoordinates) {
        return fromCoordinates;
      }
    }
  }

  return null;
}

function getSeeristSourceName(article) {
  const firstSource = Array.isArray(article.sources)
    ? article.sources[0]
    : null;

  if (typeof firstSource === "string") {
    return firstSource;
  }

  if (firstSource && typeof firstSource === "object") {
    return (
      firstSource.name ||
      firstSource.title ||
      firstSource.publisher ||
      "Seerist"
    );
  }

  return "Seerist";
}

function getSeeristArticleUrl(article) {
  const firstSource = Array.isArray(article.sources)
    ? article.sources[0]
    : null;

  return (
    article.url ||
    article.link ||
    article.sourceUrl ||
    firstSource?.url ||
    ""
  );
}

function seeristArticleToReport(article, folderItem = {}) {
  const location = extractSeeristLocation(article, folderItem);

  if (!location) {
    return null;
  }

  return {
    id: article.id || folderItem.contentId || folderItem.id,

    title: article.title ||
      folderItem.title ||
      "Untitled Seerist Article",

    summary: article.summary ||
      article.description ||
      "",

    latitude: location.latitude,
    longitude: location.longitude,

    country: article.country ||
      article.location?.country ||
      "",

    region: article.region ||
      article.location?.region ||
      "",

    category: (
      article.category ||
      article.type ||
      folderItem.category ||
      "SEERIST"
    ).toUpperCase(),

    source: getSeeristSourceName(article),

    timestamp: article.publishedAt ||
      article.occurredAt ||
      article.createdAt ||
      "",

    url: getSeeristArticleUrl(article),

    intensityScore: Number(
      article.intensityScore ??
      article.severityScore ??
      article.riskScore ??
      50
    )
  };
}

async function fetchSeeristVzlaReports() {
  const baseUrl = getSeeristBaseUrl();
  const token = getSeeristToken();

  if (!baseUrl) {
    throw new Error("Enter the Seerist API base URL.");
  }

  if (!token) {
    throw new Error("Enter a Seerist bearer token or API key.");
  }

  if (feedStatusEl) {
    feedStatusEl.textContent = "SEERIST LOADING";
  }

  const folderItems = await getAllSeeristFolderItems(
    baseUrl,
    token,
    VZLA_FOLDER_ID
  );

  const itemByContentId = new Map(
    folderItems
      .filter((item) => item.contentId)
      .map((item) => [item.contentId, item])
  );

  const contentIds = [...itemByContentId.keys()];

  if (!contentIds.length) {
    return [];
  }

  const reports = await mapWithConcurrency(
    contentIds,
    SEERIST_CONTENT_CONCURRENCY,
    async (contentId, index) => {
      if (feedStatusEl) {
        feedStatusEl.textContent =
          `SEERIST ${index + 1}/${contentIds.length}`;
      }

      try {
        const article = await seeristApiRequest(
          buildSeeristUrl(
            baseUrl,
            `/content/${encodeURIComponent(contentId)}`
          ),
          token,
          { method: "GET" }
        );

        return seeristArticleToReport(
          article,
          itemByContentId.get(contentId)
        );

      } catch (error) {
        console.warn(
          `Unable to load Seerist article ${contentId}:`,
          error
        );

        return null;
      }
    }
  );

  return reports.filter(Boolean);
}

async function loadSeeristVzlaNews() {
  if (reportCountEl) {
    reportCountEl.textContent = "Loading Seerist data...";
  }

  if (refreshNewsBtn) {
    refreshNewsBtn.classList.add("spinning");
  }

  if (loadSeeristVzlaBtn) {
    loadSeeristVzlaBtn.disabled = true;
  }

  try {
    const reports = await fetchSeeristVzlaReports();

    allLiveReports = reports;
    reportMarkers = [];
    projectedMarkers = [];

    selectedReportId = null;
    state.selectedMarker = null;
    state.selectedMarkerPosition = null;

    renderReportCard(null);
    ingestReports(reports);

    if (feedStatusEl) {
      feedStatusEl.textContent = "SEERIST VZLA";
    }

    if (importFeedbackEl) {
      importFeedbackEl.textContent =
        `Loaded ${reports.length} Seerist VZLA article(s) ` +
        "with usable coordinates.";
    }

  } catch (error) {
    allLiveReports = [];
    reportMarkers = [];
    projectedMarkers = [];

    selectedReportId = null;
    state.selectedMarker = null;
    state.selectedMarkerPosition = null;

    updateReportCount();
    renderReportCard(null);
    drawScene();

    if (feedStatusEl) {
      feedStatusEl.textContent = "SEERIST ERROR";
    }

    if (importFeedbackEl) {
      importFeedbackEl.textContent =
        `Unable to load Seerist VZLA data: ${error.message}`;
    }

    console.error("Seerist VZLA load failed:", error);

  } finally {
    if (refreshNewsBtn) {
      refreshNewsBtn.classList.remove("spinning");
    }

    if (loadSeeristVzlaBtn) {
      loadSeeristVzlaBtn.disabled = false;
    }
  }
}

/* ------------------------------------------------------------------
   Event handling
   ------------------------------------------------------------------ */

function readPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

canvas.addEventListener("pointerdown", (event) => {
  const pointer = readPointerPosition(event);
  const anchor = invertPoint(pointer);

  state.dragging = Boolean(anchor);

  state.pointerDown = {
    pointer,
    anchor
  };

  if (anchor) {
    canvas.classList.remove("is-hover-report");
    canvas.classList.add("is-dragging");
  }

  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  const pointer = readPointerPosition(event);

  if (
    !state.dragging ||
    !state.pointerDown ||
    !state.pointerDown.anchor
  ) {
    updateCanvasCursor(pointer);
    return;
  }

  const rotation = solveRotationForAnchor(
    state.pointerDown.anchor,
    pointer
  );

  if (rotation) {
    state.rotationLon = rotation.lon;
    state.rotationLat = rotation.lat;
    drawScene();
  }
});

canvas.addEventListener("pointerup", (event) => {
  const pointer = readPointerPosition(event);

  const downPointer = state.pointerDown
    ? state.pointerDown.pointer
    : pointer;

  const distance = Math.hypot(
    pointer.x - downPointer.x,
    pointer.y - downPointer.y
  );

  if (distance < 8) {
    const hit = findMarkerAtPoint(pointer);

    selectedReportId = hit
      ? hit.report.id
      : null;

    state.selectedMarker = hit
      ? hit.report
      : null;

    renderReportCard(state.selectedMarker);
  }

  state.dragging = false;
  state.pointerDown = null;

  canvas.classList.remove("is-dragging");

  drawScene();
  updateCanvasCursor(pointer);
});

canvas.addEventListener("pointercancel", () => {
  state.dragging = false;
  state.pointerDown = null;

  canvas.classList.remove("is-dragging");
  canvas.classList.remove("is-hover-report");
});

canvas.addEventListener("pointerleave", () => {
  if (!state.dragging) {
    canvas.classList.remove("is-hover-report");
  }
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();

  const factor = Math.exp(-event.deltaY * 0.0015);

  state.zoom = clamp(
    state.zoom * factor,
    0.75,
    5.5
  );

  drawScene();
  updateCanvasCursor(readPointerPosition(event));
}, { passive: false });

window.addEventListener("resize", drawScene);

layerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.baseLayer = button.dataset.layer;

    layerButtons.forEach((otherButton) => {
      const active = otherButton.dataset.layer === state.baseLayer;

      otherButton.classList.toggle("active", active);
      otherButton.setAttribute("aria-pressed", String(active));
    });

    drawScene();
  });
});

if (seeristToggleEl && seeristBodyEl) {
  seeristToggleEl.addEventListener("click", () => {
    const expanded =
      seeristToggleEl.getAttribute("aria-expanded") === "true";

    seeristToggleEl.setAttribute(
      "aria-expanded",
      String(!expanded)
    );

    seeristBodyEl.hidden = expanded;
  });
}

if (loadSeeristVzlaBtn) {
  loadSeeristVzlaBtn.addEventListener("click", () => {
    loadSeeristVzlaNews();
  });
}

if (refreshNewsBtn) {
  refreshNewsBtn.addEventListener("click", () => {
    loadSeeristVzlaNews();
  });
}

if (closeCardBtn) {
  closeCardBtn.addEventListener("click", () => {
    selectedReportId = null;
    state.selectedMarker = null;
    state.selectedMarkerPosition = null;

    renderReportCard(null);
    drawScene();
  });
}

/*
  Optional automatic refresh. It runs only after a token has been entered.
*/
setInterval(() => {
  if (getSeeristToken()) {
    loadSeeristVzlaNews();
  }
}, 5 * 60 * 1000);

/* ------------------------------------------------------------------
   Application startup
   ------------------------------------------------------------------ */

renderReportCard(null);
initializeBaseLayers();
drawScene();
loadCountries();

window.ReportsGlobe = {
  loadSeeristVzlaNews,
  getReports: () => allLiveReports
};
