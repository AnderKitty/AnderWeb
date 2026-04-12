/**
 * Bus Service - GitHub Pages compatible.
 * Fetches bus data using multiple strategies:
 * 1. Backend proxy (if REACT_APP_BACKEND_URL is set)
 * 2. Direct fetch (works on HTTP sites or if API is HTTPS)
 * 3. CORS/HTTPS proxy (for HTTPS sites calling HTTP APIs)
 * 4. localStorage cache (offline fallback)
 */

const BUS_XML_URL = "http://microltda.ddns.net:8705/pub/avl.xml";
const HTTPS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];
const LS_KEY = "micro_rivera_bus_positions";
const LAST_SEEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const LINE_COLORS = {
  "1": "#FF3B30",
  "2": "#007AFF",
  "3": "#34C759",
  "5": "#FF9500",
  "6": "#AF52DE",
  "8": "#FF2D55",
  "9": "#5AC8FA",
  "13": "#FFCC00",
};

// --- XML Parsing ---

function parseXmlToBuses(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const markers = doc.getElementsByTagName("marker");
  const buses = [];

  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    const txt = (tag) => {
      const el = m.getElementsByTagName(tag)[0];
      return el?.textContent?.trim() || "";
    };

    const latStr = txt("lat");
    const lonStr = txt("lon");
    if (!latStr || !lonStr) continue;

    const headingStr = txt("rum");
    const line = txt("lin");

    buses.push({
      lat: parseFloat(latStr),
      lon: parseFloat(lonStr),
      id: txt("id"),
      busNumber: txt("bus"),
      licensePlate: txt("bmt"),
      line,
      routeName: txt("lnm"),
      departureTime: txt("sal"),
      currentStop: txt("p1n"),
      heading: /^\d+$/.test(headingStr) ? parseInt(headingStr, 10) : 0,
      icon: txt("ico"),
      status: txt("est"),
      accessible: txt("bac") === "1",
      color: LINE_COLORS[line] || "#CCFF00",
      isLastSeen: false,
      lastSeenAt: new Date().toISOString(),
    });
  }
  return buses;
}

// --- Fetch strategies ---

async function fetchXmlDirect() {
  const res = await fetch(BUS_XML_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function fetchXmlViaProxy() {
  for (const makeUrl of HTTPS_PROXIES) {
    try {
      const proxyUrl = makeUrl(BUS_XML_URL);
      const res = await fetch(proxyUrl);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes("<marker>") || text.includes("<list>")) return text;
    } catch {
      continue;
    }
  }
  throw new Error("All proxies failed");
}

async function fetchXmlViaBackend() {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  if (!backendUrl) throw new Error("No backend URL");
  const res = await fetch(`${backendUrl}/api/buses`);
  if (!res.ok) throw new Error(`Backend HTTP ${res.status}`);
  const data = await res.json();
  // Backend already returns parsed JSON — return it directly
  return { parsed: true, data };
}

async function fetchBusXml() {
  // Strategy 1: Backend proxy (fastest, most reliable when deployed with backend)
  try {
    const result = await fetchXmlViaBackend();
    if (result.parsed) return result;
  } catch { /* continue */ }

  // Strategy 2: Direct fetch (works on HTTP sites or development)
  try {
    return await fetchXmlDirect();
  } catch { /* continue */ }

  // Strategy 3: HTTPS CORS proxy (for GitHub Pages / HTTPS sites)
  try {
    return await fetchXmlViaProxy();
  } catch { /* continue */ }

  throw new Error("All fetch strategies failed");
}

// --- localStorage persistence ---

function loadSavedPositions() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function savePositions(activeBuses) {
  const saved = loadSavedPositions();
  const now = new Date().toISOString();
  for (const bus of activeBuses) {
    saved[bus.id] = { ...bus, lastSeenAt: now };
  }
  // Prune expired
  const cutoff = Date.now() - LAST_SEEN_TTL_MS;
  for (const id of Object.keys(saved)) {
    if (new Date(saved[id].lastSeenAt).getTime() < cutoff) {
      delete saved[id];
    }
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(saved));
  } catch { /* ignore */ }
  return saved;
}

function getLastSeenBuses(activeIds, saved) {
  const cutoff = Date.now() - LAST_SEEN_TTL_MS;
  const ghosts = [];
  for (const [id, bus] of Object.entries(saved)) {
    if (activeIds.has(id)) continue;
    if (new Date(bus.lastSeenAt).getTime() < cutoff) continue;
    ghosts.push({ ...bus, isLastSeen: true });
  }
  return ghosts;
}

// --- Public API ---

export async function fetchBuses() {
  let activeBuses = [];

  try {
    const result = await fetchBusXml();

    // If backend returned pre-parsed JSON
    if (result && result.parsed) {
      const data = result.data;
      const buses = data.buses || [];
      // Save active ones to localStorage
      const active = buses.filter(b => !b.isLastSeen);
      savePositions(active);
      return data;
    }

    // Otherwise we got raw XML text
    activeBuses = parseXmlToBuses(result);
  } catch (err) {
    console.error("Bus fetch failed, using cache:", err.message);
  }

  // Mark active buses
  for (const bus of activeBuses) {
    bus.isLastSeen = false;
    bus.lastSeenAt = new Date().toISOString();
  }

  // Save & get ghosts
  const saved = savePositions(activeBuses);
  const activeIds = new Set(activeBuses.map((b) => b.id));
  const lastSeenBuses = getLastSeenBuses(activeIds, saved);

  // If fetch failed entirely, return all from cache
  if (activeBuses.length === 0) {
    const allGhosts = Object.values(saved).map((b) => ({ ...b, isLastSeen: true }));
    return {
      buses: allGhosts,
      activeCount: 0,
      lastSeenCount: allGhosts.length,
      count: allGhosts.length,
      fromCache: true,
    };
  }

  const allBuses = [...activeBuses, ...lastSeenBuses];
  return {
    buses: allBuses,
    activeCount: activeBuses.length,
    lastSeenCount: lastSeenBuses.length,
    count: allBuses.length,
  };
}

export function extractLines(buses) {
  const lines = {};
  for (const bus of buses) {
    const line = bus.line;
    if (line && !lines[line]) {
      lines[line] = {
        id: line,
        name: `Línea ${line}`,
        color: bus.color,
        routeName: bus.routeName,
      };
    }
  }
  return Object.values(lines).sort(
    (a, b) => (parseInt(a.id) || 999) - (parseInt(b.id) || 999)
  );
}
