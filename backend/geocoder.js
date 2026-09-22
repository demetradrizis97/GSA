// Geographic Gazetteer & News Categorization Engine
// Provides country, city, and demonym coordinates with zero external dependencies.

const COUNTRIES = {
  // Asia
  "afghanistan": { name: "Afghanistan", lat: 33.9391, lon: 67.7100, region: "Central Asia", continent: "Asia" },
  "armenia": { name: "Armenia", lat: 40.0691, lon: 45.0382, region: "Western Asia", continent: "Asia" },
  "azerbaijan": { name: "Azerbaijan", lat: 40.1431, lon: 47.5769, region: "Western Asia", continent: "Asia" },
  "bangladesh": { name: "Bangladesh", lat: 23.6850, lon: 90.3563, region: "South Asia", continent: "Asia" },
  "china": { name: "China", lat: 35.8617, lon: 104.1954, region: "East Asia", continent: "Asia" },
  "georgia": { name: "Georgia", lat: 42.3154, lon: 43.3569, region: "Western Asia", continent: "Asia" },
  "india": { name: "India", lat: 20.5937, lon: 78.9629, region: "South Asia", continent: "Asia" },
  "indonesia": { name: "Indonesia", lat: -0.7893, lon: 113.9213, region: "Southeast Asia", continent: "Asia" },
  "iran": { name: "Iran", lat: 32.4279, lon: 53.6880, region: "Middle East", continent: "Asia" },
  "iraq": { name: "Iraq", lat: 33.2232, lon: 43.6793, region: "Middle East", continent: "Asia" },
  "israel": { name: "Israel", lat: 31.0461, lon: 34.8516, region: "Middle East", continent: "Asia" },
  "japan": { name: "Japan", lat: 36.2048, lon: 138.2529, region: "East Asia", continent: "Asia" },
  "jordan": { name: "Jordan", lat: 30.5852, lon: 36.2384, region: "Middle East", continent: "Asia" },
  "kazakhstan": { name: "Kazakhstan", lat: 48.0196, lon: 66.9237, region: "Central Asia", continent: "Asia" },
  "kuwait": { name: "Kuwait", lat: 29.3117, lon: 47.4818, region: "Middle East", continent: "Asia" },
  "lebanon": { name: "Lebanon", lat: 33.8547, lon: 35.8623, region: "Middle East", continent: "Asia" },
  "malaysia": { name: "Malaysia", lat: 4.2105, lon: 101.9758, region: "Southeast Asia", continent: "Asia" },
  "myanmar": { name: "Myanmar", lat: 21.9162, lon: 95.9560, region: "Southeast Asia", continent: "Asia" },
  "north korea": { name: "North Korea", lat: 40.3399, lon: 127.5101, region: "East Asia", continent: "Asia" },
  "pakistan": { name: "Pakistan", lat: 30.3753, lon: 69.3451, region: "South Asia", continent: "Asia" },
  "palestine": { name: "Palestine", lat: 31.9522, lon: 35.2332, region: "Middle East", continent: "Asia" },
  "philippines": { name: "Philippines", lat: 12.8797, lon: 121.7740, region: "Southeast Asia", continent: "Asia" },
  "qatar": { name: "Qatar", lat: 25.3548, lon: 51.1839, region: "Middle East", continent: "Asia" },
  "saudi arabia": { name: "Saudi Arabia", lat: 23.8859, lon: 45.0792, region: "Middle East", continent: "Asia" },
  "singapore": { name: "Singapore", lat: 1.3521, lon: 103.8198, region: "Southeast Asia", continent: "Asia" },
  "south korea": { name: "South Korea", lat: 35.9078, lon: 127.7669, region: "East Asia", continent: "Asia" },
  "sri lanka": { name: "Sri Lanka", lat: 7.8731, lon: 80.7718, region: "South Asia", continent: "Asia" },
  "syria": { name: "Syria", lat: 34.8021, lon: 38.9968, region: "Middle East", continent: "Asia" },
  "taiwan": { name: "Taiwan", lat: 23.6978, lon: 120.9605, region: "East Asia", continent: "Asia" },
  "thailand": { name: "Thailand", lat: 15.8700, lon: 100.9925, region: "Southeast Asia", continent: "Asia" },
  "turkey": { name: "Turkey", lat: 38.9637, lon: 35.2433, region: "Middle East / Europe", continent: "Asia" },
  "türkiye": { name: "Turkey", lat: 38.9637, lon: 35.2433, region: "Middle East / Europe", continent: "Asia" },
  "united arab emirates": { name: "United Arab Emirates", lat: 23.4241, lon: 53.8478, region: "Middle East", continent: "Asia" },
  "uae": { name: "United Arab Emirates", lat: 23.4241, lon: 53.8478, region: "Middle East", continent: "Asia" },
  "vietnam": { name: "Vietnam", lat: 14.0583, lon: 108.2772, region: "Southeast Asia", continent: "Asia" },
  "yemen": { name: "Yemen", lat: 15.5527, lon: 48.5164, region: "Middle East", continent: "Asia" },

  // Europe
  "albania": { name: "Albania", lat: 41.1533, lon: 20.1683, region: "Southern Europe", continent: "Europe" },
  "austria": { name: "Austria", lat: 47.5162, lon: 14.5501, region: "Western Europe", continent: "Europe" },
  "belarus": { name: "Belarus", lat: 53.7098, lon: 27.9534, region: "Eastern Europe", continent: "Europe" },
  "belgium": { name: "Belgium", lat: 50.5039, lon: 4.4699, region: "Western Europe", continent: "Europe" },
  "bosnia": { name: "Bosnia and Herzegovina", lat: 43.9159, lon: 17.6791, region: "Southern Europe", continent: "Europe" },
  "bulgaria": { name: "Bulgaria", lat: 42.7339, lon: 25.4858, region: "Eastern Europe", continent: "Europe" },
  "croatia": { name: "Croatia", lat: 45.1000, lon: 15.2000, region: "Southern Europe", continent: "Europe" },
  "cyprus": { name: "Cyprus", lat: 35.1264, lon: 33.4299, region: "Southern Europe", continent: "Europe" },
  "czech republic": { name: "Czech Republic", lat: 49.8175, lon: 15.4730, region: "Central Europe", continent: "Europe" },
  "czechia": { name: "Czech Republic", lat: 49.8175, lon: 15.4730, region: "Central Europe", continent: "Europe" },
  "denmark": { name: "Denmark", lat: 56.2639, lon: 9.5018, region: "Northern Europe", continent: "Europe" },
  "estonia": { name: "Estonia", lat: 58.5953, lon: 25.0136, region: "Northern Europe", continent: "Europe" },
  "finland": { name: "Finland", lat: 61.9241, lon: 25.7482, region: "Northern Europe", continent: "Europe" },
  "france": { name: "France", lat: 46.2276, lon: 2.2137, region: "Western Europe", continent: "Europe" },
  "germany": { name: "Germany", lat: 51.1657, lon: 10.4515, region: "Western Europe", continent: "Europe" },
  "greece": { name: "Greece", lat: 39.0742, lon: 21.8243, region: "Southern Europe", continent: "Europe" },
  "hungary": { name: "Hungary", lat: 47.1625, lon: 19.5033, region: "Central Europe", continent: "Europe" },
  "iceland": { name: "Iceland", lat: 64.9631, lon: -19.0208, region: "Northern Europe", continent: "Europe" },
  "ireland": { name: "Ireland", lat: 53.1424, lon: -7.6921, region: "Northern Europe", continent: "Europe" },
  "italy": { name: "Italy", lat: 41.8719, lon: 12.5674, region: "Southern Europe", continent: "Europe" },
  "kosovo": { name: "Kosovo", lat: 42.6026, lon: 20.9030, region: "Southern Europe", continent: "Europe" },
  "latvia": { name: "Latvia", lat: 56.8796, lon: 24.6032, region: "Northern Europe", continent: "Europe" },
  "lithuania": { name: "Lithuania", lat: 55.1694, lon: 23.8813, region: "Northern Europe", continent: "Europe" },
  "moldova": { name: "Moldova", lat: 47.4116, lon: 28.3699, region: "Eastern Europe", continent: "Europe" },
  "montenegro": { name: "Montenegro", lat: 42.7087, lon: 19.3744, region: "Southern Europe", continent: "Europe" },
  "netherlands": { name: "Netherlands", lat: 52.1326, lon: 5.2913, region: "Western Europe", continent: "Europe" },
  "norway": { name: "Norway", lat: 60.4720, lon: 8.4689, region: "Northern Europe", continent: "Europe" },
  "poland": { name: "Poland", lat: 51.9194, lon: 19.1451, region: "Central Europe", continent: "Europe" },
  "portugal": { name: "Portugal", lat: 39.3999, lon: -8.2245, region: "Southern Europe", continent: "Europe" },
  "romania": { name: "Romania", lat: 45.9432, lon: 24.9668, region: "Eastern Europe", continent: "Europe" },
  "russia": { name: "Russia", lat: 61.5240, lon: 105.3188, region: "Eastern Europe / Northern Asia", continent: "Europe" },
  "serbia": { name: "Serbia", lat: 44.0165, lon: 21.0059, region: "Southern Europe", continent: "Europe" },
  "slovakia": { name: "Slovakia", lat: 48.6690, lon: 19.6990, region: "Central Europe", continent: "Europe" },
  "spain": { name: "Spain", lat: 40.4637, lon: -3.7492, region: "Southern Europe", continent: "Europe" },
  "sweden": { name: "Sweden", lat: 60.1282, lon: 18.6435, region: "Northern Europe", continent: "Europe" },
  "switzerland": { name: "Switzerland", lat: 46.8182, lon: 8.2275, region: "Western Europe", continent: "Europe" },
  "ukraine": { name: "Ukraine", lat: 48.3794, lon: 31.1656, region: "Eastern Europe", continent: "Europe" },
  "united kingdom": { name: "United Kingdom", lat: 55.3781, lon: -3.4360, region: "Northern Europe", continent: "Europe" },
  "uk": { name: "United Kingdom", lat: 55.3781, lon: -3.4360, region: "Northern Europe", continent: "Europe" },
  "britain": { name: "United Kingdom", lat: 55.3781, lon: -3.4360, region: "Northern Europe", continent: "Europe" },

  // Americas
  "united states": { name: "United States", lat: 37.0902, lon: -95.7129, region: "North America", continent: "Americas" },
  "usa": { name: "United States", lat: 37.0902, lon: -95.7129, region: "North America", continent: "Americas" },
  "us": { name: "United States", lat: 37.0902, lon: -95.7129, region: "North America", continent: "Americas" },
  "canada": { name: "Canada", lat: 56.1304, lon: -106.3468, region: "North America", continent: "Americas" },
  "mexico": { name: "Mexico", lat: 23.6345, lon: -102.5528, region: "North America", continent: "Americas" },
  "argentina": { name: "Argentina", lat: -38.4161, lon: -63.6167, region: "South America", continent: "Americas" },
  "brazil": { name: "Brazil", lat: -14.2350, lon: -51.9253, region: "South America", continent: "Americas" },
  "chile": { name: "Chile", lat: -35.6751, lon: -71.5430, region: "South America", continent: "Americas" },
  "colombia": { name: "Colombia", lat: 4.5709, lon: -74.2973, region: "South America", continent: "Americas" },
  "cuba": { name: "Cuba", lat: 21.5218, lon: -77.7812, region: "Caribbean", continent: "Americas" },
  "ecuador": { name: "Ecuador", lat: -1.8312, lon: -78.1834, region: "South America", continent: "Americas" },
  "haiti": { name: "Haiti", lat: 18.9712, lon: -72.2852, region: "Caribbean", continent: "Americas" },
  "panama": { name: "Panama", lat: 8.5379, lon: -80.7821, region: "Central America", continent: "Americas" },
  "peru": { name: "Peru", lat: -9.1899, lon: -75.0152, region: "South America", continent: "Americas" },
  "venezuela": { name: "Venezuela", lat: 6.4238, lon: -66.5897, region: "South America", continent: "Americas" },

  // Africa
  "algeria": { name: "Algeria", lat: 28.0339, lon: 1.6596, region: "Northern Africa", continent: "Africa" },
  "dr congo": { name: "DR Congo", lat: -4.0383, lon: 21.7587, region: "Central Africa", continent: "Africa" },
  "congo": { name: "DR Congo", lat: -4.0383, lon: 21.7587, region: "Central Africa", continent: "Africa" },
  "egypt": { name: "Egypt", lat: 26.8206, lon: 30.8025, region: "Northern Africa", continent: "Africa" },
  "ethiopia": { name: "Ethiopia", lat: 9.1450, lon: 40.4897, region: "Eastern Africa", continent: "Africa" },
  "ghana": { name: "Ghana", lat: 7.9465, lon: -1.0232, region: "Western Africa", continent: "Africa" },
  "kenya": { name: "Kenya", lat: -0.0236, lon: 37.9062, region: "Eastern Africa", continent: "Africa" },
  "libya": { name: "Libya", lat: 26.3351, lon: 17.2283, region: "Northern Africa", continent: "Africa" },
  "mali": { name: "Mali", lat: 17.5707, lon: -3.9962, region: "Western Africa", continent: "Africa" },
  "morocco": { name: "Morocco", lat: 31.7917, lon: -7.0926, region: "Northern Africa", continent: "Africa" },
  "niger": { name: "Niger", lat: 17.6078, lon: 8.0817, region: "Western Africa", continent: "Africa" },
  "nigeria": { name: "Nigeria", lat: 9.0820, lon: 8.6753, region: "Western Africa", continent: "Africa" },
  "rwanda": { name: "Rwanda", lat: -1.9403, lon: 29.8739, region: "Eastern Africa", continent: "Africa" },
  "somalia": { name: "Somalia", lat: 5.1521, lon: 46.1996, region: "Eastern Africa", continent: "Africa" },
  "south africa": { name: "South Africa", lat: -30.5595, lon: 22.9375, region: "Southern Africa", continent: "Africa" },
  "sudan": { name: "Sudan", lat: 12.8628, lon: 30.2176, region: "Northern Africa", continent: "Africa" },
  "tunisia": { name: "Tunisia", lat: 33.8869, lon: 9.5375, region: "Northern Africa", continent: "Africa" },
  "uganda": { name: "Uganda", lat: 1.3733, lon: 32.2903, region: "Eastern Africa", continent: "Africa" },

  // Oceania
  "australia": { name: "Australia", lat: -25.2744, lon: 133.7751, region: "Australasia", continent: "Oceania" },
  "new zealand": { name: "New Zealand", lat: -40.9006, lon: 174.8860, region: "Polynesia", continent: "Oceania" }
};

// Cities & Capitals (exact lat/lon)
const CITIES = {
  "tokyo": { country: "Japan", lat: 35.6762, lon: 139.6503, region: "East Asia" },
  "beijing": { country: "China", lat: 39.9042, lon: 116.4074, region: "East Asia" },
  "shanghai": { country: "China", lat: 31.2304, lon: 121.4737, region: "East Asia" },
  "hong kong": { country: "China", lat: 22.3193, lon: 114.1694, region: "East Asia" },
  "taipei": { country: "Taiwan", lat: 25.0330, lon: 121.5654, region: "East Asia" },
  "seoul": { country: "South Korea", lat: 37.5665, lon: 126.9780, region: "East Asia" },
  "pyongyang": { country: "North Korea", lat: 39.0392, lon: 125.7625, region: "East Asia" },
  "kyiv": { country: "Ukraine", lat: 50.4501, lon: 30.5234, region: "Eastern Europe" },
  "kiev": { country: "Ukraine", lat: 50.4501, lon: 30.5234, region: "Eastern Europe" },
  "kharkiv": { country: "Ukraine", lat: 49.9935, lon: 36.2304, region: "Eastern Europe" },
  "odesa": { country: "Ukraine", lat: 46.4825, lon: 30.7233, region: "Eastern Europe" },
  "moscow": { country: "Russia", lat: 55.7558, lon: 37.6173, region: "Eastern Europe" },
  "st petersburg": { country: "Russia", lat: 59.9343, lon: 30.3351, region: "Eastern Europe" },
  "tehran": { country: "Iran", lat: 35.6892, lon: 51.3890, region: "Middle East" },
  "jerusalem": { country: "Israel", lat: 31.7683, lon: 35.2137, region: "Middle East" },
  "tel aviv": { country: "Israel", lat: 32.0853, lon: 34.7818, region: "Middle East" },
  "gaza": { country: "Palestine", lat: 31.5017, lon: 34.4668, region: "Middle East" },
  "ramallah": { country: "Palestine", lat: 31.9038, lon: 35.2034, region: "Middle East" },
  "beirut": { country: "Lebanon", lat: 33.8938, lon: 35.5018, region: "Middle East" },
  "damascus": { country: "Syria", lat: 33.5138, lon: 36.2765, region: "Middle East" },
  "baghdad": { country: "Iraq", lat: 33.3152, lon: 44.3661, region: "Middle East" },
  "riyadh": { country: "Saudi Arabia", lat: 24.7136, lon: 46.6753, region: "Middle East" },
  "doha": { country: "Qatar", lat: 25.2854, lon: 51.5310, region: "Middle East" },
  "dubai": { country: "United Arab Emirates", lat: 25.2048, lon: 55.2708, region: "Middle East" },
  "abu dhabi": { country: "United Arab Emirates", lat: 24.4539, lon: 54.3773, region: "Middle East" },
  "sanaa": { country: "Yemen", lat: 15.3694, lon: 44.1910, region: "Middle East" },
  "cairo": { country: "Egypt", lat: 30.0444, lon: 31.2357, region: "Northern Africa" },
  "khartoum": { country: "Sudan", lat: 15.5007, lon: 32.5599, region: "Northern Africa" },
  "nairobi": { country: "Kenya", lat: -1.2921, lon: 36.8219, region: "Eastern Africa" },
  "addis ababa": { country: "Ethiopia", lat: 9.0300, lon: 38.7400, region: "Eastern Africa" },
  "london": { country: "United Kingdom", lat: 51.5074, lon: -0.1278, region: "Northern Europe" },
  "paris": { country: "France", lat: 48.8566, lon: 2.3522, region: "Western Europe" },
  "berlin": { country: "Germany", lat: 52.5200, lon: 13.4050, region: "Western Europe" },
  "brussels": { country: "Belgium", lat: 50.8503, lon: 4.3517, region: "Western Europe" },
  "geneva": { country: "Switzerland", lat: 46.2044, lon: 6.1432, region: "Western Europe" },
  "rome": { country: "Italy", lat: 41.9028, lon: 12.4964, region: "Southern Europe" },
  "madrid": { country: "Spain", lat: 40.4168, lon: -3.7038, region: "Southern Europe" },
  "warsaw": { country: "Poland", lat: 52.2297, lon: 21.0122, region: "Central Europe" },
  "washington": { country: "United States", lat: 38.9072, lon: -77.0369, region: "North America" },
  "new york": { country: "United States", lat: 40.7128, lon: -74.0060, region: "North America" },
  "california": { country: "United States", lat: 36.7783, lon: -119.4179, region: "North America" },
  "texas": { country: "United States", lat: 31.9686, lon: -99.9018, region: "North America" },
  "florida": { country: "United States", lat: 27.6648, lon: -81.5158, region: "North America" },
  "ottawa": { country: "Canada", lat: 45.4215, lon: -75.6972, region: "North America" },
  "mexico city": { country: "Mexico", lat: 19.4326, lon: -99.1332, region: "North America" },
  "brasilia": { country: "Brazil", lat: -15.8267, lon: -47.9218, region: "South America" },
  "buenos aires": { country: "Argentina", lat: -34.6037, lon: -58.3816, region: "South America" },
  "bogota": { country: "Colombia", lat: 4.7110, lon: -74.0721, region: "South America" },
  "caracas": { country: "Venezuela", lat: 10.4806, lon: -66.9036, region: "South America" },
  "canberra": { country: "Australia", lat: -35.2809, lon: 149.1300, region: "Australasia" },
  "sydney": { country: "Australia", lat: -33.8688, lon: 151.2093, region: "Australasia" }
};

// Demonyms mapping to country
const DEMONYMS = {
  "ukrainian": "ukraine",
  "russian": "russia",
  "israeli": "israel",
  "palestinian": "palestine",
  "iranian": "iran",
  "iraqi": "iraq",
  "syrian": "syria",
  "yemeni": "yemen",
  "houthi": "yemen",
  "houthis": "yemen",
  "lebanese": "lebanon",
  "hezbollah": "lebanon",
  "chinese": "china",
  "japanese": "japan",
  "korean": "south korea",
  "north korean": "north korea",
  "taiwanese": "taiwan",
  "american": "united states",
  "british": "united kingdom",
  "french": "france",
  "german": "germany",
  "polish": "poland",
  "turkish": "turkey",
  "sudanese": "sudan",
  "somali": "somalia",
  "ethiopian": "ethiopia",
  "indian": "india",
  "pakistani": "pakistan",
  "afghan": "afghanistan",
  "filipino": "philippines"
};

// Intensity & Category heuristics
const CRITICAL_KEYWORDS = [
  "nuclear", "ballistic", "missile strike", "airstrike", "air strike",
  "invasion", "mass casualty", "tsunami", "major earthquake", "catastrophic",
  "offensive", "war declared", "declaration of war", "artillery barrage"
];

const HIGH_KEYWORDS = [
  "strike", "killed", "clashes", "attack", "casualty", "drone", "rocket",
  "military", "explosion", "combat", "offensive", "assassination", "hostage",
  "typhoon", "hurricane", "evacuate", "embargo", "sanctions"
];

const ELEVATED_KEYWORDS = [
  "tension", "warning", "protest", "unrest", "threat", "troops",
  "dispute", "standoff", "summit", "ceasefire", "investigation", "probe",
  "earthquake", "wildfire", "flooding", "cyberattack", "hack"
];

function scoreHeadline(text) {
  const lower = text.toLowerCase();
  for (const word of CRITICAL_KEYWORDS) {
    if (lower.includes(word)) {
      return { score: Math.floor(82 + Math.random() * 16), level: "critical" };
    }
  }
  for (const word of HIGH_KEYWORDS) {
    if (lower.includes(word)) {
      return { score: Math.floor(62 + Math.random() * 18), level: "high" };
    }
  }
  for (const word of ELEVATED_KEYWORDS) {
    if (lower.includes(word)) {
      return { score: Math.floor(40 + Math.random() * 20), level: "elevated" };
    }
  }
  return { score: Math.floor(18 + Math.random() * 20), level: "low" };
}

function categorizeHeadline(text) {
  const lower = text.toLowerCase();
  if (/missile|strike|attack|war|military|troop|soldier|bomb|drone|combat|clash|rocket|houthi|hezbollah/i.test(lower)) {
    return "CONFLICT";
  }
  if (/earthquake|quake|tsunami|typhoon|hurricane|cyclone|volcano|flood|wildfire|storm/i.test(lower)) {
    return "DISASTER";
  }
  if (/cyber|hack|malware|breach|ai|tech|satellite|quantum/i.test(lower)) {
    return "TECH/CYBER";
  }
  if (/climate|emissions|warming|renewable|drought|temperature/i.test(lower)) {
    return "CLIMATE";
  }
  if (/treaty|summit|un|diplomat|minister|talks|accord|ambassador|sanction/i.test(lower)) {
    return "DIPLOMACY";
  }
  if (/market|trade|inflation|oil|economy|tariff|export|bank/i.test(lower)) {
    return "ECONOMY";
  }
  if (/police|arrest|court|protest|trial|investigation/i.test(lower)) {
    return "SECURITY";
  }
  return "WORLD";
}

/**
 * Geolocate a text string (title + summary)
 * Returns { lat, lon, country, region, theater }
 */
function geolocateText(title, summary = "") {
  const text = `${title} ${summary}`.toLowerCase();

  // 1. Check Cities first (specific coordinates)
  for (const [cityName, info] of Object.entries(CITIES)) {
    const regex = new RegExp(`\\b${cityName}\\b`, "i");
    if (regex.test(text)) {
      return {
        lat: info.lat + (Math.random() - 0.5) * 0.1, // tiny jitter so multiple reports in same city don't completely overlap
        lon: info.lon + (Math.random() - 0.5) * 0.1,
        country: info.country,
        region: info.region,
        city: cityName.toUpperCase()
      };
    }
  }

  // 2. Check Demonyms (e.g. Ukrainian, Iranian)
  for (const [demonym, countryKey] of Object.entries(DEMONYMS)) {
    const regex = new RegExp(`\\b${demonym}\\b`, "i");
    if (regex.test(text)) {
      const countryInfo = COUNTRIES[countryKey];
      if (countryInfo) {
        return {
          lat: countryInfo.lat + (Math.random() - 0.5) * 0.5,
          lon: countryInfo.lon + (Math.random() - 0.5) * 0.5,
          country: countryInfo.name,
          region: countryInfo.region
        };
      }
    }
  }

  // 3. Check Countries
  for (const [countryKey, info] of Object.entries(COUNTRIES)) {
    // Escape special chars
    const escaped = countryKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(text)) {
      return {
        lat: info.lat + (Math.random() - 0.5) * 0.5,
        lon: info.lon + (Math.random() - 0.5) * 0.5,
        country: info.name,
        region: info.region
      };
    }
  }

  // 4. Default fallback: International / Global coverage node
  const globalNodes = [
    { country: "Global Affairs", region: "International Desk", lat: 46.2044, lon: 6.1432 }, // Geneva
    { country: "Global Affairs", region: "United Nations HQ", lat: 40.7499, lon: -73.9674 }, // UN HQ NY
    { country: "Global Affairs", region: "European Hub", lat: 50.8503, lon: 4.3517 }, // Brussels
    { country: "Global Affairs", region: "Asia Pacific Desk", lat: 1.3521, lon: 103.8198 }, // Singapore
    { country: "Global Affairs", region: "African Union", lat: 9.0300, lon: 38.7400 } // Addis Ababa
  ];
  const node = globalNodes[Math.floor(Math.random() * globalNodes.length)];
  return {
    lat: node.lat + (Math.random() - 0.5) * 0.2,
    lon: node.lon + (Math.random() - 0.5) * 0.2,
    country: node.country,
    region: node.region
  };
}

module.exports = {
  COUNTRIES,
  CITIES,
  DEMONYMS,
  geolocateText,
  scoreHeadline,
  categorizeHeadline
};
