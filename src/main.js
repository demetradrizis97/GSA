const COUNTRY_DATA_URL = "./data-countries-110m.geojson";
const PRIMARY_NEWS_API_URL = window.NEWS_BACKEND_URL || (new URLSearchParams(window.location.search).get("api")) || "/api/news";
const FALLBACK_NEWS_FEED_URL = "./news-feed.json";
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
    label: "Current",
    kind: "vector",
    attribution: ""
  },
  blueMarble: {
    label: "Blue Marble",
    kind: "texture",
    projection: "equirectangular",
    src: "./assets/blue-marble-2048.png",
    attribution: "Blue Marble imagery: NASA"
  },
  openStreetMap: {
    label: "OpenStreetMap",
    kind: "texture",
    projection: "webMercator",
    src: "./assets/osm-world-z4-4096.png",
    attribution: "Map data © OpenStreetMap contributors"
  }
};

const canvas = document.getElementById("globe");
const ctx = canvas.getContext("2d");
const reportCountEl = document.getElementById("report-count");
const reportCardShellEl = document.querySelector(".map-overlay-card");
const reportCardEl = document.getElementById("report-card");
const reportInputEl = document.getElementById("report-input");
const importFeedbackEl = document.getElementById("import-feedback");
const importButton = document.getElementById("import-reports");
const importToggleEl = document.getElementById("import-toggle");
const importBodyEl = document.getElementById("import-body");
const layerButtons = Array.from(document.querySelectorAll(".layer-option"));
const sampleButton = document.getElementById("load-sample");
const refreshNewsBtn = document.getElementById("refresh-news-btn");
const closeCardBtn = document.getElementById("close-card-btn");
const feedStatusEl = document.getElementById("feed-status");
const categoryChips = Array.from(document.querySelectorAll(".filter-chip"));
const loadLiveApiBtn = document.getElementById("load-live-api");

let allLiveReports = [];
let currentCategory = "ALL";

const locatorResolvers = new Map();
const textureLayers = new Map();
const textureBuffer = document.createElement("canvas");
const textureBufferCtx = textureBuffer.getContext("2d");
let countryFeatures = [];
let countryLabels = [];
let reportMarkers = [];
let projectedMarkers = [];
let selectedReportId = null;

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

function shortestLongitudeDelta(target, source) {
  return normalizeLongitude(target - source);
}

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
      cosC * Math.sin(phi0) + (ny * sinC * Math.cos(phi0)) / rho
    );
    lambda = lambda0 + Math.atan2(
      nx * sinC,
      rho * Math.cos(phi0) * cosC - ny * Math.sin(phi0) * sinC
    );
  }

  return {
    lat: clamp(toDegrees(phi), -90, 90),
    lon: normalizeLongitude(toDegrees(lambda))
  };
}

function projectPointWithCenter(lat, lon, centerLon, centerLat, radius, centerX, centerY) {
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

  const depth = sinPhi0 * sinPhi + cosPhi0 * cosPhi * cosDelta;
  const x = radius * cosPhi * sinDelta;
  const y = radius * (cosPhi0 * sinPhi - sinPhi0 * cosPhi * cosDelta);

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

  let nx = (pointer.x - centerX) / radius;
  let ny = (centerY - pointer.y) / radius;
  const length = Math.hypot(nx, ny);

  if (length > 1) {
    nx /= length;
    ny /= length;
  }

  return {
    x: nx,
    y: ny,
    inside: length <= 1
  };
}

function invertPoint(pointer, clampOutside) {
  const clamped = clampPointerToSphere(pointer);
  if (!clamped || (!clamped.inside && !clampOutside)) {
    return null;
  }
  return {
    ...latLonFromNormalized(clamped.x, clamped.y, state.rotationLon, state.rotationLat),
    inside: clamped.inside
  };
}

function candidateRotationScore(candidate, anchor, pointer) {
  const projected = projectPointWithCenter(
    anchor.lat,
    anchor.lon,
    candidate.lon,
    candidate.lat,
    state.view.radius,
    state.view.centerX,
    state.view.centerY
  );

  const distance = Math.hypot(projected.x - pointer.x, projected.y - pointer.y);
  return distance
    + Math.abs(shortestLongitudeDelta(candidate.lon, state.rotationLon)) * 0.2
    + Math.abs(candidate.lat - state.rotationLat) * 0.2;
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
  const cosDeltaMagnitude = Math.sqrt(Math.max(0, 1 - sinDelta * sinDelta));
  const signs = cosDeltaMagnitude < 1e-6 ? [1] : [1, -1];

  const candidates = signs
    .map((sign) => {
      const cosDelta = sign * cosDeltaMagnitude;
      const a = sinPhi;
      const b = cosPhi * cosDelta;
      const phi0 = Math.atan2(a * z - b * y, a * y + b * z);
      const lambda0 = lambda - Math.atan2(sinDelta, cosDelta);

      return {
        lon: normalizeLongitude(toDegrees(lambda0)),
        lat: clamp(toDegrees(phi0), -89.999, 89.999)
      };
    })
    .filter((candidate) => {
      return projectPointWithCenter(
        anchor.lat,
        anchor.lon,
        candidate.lon,
        candidate.lat,
        state.view.radius,
        state.view.centerX,
        state.view.centerY
      ).visible;
    });

  if (!candidates.length) {
    return null;
  }

  candidates.sort((left, right) => {
    return candidateRotationScore(left, anchor, pointer)
      - candidateRotationScore(right, anchor, pointer);
  });

  return candidates[0];
}

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

function drawSphereOutline(centerX, centerY, radius, color) {
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = color || "rgba(130, 180, 255, 0.24)";
  ctx.stroke();
}

function wrapUnit(value) {
  return ((value % 1) + 1) % 1;
}

function getTextureCoordinates(projection, lat, lon) {
  const u = wrapUnit((lon + 180) / 360);

  if (projection === "webMercator") {
    const mercatorLimit = 85.05112878;
    const clampedLat = clamp(lat, -mercatorLimit, mercatorLimit);
    const mercator = Math.log(Math.tan(Math.PI / 4 + toRadians(clampedLat) / 2));
    const v = clamp(0.5 - mercator / (2 * Math.PI), 0, 1);
    return { u, v };
  }

  return {
    u,
    v: clamp((90 - lat) / 180, 0, 1)
  };
}

function sampleTexturePixel(texture, lat, lon) {
  if (!texture || !texture.data) {
    return [12, 18, 28, 255];
  }

  const { u, v } = getTextureCoordinates(texture.projection, lat, lon);
  const x = Math.min(texture.width - 1, Math.floor(u * (texture.width - 1)));
  const y = Math.min(texture.height - 1, Math.floor(v * (texture.height - 1)));
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
  if (!texture || !texture.data) {
    drawSphere(centerX, centerY, radius);
    return;
  }

  const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
  const textureLimit = Math.min(texture.width, texture.height);
  const desiredSize = Math.round(
    radius * 2 * deviceScale * (state.dragging ? 0.82 : 1.18)
  );
  const size = Math.max(
    state.dragging ? 640 : 960,
    Math.min(
      state.dragging ? 1152 : 1720,
      textureLimit,
      desiredSize
    )
  );
  const sphereRadius = size / 2;

  if (textureBuffer.width !== size || textureBuffer.height !== size) {
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
      const latLon = latLonFromNormalized(nx, ny, state.rotationLon, state.rotationLat);
      const sample = sampleTexturePixel(texture, latLon.lat, latLon.lon);
      const shade = 0.65 + z * 0.35;

      pixels[index] = Math.round(sample[0] * shade);
      pixels[index + 1] = Math.round(sample[1] * shade);
      pixels[index + 2] = Math.round(sample[2] * shade);
      pixels[index + 3] = sample[3];
    }
  }

  textureBufferCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(textureBuffer, centerX - radius, centerY - radius, radius * 2, radius * 2);
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

  drawTexturedSphere(centerX, centerY, radius, state.baseLayer);

  if (state.baseLayer === "openStreetMap") {
    drawEnglishCountryLabels(centerX, centerY, radius);
  }
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
  for (let index = 0; index < points.length; index += 1) {
    const projected = projectPoint(points[index].lat, points[index].lon, radius, centerX, centerY);
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

function coordinatesToLatLon(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return [];
  }

  if (typeof coordinates[0] === "number") {
    return [{ lat: coordinates[1], lon: coordinates[0] }];
  }

  if (Array.isArray(coordinates[0])) {
    return coordinates.flatMap((entry) => coordinatesToLatLon(entry));
  }

  return [];
}

function extractBoundingBox(coordinates, box) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return;
  }

  if (typeof coordinates[0] === "number") {
    box.minLon = Math.min(box.minLon, coordinates[0]);
    box.maxLon = Math.max(box.maxLon, coordinates[0]);
    box.minLat = Math.min(box.minLat, coordinates[1]);
    box.maxLat = Math.max(box.maxLat, coordinates[1]);
    return;
  }

  coordinates.forEach((entry) => extractBoundingBox(entry, box));
}

function buildCountryLabels(features) {
  return features
    .map((feature) => {
      const box = {
        minLon: Infinity,
        maxLon: -Infinity,
        minLat: Infinity,
        maxLat: -Infinity
      };

      extractBoundingBox(feature.geometry ? feature.geometry.coordinates : null, box);
      if (!Number.isFinite(box.minLon)) {
        return null;
      }

      return {
        name: feature.properties.name || feature.properties.admin || "",
        labelrank: Number(feature.properties.labelrank || 99),
        lat: (box.minLat + box.maxLat) / 2,
        lon: (box.minLon + box.maxLon) / 2
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.labelrank - right.labelrank);
}

function drawEnglishCountryLabels(centerX, centerY, radius) {
  const minRank = state.zoom >= 3.2 ? 7 : state.zoom >= 2.2 ? 5 : 4;
  const minGap = state.zoom >= 3.2 ? 28 : state.zoom >= 2.2 ? 42 : 58;
  const placed = [];

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  countryLabels.forEach((label) => {
    if (!label.name || label.labelrank > minRank) {
      return;
    }

    const projected = projectPoint(label.lat, label.lon, radius, centerX, centerY);
    if (!projected.visible) {
      return;
    }

    const fontSize = label.labelrank <= 2
      ? 14
      : label.labelrank <= 4
        ? 12
        : 11;

    const collision = placed.some((entry) => {
      return Math.hypot(entry.x - projected.x, entry.y - projected.y) < minGap;
    });

    if (collision) {
      return;
    }

    placed.push({ x: projected.x, y: projected.y });

    ctx.font = `600 ${fontSize}px "IBM Plex Sans", sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(8, 15, 26, 0.88)";
    ctx.strokeText(label.name, projected.x, projected.y);
    ctx.fillStyle = "rgba(247, 251, 255, 0.96)";
    ctx.fillText(label.name, projected.x, projected.y);
  });

  ctx.restore();
}

function drawCountries(centerX, centerY, radius) {
  ctx.save();
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = "rgba(127, 200, 255, 0.32)";

  countryFeatures.forEach((feature) => {
    const geometry = feature.geometry || {};
    if (geometry.type === "Polygon") {
      geometry.coordinates.forEach((ring) => {
        drawPolyline(coordinatesToLatLon(ring), centerX, centerY, radius, true);
      });
    }

    if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => {
        polygon.forEach((ring) => {
          drawPolyline(coordinatesToLatLon(ring), centerX, centerY, radius, true);
        });
      });
    }
  });

  ctx.restore();
}

function formatLocation(report) {
  const lat = report.latitude.toFixed(4);
  const lon = report.longitude.toFixed(4);
  return `${lat}, ${lon}`;
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
  const level = report.intensityLevel || getIntensityLevel(report.intensityScore);
  return INTENSITY_STYLES[level] || INTENSITY_STYLES.low;
}

function renderReportCard(report) {
  if (!report) {
    reportCardShellEl.hidden = true;
    reportCardEl.className = "report-card";
    reportCardEl.innerHTML = "";
    return;
  }

  const meta = [
    report.category || "WORLD",
    report.source || "Global News",
    report.timestamp ? new Date(report.timestamp).toLocaleString() : "Live"
  ];
  const style = getReportStyle(report);
  const countryLine = [report.country, report.region].filter(Boolean).join(" · ");

  const articleLinkHtml = report.url ? `
    <a href="${escapeHtml(report.url)}" target="_blank" rel="noopener noreferrer" class="article-link-btn">
      🔗 Read Story on ${escapeHtml(report.source || "Source")} ↗
    </a>
  ` : "";

  reportCardShellEl.hidden = false;
  reportCardEl.className = "report-card";
  reportCardEl.innerHTML = `
    <div class="card-kicker">${meta.join(" · ")}</div>
    <div class="intensity-badge">
      <span class="intensity-dot" style="background:${style.color}"></span>
      ${escapeHtml(style.label)} intensity
    </div>
    <h3>${escapeHtml(report.title || report.id || "Untitled report")}</h3>
    <p>${escapeHtml(report.summary || "No summary provided.")}</p>
    <dl class="report-meta">
      <div>
        <dt>Location</dt>
        <dd>${escapeHtml(countryLine || "Global")}</dd>
      </div>
      <div>
        <dt>Source</dt>
        <dd>${escapeHtml(report.source || "International wire")}</dd>
      </div>
      <div>
        <dt>Category</dt>
        <dd>${escapeHtml(report.category || "WORLD")}</dd>
      </div>
      <div>
        <dt>Coordinates</dt>
        <dd>${escapeHtml(formatLocation(report))}</dd>
      </div>
    </dl>
    ${articleLinkHtml}
  `;
}

function updateLayerUi() {
  layerButtons.forEach((button) => {
    const active = button.dataset.layer === state.baseLayer;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function findMarkerAtPoint(pointer) {
  for (let index = projectedMarkers.length - 1; index >= 0; index -= 1) {
    const marker = projectedMarkers[index];
    if (Math.hypot(marker.x - pointer.x, marker.y - pointer.y) <= marker.radius) {
      return marker;
    }
  }

  return null;
}

function updateCanvasCursor(pointer) {
  if (state.dragging) {
    return;
  }

  const hovered = pointer ? findMarkerAtPoint(pointer) : null;
  canvas.classList.toggle("is-hover-report", Boolean(hovered));
}

function positionReportCard() {
  if (!selectedReportId || !state.selectedMarkerPosition) {
    reportCardShellEl.hidden = true;
    return;
  }

  reportCardShellEl.hidden = false;

  const frameRect = canvas.parentElement.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const shellWidth = reportCardShellEl.offsetWidth;
  const shellHeight = reportCardShellEl.offsetHeight;
  const dotX = state.selectedMarkerPosition.x + (canvasRect.left - frameRect.left);
  const dotY = state.selectedMarkerPosition.y + (canvasRect.top - frameRect.top);
  const gap = 18;
  const padding = 16;

  let left = dotX + gap;
  let top = dotY - shellHeight * 0.5;

  if (left + shellWidth > frameRect.width - padding) {
    left = dotX - shellWidth - gap;
  }

  left = clamp(left, padding, frameRect.width - shellWidth - padding);
  top = clamp(top, padding, frameRect.height - shellHeight - padding);

  reportCardShellEl.style.left = `${left}px`;
  reportCardShellEl.style.top = `${top}px`;
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

    const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
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

  updateLayerUi();
}

function escapeHtml(value) {
  return String(value)
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

function tryParseLatLonString(value) {
  const match = String(value)
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);

  if (!match) {
    return null;
  }

  return normalizeLatLon(match[1], match[2]);
}

function tryParseMgrs(value) {
  const cleaned = String(value || "").trim();
  if (!cleaned || !window.mgrs || typeof window.mgrs.toPoint !== "function") {
    return null;
  }

  try {
    const point = window.mgrs.toPoint(cleaned);
    return normalizeLatLon(point[1], point[0]);
  } catch (error) {
    return null;
  }
}

function registerLocatorResolver(type, resolver) {
  locatorResolvers.set(type, resolver);
}

registerLocatorResolver("latlon", (position) => normalizeLatLon(position.lat, position.lon));
registerLocatorResolver("mgrs", (position) => tryParseMgrs(position.value));

function resolveReportLocation(report) {
  const direct = normalizeLatLon(report.lat, report.lon)
    || normalizeLatLon(report.latitude, report.longitude);
  if (direct) {
    return { ...direct, rawLocation: "lat/lon fields" };
  }

  if (Array.isArray(report.coordinates) && report.coordinates.length >= 2) {
    const fromCoordinates = normalizeLatLon(report.coordinates[1], report.coordinates[0]);
    if (fromCoordinates) {
      return { ...fromCoordinates, rawLocation: "coordinates[]" };
    }
  }

  if (report.location && typeof report.location === "object") {
    const fromObject = normalizeLatLon(report.location.lat, report.location.lon);
    if (fromObject) {
      return { ...fromObject, rawLocation: "location object" };
    }
  }

  if (typeof report.location === "string") {
    const fromString = tryParseLatLonString(report.location) || tryParseMgrs(report.location);
    if (fromString) {
      return {
        ...fromString,
        rawLocation: tryParseLatLonString(report.location) ? "location string" : "location MGRS"
      };
    }
  }

  if (typeof report.mgrs === "string") {
    const fromMgrs = tryParseMgrs(report.mgrs);
    if (fromMgrs) {
      return { ...fromMgrs, rawLocation: "mgrs" };
    }
  }

  if (report.position && typeof report.position === "object") {
    const resolver = locatorResolvers.get(report.position.type);
    if (resolver) {
      const resolved = resolver(report.position);
      if (resolved) {
        return { ...resolved, rawLocation: `position:${report.position.type}` };
      }
    }
  }

  return null;
}

function normalizeReports(items) {
  const accepted = [];
  const rejected = [];

  items.forEach((item, index) => {
    const resolved = resolveReportLocation(item);
    if (!resolved) {
      rejected.push(`Report ${index + 1} could not resolve a position.`);
      return;
    }

    accepted.push({
      ...item,
      id: item.id || `report-${index + 1}`,
      title: item.title || item.name || `Report ${index + 1}`,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      rawLocation: resolved.rawLocation,
      intensityScore: clamp(Number(item.intensityScore ?? item.intensity ?? 0), 0, 100),
      intensityLevel: item.intensityLevel || getIntensityLevel(item.intensityScore ?? item.intensity)
    });
  });

  return { accepted, rejected };
}

function updateReportCount() {
  reportCountEl.textContent = `${reportMarkers.length} reports`;
}

function ingestReports(items) {
  const { accepted, rejected } = normalizeReports(items);
  reportMarkers = accepted;
  updateReportCount();
  importFeedbackEl.textContent = rejected.length
    ? `Imported ${accepted.length} reports.\n${rejected.join("\n")}`
    : `Imported ${accepted.length} reports.`;

  if (!accepted.find((report) => report.id === selectedReportId)) {
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
    const projected = projectPoint(report.latitude, report.longitude, radius, centerX, centerY);
    if (!projected.visible) {
      return;
    }

    const selected = report.id === selectedReportId;
    const dotRadius = selected ? 6 : 4.2;
    const style = getReportStyle(report);

    ctx.beginPath();
    ctx.arc(projected.x, projected.y, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = style.color;
    ctx.shadowColor = selected ? "rgba(255, 211, 109, 0.55)" : style.glow;
    ctx.shadowBlur = selected ? 16 : 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (selected) {
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, dotRadius + 2.6, 0, Math.PI * 2);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "rgba(255, 244, 196, 0.95)";
      ctx.stroke();
    }

    projectedMarkers.push({
      report,
      x: projected.x,
      y: projected.y,
      radius: dotRadius + 5
    });

    if (selected) {
      state.selectedMarkerPosition = {
        x: projected.x,
        y: projected.y
      };
    }
  });
}

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

  ctx.clearRect(0, 0, width, height);

  const backdrop = ctx.createLinearGradient(0, 0, width, height);
  backdrop.addColorStop(0, "#08111b");
  backdrop.addColorStop(1, "#05080f");
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

  drawBaseLayer(centerX, centerY, radius);
  drawReports(centerX, centerY, radius);
  positionReportCard();
}

async function loadCountries() {
  try {
    const response = await fetch(COUNTRY_DATA_URL);
    const data = await response.json();
    countryFeatures = Array.isArray(data.features) ? data.features : [];
    countryLabels = buildCountryLabels(countryFeatures);
  } catch (error) {
    console.error("Boundary data unavailable", error);
  }

  drawScene();
}

async function fetchLiveNewsReports() {
  // 1. Try configured/proxied backend API
  try {
    const response = await fetch(PRIMARY_NEWS_API_URL, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      const reports = Array.isArray(data) ? data : data.reports;
      if (Array.isArray(reports) && reports.length > 0) {
        if (feedStatusEl) feedStatusEl.textContent = "LIVE API";
        return reports;
      }
    }
  } catch (err) {
    console.warn("Primary live news API unreachable, falling back to static snapshot:", err.message);
  }

  // 2. Try pre-baked news-feed.json snapshot
  try {
    const response = await fetch(FALLBACK_NEWS_FEED_URL, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      const reports = Array.isArray(data) ? data : data.reports;
      if (Array.isArray(reports) && reports.length > 0) {
        if (feedStatusEl) feedStatusEl.textContent = "LIVE CACHED";
        return reports;
      }
    }
  } catch (err) {
    console.warn("Fallback news snapshot unreachable:", err.message);
  }

  throw new Error("Unable to connect to live news API or fallback snapshot.");
}

function applyCategoryFilter() {
  let filtered = allLiveReports;
  if (currentCategory && currentCategory !== "ALL") {
    filtered = allLiveReports.filter(r => (r.category || "").toUpperCase() === currentCategory);
  }
  reportInputEl.value = JSON.stringify(filtered, null, 2);
  ingestReports(filtered);
}

async function loadLiveNews() {
  if (reportCountEl) reportCountEl.textContent = "Fetching news...";
  if (refreshNewsBtn) refreshNewsBtn.classList.add("spinning");

  try {
    const reports = await fetchLiveNewsReports();
    allLiveReports = reports;
    applyCategoryFilter();
    importFeedbackEl.textContent = `Connected! ${reports.length} real-time global news headlines active.`;
  } catch (error) {
    reportInputEl.value = "[]";
    reportMarkers = [];
    updateReportCount();
    drawScene();
    importFeedbackEl.textContent = error.message;
    console.error("Live news feed unavailable:", error);
  } finally {
    if (refreshNewsBtn) refreshNewsBtn.classList.remove("spinning");
  }
}

function readPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

canvas.addEventListener("pointerdown", (event) => {
  const pointer = readPointerPosition(event);
  const anchor = invertPoint(pointer, false);

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
  const current = readPointerPosition(event);

  if (!state.dragging || !state.pointerDown || !state.pointerDown.anchor) {
    updateCanvasCursor(current);
    return;
  }

  const nextRotation = solveRotationForAnchor(state.pointerDown.anchor, current);

  if (nextRotation) {
    state.rotationLon = nextRotation.lon;
    state.rotationLat = nextRotation.lat;
    drawScene();
  }
});

canvas.addEventListener("pointerup", (event) => {
  const up = readPointerPosition(event);
  const down = state.pointerDown ? state.pointerDown.pointer : up;
  const moved = Math.hypot(up.x - down.x, up.y - down.y);

  if (moved < 8) {
    const hit = findMarkerAtPoint(up);

    selectedReportId = hit ? hit.report.id : null;
    state.selectedMarker = hit ? hit.report : null;
    renderReportCard(state.selectedMarker);
  }

  state.dragging = false;
  state.pointerDown = null;
  canvas.classList.remove("is-dragging");
  drawScene();
  updateCanvasCursor(up);
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
  state.zoom = clamp(state.zoom * factor, 0.75, 5.5);
  drawScene();
  updateCanvasCursor(readPointerPosition(event));
}, { passive: false });

window.addEventListener("resize", drawScene);

importToggleEl.addEventListener("click", () => {
  const expanded = importToggleEl.getAttribute("aria-expanded") === "true";
  importToggleEl.setAttribute("aria-expanded", String(!expanded));
  importBodyEl.hidden = expanded;
});

layerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.baseLayer = button.dataset.layer;
    updateLayerUi();
    drawScene();
  });
});

if (sampleButton) {
  sampleButton.addEventListener("click", () => {
    loadLiveNews();
  });
}

if (loadLiveApiBtn) {
  loadLiveApiBtn.addEventListener("click", () => {
    loadLiveNews();
  });
}

if (refreshNewsBtn) {
  refreshNewsBtn.addEventListener("click", () => {
    loadLiveNews();
  });
}

if (closeCardBtn) {
  closeCardBtn.addEventListener("click", () => {
    renderReportCard(null);
  });
}

categoryChips.forEach(chip => {
  chip.addEventListener("click", () => {
    categoryChips.forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    currentCategory = chip.dataset.category || "ALL";
    applyCategoryFilter();
  });
});

importButton.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(reportInputEl.value);
    if (!Array.isArray(parsed)) {
      throw new Error("Top-level value must be an array.");
    }
    allLiveReports = parsed;
    ingestReports(parsed);
  } catch (error) {
    importFeedbackEl.textContent = error.message;
  }
});

// Auto-refresh news feeds every 5 minutes
setInterval(() => {
  loadLiveNews();
}, 5 * 60 * 1000);

reportInputEl.value = "[]";
renderReportCard(null);
initializeBaseLayers();
drawScene();
loadCountries();
loadLiveNews();

window.ReportsGlobe = {
  registerLocatorResolver,
  loadLiveNews,
  getReports: () => allLiveReports
};
