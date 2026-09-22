const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const COUNTRY_DATA_PATH = path.join(ROOT_DIR, "data-countries-110m.geojson");
const OUTPUT_PATH = path.join(ROOT_DIR, "mock-reports.json");
const TARGET_COUNT = 1000;
const RNG_SEED = 20260427;
const DEFAULT_EXTRA_WEIGHT = 0.12;

const GLOBAL_CATEGORIES = [
  "AIRSPACE",
  "BORDER",
  "CYBER",
  "ENERGY",
  "GROUND",
  "HUMANITARIAN",
  "LOGISTICS",
  "MARITIME"
];

const GLOBAL_SOURCES = [
  "Synthetic Feed",
  "Mock ISR",
  "Generated Watchdesk",
  "Scenario Builder"
];

const HOTSPOT_PROFILES = {
  Iran: {
    theater: "Middle East escalation",
    weight: 18,
    intensityRange: [82, 100],
    categories: ["AIR DEFENSE", "BALLISTIC", "CYBER", "ENERGY", "GROUND"],
    sources: ["Synthetic ME Watch", "Generated Air Tasking", "Scenario Builder"],
    centers: [
      { name: "Tehran", lat: 35.6892, lon: 51.389, latJitter: 1.8, lonJitter: 2.2 },
      { name: "Isfahan", lat: 32.6539, lon: 51.666, latJitter: 1.5, lonJitter: 1.8 },
      { name: "Bushehr", lat: 28.9234, lon: 50.8203, latJitter: 1.1, lonJitter: 1.5 },
      { name: "Bandar Abbas", lat: 27.1832, lon: 56.2666, latJitter: 1.1, lonJitter: 1.5 },
      { name: "Tabriz", lat: 38.0962, lon: 46.2738, latJitter: 1.4, lonJitter: 1.6 }
    ]
  },
  Israel: {
    theater: "Middle East escalation",
    weight: 16,
    intensityRange: [80, 99],
    categories: ["AIR DEFENSE", "BORDER", "GROUND", "ISR", "ROCKET"],
    sources: ["Synthetic ME Watch", "Generated Air Tasking", "Scenario Builder"],
    centers: [
      { name: "Tel Aviv", lat: 32.0853, lon: 34.7818, latJitter: 0.4, lonJitter: 0.5 },
      { name: "Jerusalem", lat: 31.7683, lon: 35.2137, latJitter: 0.35, lonJitter: 0.4 },
      { name: "Haifa", lat: 32.794, lon: 34.9896, latJitter: 0.35, lonJitter: 0.4 },
      { name: "Beersheba", lat: 31.252, lon: 34.7915, latJitter: 0.5, lonJitter: 0.5 }
    ]
  },
  Palestine: {
    theater: "Middle East escalation",
    weight: 10,
    intensityRange: [78, 98],
    categories: ["BORDER", "GROUND", "HUMANITARIAN", "ISR", "ROCKET"],
    sources: ["Synthetic ME Watch", "Generated Relief Desk", "Scenario Builder"],
    centers: [
      { name: "Gaza", lat: 31.5017, lon: 34.4668, latJitter: 0.22, lonJitter: 0.25 },
      { name: "Khan Younis", lat: 31.346, lon: 34.3036, latJitter: 0.18, lonJitter: 0.22 },
      { name: "Ramallah", lat: 31.9038, lon: 35.2034, latJitter: 0.2, lonJitter: 0.22 }
    ]
  },
  Lebanon: {
    theater: "Middle East escalation",
    weight: 5,
    intensityRange: [68, 92],
    categories: ["AIRSPACE", "BORDER", "GROUND", "ISR"],
    sources: ["Synthetic ME Watch", "Scenario Builder"],
    centers: [
      { name: "Beirut", lat: 33.8938, lon: 35.5018, latJitter: 0.35, lonJitter: 0.35 },
      { name: "Tyre", lat: 33.2704, lon: 35.2038, latJitter: 0.28, lonJitter: 0.3 },
      { name: "Baalbek", lat: 34.006, lon: 36.2181, latJitter: 0.28, lonJitter: 0.3 }
    ]
  },
  Syria: {
    theater: "Middle East escalation",
    weight: 4,
    intensityRange: [66, 90],
    categories: ["AIR DEFENSE", "BORDER", "GROUND", "LOGISTICS"],
    sources: ["Synthetic ME Watch", "Scenario Builder"],
    centers: [
      { name: "Damascus", lat: 33.5138, lon: 36.2765, latJitter: 0.7, lonJitter: 0.8 },
      { name: "Homs", lat: 34.7308, lon: 36.709, latJitter: 0.6, lonJitter: 0.7 },
      { name: "Latakia", lat: 35.5317, lon: 35.7908, latJitter: 0.55, lonJitter: 0.65 }
    ]
  },
  Iraq: {
    theater: "Middle East escalation",
    weight: 4,
    intensityRange: [60, 84],
    categories: ["AIRSPACE", "BORDER", "ENERGY", "GROUND", "LOGISTICS"],
    sources: ["Synthetic ME Watch", "Scenario Builder"],
    centers: [
      { name: "Baghdad", lat: 33.3152, lon: 44.3661, latJitter: 0.9, lonJitter: 1.1 },
      { name: "Basra", lat: 30.5085, lon: 47.7804, latJitter: 0.8, lonJitter: 0.9 },
      { name: "Mosul", lat: 36.34, lon: 43.1189, latJitter: 0.8, lonJitter: 0.9 }
    ]
  },
  Jordan: {
    theater: "Middle East escalation",
    weight: 3,
    intensityRange: [52, 76],
    categories: ["AIRSPACE", "BORDER", "LOGISTICS", "HUMANITARIAN"],
    sources: ["Synthetic ME Watch", "Generated Relief Desk"],
    centers: [
      { name: "Amman", lat: 31.9539, lon: 35.9106, latJitter: 0.45, lonJitter: 0.5 },
      { name: "Zarqa", lat: 32.0608, lon: 36.0942, latJitter: 0.35, lonJitter: 0.4 }
    ]
  },
  Egypt: {
    theater: "Middle East support corridor",
    weight: 1,
    intensityRange: [35, 58],
    categories: ["BORDER", "HUMANITARIAN", "LOGISTICS", "MARITIME"],
    sources: ["Generated Relief Desk", "Scenario Builder"],
    centers: [
      { name: "Cairo", lat: 30.0444, lon: 31.2357, latJitter: 0.7, lonJitter: 0.8 },
      { name: "El Arish", lat: 31.1313, lon: 33.7984, latJitter: 0.4, lonJitter: 0.45 }
    ]
  },
  Turkey: {
    theater: "Regional spillover",
    weight: 2,
    intensityRange: [40, 68],
    categories: ["AIRSPACE", "BORDER", "GROUND", "LOGISTICS"],
    sources: ["Synthetic ME Watch", "Scenario Builder"],
    centers: [
      { name: "Ankara", lat: 39.9334, lon: 32.8597, latJitter: 0.9, lonJitter: 1.1 },
      { name: "Gaziantep", lat: 37.0662, lon: 37.3833, latJitter: 0.55, lonJitter: 0.65 },
      { name: "Hatay", lat: 36.2021, lon: 36.16, latJitter: 0.4, lonJitter: 0.45 }
    ]
  },
  "Saudi Arabia": {
    theater: "Regional spillover",
    weight: 1,
    intensityRange: [32, 54],
    categories: ["AIRSPACE", "ENERGY", "LOGISTICS", "MARITIME"],
    sources: ["Synthetic ME Watch", "Scenario Builder"],
    centers: [
      { name: "Riyadh", lat: 24.7136, lon: 46.6753, latJitter: 1.1, lonJitter: 1.2 },
      { name: "Dammam", lat: 26.4207, lon: 50.0888, latJitter: 0.65, lonJitter: 0.75 }
    ]
  },
  "United Arab Emirates": {
    theater: "Regional spillover",
    weight: 1,
    intensityRange: [30, 50],
    categories: ["AIRSPACE", "ENERGY", "MARITIME"],
    sources: ["Synthetic ME Watch", "Scenario Builder"],
    centers: [
      { name: "Abu Dhabi", lat: 24.4539, lon: 54.3773, latJitter: 0.25, lonJitter: 0.25 },
      { name: "Dubai", lat: 25.2048, lon: 55.2708, latJitter: 0.2, lonJitter: 0.22 }
    ]
  },
  Qatar: {
    theater: "Regional spillover",
    weight: 0.8,
    intensityRange: [28, 48],
    categories: ["AIRSPACE", "ENERGY", "MARITIME"],
    sources: ["Synthetic ME Watch", "Scenario Builder"],
    centers: [
      { name: "Doha", lat: 25.2854, lon: 51.531, latJitter: 0.2, lonJitter: 0.2 }
    ]
  },
  Kuwait: {
    theater: "Regional spillover",
    weight: 0.8,
    intensityRange: [28, 48],
    categories: ["AIRSPACE", "ENERGY", "LOGISTICS"],
    sources: ["Synthetic ME Watch", "Scenario Builder"],
    centers: [
      { name: "Kuwait City", lat: 29.3759, lon: 47.9774, latJitter: 0.22, lonJitter: 0.25 }
    ]
  },
  Bahrain: {
    theater: "Regional spillover",
    weight: 0.4,
    intensityRange: [24, 44],
    categories: ["AIRSPACE", "MARITIME"],
    sources: ["Synthetic ME Watch", "Scenario Builder"],
    centers: [
      { name: "Manama", lat: 26.2235, lon: 50.5876, latJitter: 0.1, lonJitter: 0.1 }
    ]
  },
  Oman: {
    theater: "Regional spillover",
    weight: 0.6,
    intensityRange: [24, 45],
    categories: ["AIRSPACE", "LOGISTICS", "MARITIME"],
    sources: ["Synthetic ME Watch", "Scenario Builder"],
    centers: [
      { name: "Muscat", lat: 23.588, lon: 58.3829, latJitter: 0.35, lonJitter: 0.4 }
    ]
  },
  Cyprus: {
    theater: "Regional support node",
    weight: 0.8,
    intensityRange: [30, 52],
    categories: ["AIRSPACE", "MARITIME", "LOGISTICS"],
    sources: ["Synthetic ME Watch", "Scenario Builder"],
    centers: [
      { name: "Nicosia", lat: 35.1856, lon: 33.3823, latJitter: 0.18, lonJitter: 0.2 }
    ]
  },
  Russia: {
    theater: "Russia-Ukraine war",
    weight: 18,
    intensityRange: [78, 100],
    categories: ["AIRSPACE", "DRONE", "GROUND", "LOGISTICS", "MISSILE"],
    sources: ["Synthetic Eastern Watch", "Generated Air Tasking", "Scenario Builder"],
    centers: [
      { name: "Belgorod", lat: 50.5954, lon: 36.5879, latJitter: 0.6, lonJitter: 0.7 },
      { name: "Rostov-on-Don", lat: 47.2357, lon: 39.7015, latJitter: 0.7, lonJitter: 0.8 },
      { name: "Kursk", lat: 51.7304, lon: 36.1939, latJitter: 0.6, lonJitter: 0.7 },
      { name: "Krasnodar", lat: 45.0355, lon: 38.9753, latJitter: 0.75, lonJitter: 0.85 },
      { name: "Voronezh", lat: 51.6755, lon: 39.2089, latJitter: 0.7, lonJitter: 0.8 }
    ]
  },
  Ukraine: {
    theater: "Russia-Ukraine war",
    weight: 18,
    intensityRange: [80, 100],
    categories: ["AIR DEFENSE", "DRONE", "ENERGY", "GROUND", "HUMANITARIAN"],
    sources: ["Synthetic Eastern Watch", "Generated Relief Desk", "Scenario Builder"],
    centers: [
      { name: "Kyiv", lat: 50.4501, lon: 30.5234, latJitter: 0.7, lonJitter: 0.9 },
      { name: "Kharkiv", lat: 49.9935, lon: 36.2304, latJitter: 0.6, lonJitter: 0.7 },
      { name: "Odesa", lat: 46.4825, lon: 30.7233, latJitter: 0.55, lonJitter: 0.65 },
      { name: "Dnipro", lat: 48.4647, lon: 35.0462, latJitter: 0.55, lonJitter: 0.65 },
      { name: "Zaporizhzhia", lat: 47.8388, lon: 35.1396, latJitter: 0.55, lonJitter: 0.65 }
    ]
  },
  Belarus: {
    theater: "Eastern Europe pressure belt",
    weight: 3,
    intensityRange: [48, 72],
    categories: ["AIRSPACE", "BORDER", "GROUND", "LOGISTICS"],
    sources: ["Synthetic Eastern Watch", "Scenario Builder"],
    centers: [
      { name: "Minsk", lat: 53.9006, lon: 27.559, latJitter: 0.55, lonJitter: 0.65 },
      { name: "Brest", lat: 52.0976, lon: 23.7341, latJitter: 0.45, lonJitter: 0.55 }
    ]
  },
  Poland: {
    theater: "Eastern Europe support corridor",
    weight: 3,
    intensityRange: [40, 62],
    categories: ["AIRSPACE", "HUMANITARIAN", "LOGISTICS", "RAIL"],
    sources: ["Synthetic Eastern Watch", "Generated Relief Desk", "Scenario Builder"],
    centers: [
      { name: "Warsaw", lat: 52.2297, lon: 21.0122, latJitter: 0.7, lonJitter: 0.8 },
      { name: "Rzeszow", lat: 50.0412, lon: 21.9991, latJitter: 0.45, lonJitter: 0.55 },
      { name: "Lublin", lat: 51.2465, lon: 22.5684, latJitter: 0.45, lonJitter: 0.5 }
    ]
  },
  Romania: {
    theater: "Eastern Europe support corridor",
    weight: 2,
    intensityRange: [38, 58],
    categories: ["AIRSPACE", "LOGISTICS", "MARITIME", "RAIL"],
    sources: ["Synthetic Eastern Watch", "Scenario Builder"],
    centers: [
      { name: "Bucharest", lat: 44.4268, lon: 26.1025, latJitter: 0.6, lonJitter: 0.7 },
      { name: "Constanta", lat: 44.1598, lon: 28.6348, latJitter: 0.4, lonJitter: 0.45 }
    ]
  },
  Moldova: {
    theater: "Eastern Europe pressure belt",
    weight: 2,
    intensityRange: [42, 64],
    categories: ["AIRSPACE", "BORDER", "LOGISTICS", "HUMANITARIAN"],
    sources: ["Synthetic Eastern Watch", "Generated Relief Desk", "Scenario Builder"],
    centers: [
      { name: "Chisinau", lat: 47.0105, lon: 28.8638, latJitter: 0.25, lonJitter: 0.3 }
    ]
  },
  Finland: {
    theater: "Northern flank",
    weight: 1.5,
    intensityRange: [30, 52],
    categories: ["AIRSPACE", "BORDER", "GROUND"],
    sources: ["Synthetic Eastern Watch", "Scenario Builder"],
    centers: [
      { name: "Helsinki", lat: 60.1699, lon: 24.9384, latJitter: 0.45, lonJitter: 0.5 },
      { name: "Lappeenranta", lat: 61.0587, lon: 28.1887, latJitter: 0.35, lonJitter: 0.4 }
    ]
  },
  Lithuania: {
    theater: "Baltic flank",
    weight: 1.5,
    intensityRange: [36, 56],
    categories: ["AIRSPACE", "BORDER", "LOGISTICS"],
    sources: ["Synthetic Eastern Watch", "Scenario Builder"],
    centers: [
      { name: "Vilnius", lat: 54.6872, lon: 25.2797, latJitter: 0.22, lonJitter: 0.25 }
    ]
  },
  Latvia: {
    theater: "Baltic flank",
    weight: 1.5,
    intensityRange: [36, 56],
    categories: ["AIRSPACE", "BORDER", "LOGISTICS"],
    sources: ["Synthetic Eastern Watch", "Scenario Builder"],
    centers: [
      { name: "Riga", lat: 56.9496, lon: 24.1052, latJitter: 0.22, lonJitter: 0.25 }
    ]
  },
  Estonia: {
    theater: "Baltic flank",
    weight: 1.5,
    intensityRange: [36, 56],
    categories: ["AIRSPACE", "BORDER", "CYBER"],
    sources: ["Synthetic Eastern Watch", "Scenario Builder"],
    centers: [
      { name: "Tallinn", lat: 59.437, lon: 24.7536, latJitter: 0.2, lonJitter: 0.22 }
    ]
  },
  Georgia: {
    theater: "Black Sea pressure belt",
    weight: 1.5,
    intensityRange: [34, 54],
    categories: ["AIRSPACE", "BORDER", "LOGISTICS"],
    sources: ["Synthetic Eastern Watch", "Scenario Builder"],
    centers: [
      { name: "Tbilisi", lat: 41.7151, lon: 44.8271, latJitter: 0.35, lonJitter: 0.45 }
    ]
  },
  Armenia: {
    theater: "Regional spillover",
    weight: 1.2,
    intensityRange: [30, 50],
    categories: ["AIRSPACE", "BORDER", "LOGISTICS"],
    sources: ["Synthetic Eastern Watch", "Scenario Builder"],
    centers: [
      { name: "Yerevan", lat: 40.1792, lon: 44.4991, latJitter: 0.25, lonJitter: 0.3 }
    ]
  },
  Azerbaijan: {
    theater: "Regional spillover",
    weight: 1.2,
    intensityRange: [30, 50],
    categories: ["AIRSPACE", "ENERGY", "LOGISTICS"],
    sources: ["Synthetic Eastern Watch", "Scenario Builder"],
    centers: [
      { name: "Baku", lat: 40.4093, lon: 49.8671, latJitter: 0.35, lonJitter: 0.4 }
    ]
  },
  Hungary: {
    theater: "Eastern Europe support corridor",
    weight: 0.8,
    intensityRange: [26, 42],
    categories: ["LOGISTICS", "RAIL", "HUMANITARIAN"],
    sources: ["Synthetic Eastern Watch", "Generated Relief Desk"],
    centers: [
      { name: "Budapest", lat: 47.4979, lon: 19.0402, latJitter: 0.4, lonJitter: 0.45 }
    ]
  },
  Slovakia: {
    theater: "Eastern Europe support corridor",
    weight: 0.8,
    intensityRange: [26, 42],
    categories: ["LOGISTICS", "RAIL", "HUMANITARIAN"],
    sources: ["Synthetic Eastern Watch", "Generated Relief Desk"],
    centers: [
      { name: "Kosice", lat: 48.7164, lon: 21.2611, latJitter: 0.3, lonJitter: 0.35 }
    ]
  }
};

function createRng(seed) {
  let state = seed >>> 0;

  return function next() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const random = createRng(RNG_SEED);

function randomBetween(min, max) {
  return min + (max - min) * random();
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function choose(items) {
  return items[Math.floor(random() * items.length)];
}

function chooseWeighted(items, weightAccessor) {
  const total = items.reduce((sum, item) => sum + weightAccessor(item), 0);
  let threshold = randomBetween(0, total);

  for (const item of items) {
    threshold -= weightAccessor(item);
    if (threshold <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

function normalizeLongitude(value) {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function pointInRing(lon, lat, ring) {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = ((yi > lat) !== (yj > lat))
      && (lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-9) + xi);

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function computeBBox(ring) {
  const box = {
    minLon: Infinity,
    maxLon: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity
  };

  ring.forEach(([lon, lat]) => {
    box.minLon = Math.min(box.minLon, lon);
    box.maxLon = Math.max(box.maxLon, lon);
    box.minLat = Math.min(box.minLat, lat);
    box.maxLat = Math.max(box.maxLat, lat);
  });

  return box;
}

function getPolygonSets(geometry) {
  if (!geometry) {
    return [];
  }

  if (geometry.type === "Polygon") {
    return [{
      outer: geometry.coordinates[0],
      holes: geometry.coordinates.slice(1)
    }];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((polygon) => ({
      outer: polygon[0],
      holes: polygon.slice(1)
    }));
  }

  return [];
}

function prepareCountry(feature) {
  const polygons = getPolygonSets(feature.geometry)
    .filter((polygon) => Array.isArray(polygon.outer) && polygon.outer.length >= 4)
    .map((polygon) => {
      const bbox = computeBBox(polygon.outer);
      const width = Math.max(0.01, bbox.maxLon - bbox.minLon);
      const height = Math.max(0.01, bbox.maxLat - bbox.minLat);

      return {
        ...polygon,
        bbox,
        weight: width * height
      };
    });

  const featureBox = polygons.reduce((box, polygon) => {
    box.minLon = Math.min(box.minLon, polygon.bbox.minLon);
    box.maxLon = Math.max(box.maxLon, polygon.bbox.maxLon);
    box.minLat = Math.min(box.minLat, polygon.bbox.minLat);
    box.maxLat = Math.max(box.maxLat, polygon.bbox.maxLat);
    return box;
  }, {
    minLon: Infinity,
    maxLon: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity
  });

  const center = Number.isFinite(featureBox.minLon)
    ? {
        lon: (featureBox.minLon + featureBox.maxLon) / 2,
        lat: (featureBox.minLat + featureBox.maxLat) / 2
      }
    : { lon: 0, lat: 0 };

  return {
    name: feature.properties.name || feature.properties.admin || "Unknown",
    region: feature.properties.subregion || feature.properties.region_wb || "",
    continent: feature.properties.continent || "",
    polygons,
    center
  };
}

function pointInCountry(country, lon, lat) {
  return country.polygons.some((polygon) => {
    if (!pointInRing(lon, lat, polygon.outer)) {
      return false;
    }

    return !polygon.holes.some((hole) => pointInRing(lon, lat, hole));
  });
}

function samplePointInCountry(country) {
  if (!country.polygons.length) {
    return country.center;
  }

  for (let attempt = 0; attempt < 400; attempt += 1) {
    const polygon = chooseWeighted(country.polygons, (entry) => entry.weight);
    const lon = randomBetween(polygon.bbox.minLon, polygon.bbox.maxLon);
    const lat = randomBetween(polygon.bbox.minLat, polygon.bbox.maxLat);

    if (pointInCountry(country, lon, lat)) {
      return { lon, lat };
    }
  }

  return country.center;
}

function sampleHotspotPoint(country, profile) {
  if (!profile || !Array.isArray(profile.centers) || !profile.centers.length) {
    return samplePointInCountry(country);
  }

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const center = choose(profile.centers);
    const lon = normalizeLongitude(center.lon + randomBetween(-center.lonJitter, center.lonJitter));
    const lat = clamp(center.lat + randomBetween(-center.latJitter, center.latJitter), -89.5, 89.5);

    if (pointInCountry(country, lon, lat)) {
      return {
        lon,
        lat,
        areaName: center.name
      };
    }
  }

  return samplePointInCountry(country);
}

function toIntensityLevel(score) {
  if (score >= 85) {
    return "critical";
  }
  if (score >= 65) {
    return "high";
  }
  if (score >= 40) {
    return "elevated";
  }
  return "low";
}

function makeTimestamp(index) {
  const base = Date.UTC(2026, 3, 27, 18, 0, 0);
  const offsetHours = index * 2 + randomInt(0, 8);
  return new Date(base - offsetHours * 60 * 60 * 1000).toISOString();
}

function makeGlobalTitle(category, country) {
  const prefixes = [
    "Synthetic watchpoint",
    "Mock status report",
    "Generated monitoring point",
    "Scenario overview"
  ];
  return `${choose(prefixes)}: ${category.toLowerCase()} posture in ${country}`;
}

function makeHotspotTitle(profile, category, areaName) {
  const prefix = profile.theater === "Russia-Ukraine war"
    ? choose(["Simulated frontline pulse", "Synthetic strike watch", "Generated pressure point"])
    : choose(["Synthetic escalation node", "Generated alert cluster", "Simulated pressure point"]);
  const suffix = areaName ? ` near ${areaName}` : "";
  return `${prefix}: ${category.toLowerCase()} activity${suffix}`;
}

function makeGlobalSummary(country, category) {
  return `Mock data for globe visualization representing ${category.toLowerCase()} monitoring in ${country}. Generated to keep every country visible while the main hotspots remain concentrated elsewhere.`;
}

function makeHotspotSummary(profile, country, areaName, category) {
  const area = areaName ? ` around ${areaName}` : ` in ${country}`;
  return `Mock data for globe visualization representing ${profile.theater.toLowerCase()} pressure${area}. This synthetic point emphasizes ${category.toLowerCase()} activity without claiming a specific real-world incident.`;
}

function makeReport(country, index, mode) {
  const profile = HOTSPOT_PROFILES[country.name];
  const point = mode === "hotspot"
    ? sampleHotspotPoint(country, profile)
    : samplePointInCountry(country);
  const intensityRange = profile && mode === "hotspot"
    ? profile.intensityRange
    : [18, 55];
  const intensityScore = randomInt(intensityRange[0], intensityRange[1]);
  const category = choose(profile && mode === "hotspot" ? profile.categories : GLOBAL_CATEGORIES);
  const source = choose(profile && mode === "hotspot" ? profile.sources : GLOBAL_SOURCES);
  const theater = profile && mode === "hotspot"
    ? profile.theater
    : "Global baseline coverage";

  return {
    id: `mock-${String(index + 1).padStart(4, "0")}`,
    title: profile && mode === "hotspot"
      ? makeHotspotTitle(profile, category, point.areaName)
      : makeGlobalTitle(category, country.name),
    summary: profile && mode === "hotspot"
      ? makeHotspotSummary(profile, country.name, point.areaName, category)
      : makeGlobalSummary(country.name, category),
    lat: Number(point.lat.toFixed(4)),
    lon: Number(point.lon.toFixed(4)),
    category,
    country: country.name,
    region: [country.continent, country.region].filter(Boolean).join(" · "),
    theater,
    intensityScore,
    intensityLevel: toIntensityLevel(intensityScore),
    timestamp: makeTimestamp(index),
    source
  };
}

function main() {
  const raw = JSON.parse(fs.readFileSync(COUNTRY_DATA_PATH, "utf8"));
  const countries = raw.features.map(prepareCountry);
  const reports = [];

  countries.forEach((country) => {
    reports.push(makeReport(country, reports.length, "baseline"));
  });

  while (reports.length < TARGET_COUNT) {
    const country = chooseWeighted(countries, (entry) => {
      const profile = HOTSPOT_PROFILES[entry.name];
      return DEFAULT_EXTRA_WEIGHT + (profile ? profile.weight : 0);
    });

    reports.push(makeReport(
      country,
      reports.length,
      HOTSPOT_PROFILES[country.name] ? "hotspot" : "baseline"
    ));
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(reports, null, 2)}\n`);
  console.log(`Wrote ${reports.length} mock reports to ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
}

main();
