// =============================================
// Rivera Bus Tracker - app.js
// =============================================
// IMPORTANTE: Cambia esta URL por la de tu Cloudflare Worker
// Ejemplo: "https://rivera-bus-proxy.tu-usuario.workers.dev"
const API_URL = "https://rivera-bus-proxy.anderson-silva-9ae.workers.dev";
// =============================================

const RIVERA_CENTER = [-55.5508, -30.9053];
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const UPDATE_INTERVAL = 12000;
const STORAGE_KEY = "rivera_bus_cache";

const LINE_COLORS = {
  "1": "#FF3B30", "2": "#FF6B35", "3": "#34C759", "4": "#5856D6",
  "5": "#FF9500", "6": "#AF52DE", "7": "#64D2FF", "8": "#FF2D55",
  "9": "#0A84FF", "10": "#FF375F", "11": "#30D158", "12": "#BF5AF2",
  "13": "#FFCC00", "14": "#FFD60A", "26": "#00C7BE",
};

function getLineColor(line) { return LINE_COLORS[line] || "#888"; }
function isDarkText(line) { return ["5", "13", "14"].includes(line); }

// ---- State ----
let map = null;
let markers = {};
let busCache = {};
let allBuses = [];
let activeFilter = "all";
let listOpen = false;

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
  loadCache();
  initMap();
  fetchBuses(true);
  setInterval(() => fetchBuses(false), UPDATE_INTERVAL);
});

// ---- Cache ----
function loadCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) busCache = JSON.parse(raw);
  } catch {}
}
function saveCache() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(busCache)); } catch {}
}

// ---- Map ----
function initMap() {
  map = new maplibregl.Map({
    container: "map",
    style: MAP_STYLE,
    center: RIVERA_CENTER,
    zoom: 13.5,
    attributionControl: false,
    pitchWithRotate: false,
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");
  map.addControl(new maplibregl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: false,
  }), "bottom-left");
}

// ---- Fetch ----
async function fetchBuses(isInitial) {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const liveBuses = data.buses || [];

    // Merge with cache
    const liveMap = {};
    liveBuses.forEach(b => {
      liveMap[b.bus] = { ...b, cached: false, lastSeen: Date.now() };
    });

    // Update cache
    Object.keys(liveMap).forEach(id => { busCache[id] = liveMap[id]; });
    Object.keys(busCache).forEach(id => {
      if (!liveMap[id]) busCache[id] = { ...busCache[id], cached: true };
    });

    // Remove old entries (>24h)
    const cutoff = Date.now() - 86400000;
    Object.keys(busCache).forEach(id => {
      if (busCache[id].lastSeen && busCache[id].lastSeen < cutoff) delete busCache[id];
    });

    saveCache();
    allBuses = Object.values(busCache);

    updateUI();
    updateMarkers();
    updateLastTime();

    if (isInitial) hideLoading();
  } catch (err) {
    console.error("Error fetching buses:", err);
    // Use cache on error
    allBuses = Object.values(busCache).map(b => ({ ...b, cached: true }));
    if (allBuses.length > 0) { updateUI(); updateMarkers(); }
    if (isInitial) hideLoading();
  }
}

function hideLoading() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.classList.add("fade-out");
    setTimeout(() => overlay.remove(), 500);
  }
}

// ---- UI Updates ----
function getFilteredBuses() {
  if (activeFilter === "all") return allBuses;
  return allBuses.filter(b => b.line === activeFilter);
}

function updateUI() {
  const filtered = getFilteredBuses();
  document.getElementById("bus-count-num").textContent = filtered.length;
  buildFilterPanel();
  if (listOpen) renderBusList();
}

function updateLastTime() {
  const now = new Date();
  const time = now.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  document.getElementById("update-time").textContent = time;
  const icon = document.getElementById("signal-icon");
  icon.classList.add("signal-pulse");
  setTimeout(() => icon.classList.remove("signal-pulse"), 1000);
}

// ---- Filter Panel ----
function buildFilterPanel() {
  const panel = document.getElementById("filter-panel");
  const lines = [...new Set(allBuses.map(b => b.line).filter(Boolean))].sort((a, b) => +a - +b);
  const all = ["all", ...lines];

  // Only rebuild if lines changed
  const key = all.join(",");
  if (panel.dataset.key === key) {
    // Just update active states
    panel.querySelectorAll(".filter-btn").forEach(btn => {
      const line = btn.dataset.line;
      const isActive = activeFilter === line;
      const color = line === "all" ? "#FFF" : getLineColor(line);
      btn.style.background = isActive ? color : "rgba(30,30,30,0.9)";
      btn.style.color = isActive ? (line === "all" || isDarkText(line) ? "#0A0A0A" : "#FFF") : color;
      btn.style.borderColor = isActive ? color : "rgba(255,255,255,0.1)";
      btn.style.boxShadow = isActive ? `0 0 16px ${color}40` : "0 2px 8px rgba(0,0,0,0.3)";
    });
    return;
  }

  panel.dataset.key = key;
  panel.innerHTML = "";

  all.forEach(line => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.dataset.line = line;
    btn.textContent = line === "all" ? "Todas" : `L${line}`;
    btn.onclick = () => { activeFilter = line; updateUI(); updateMarkers(); };

    const isActive = activeFilter === line;
    const color = line === "all" ? "#FFF" : getLineColor(line);
    btn.style.background = isActive ? color : "rgba(30,30,30,0.9)";
    btn.style.color = isActive ? (line === "all" || isDarkText(line) ? "#0A0A0A" : "#FFF") : color;
    btn.style.borderColor = isActive ? color : "rgba(255,255,255,0.1)";
    btn.style.boxShadow = isActive ? `0 0 16px ${color}40` : "0 2px 8px rgba(0,0,0,0.3)";

    panel.appendChild(btn);
  });
}

// ---- Markers ----
function createMarkerSVG(bus) {
  const color = bus.cached ? "#555" : getLineColor(bus.line);
  const textColor = !bus.cached && isDarkText(bus.line) ? "#0A0A0A" : "#FFF";
  const label = bus.bus;
  const fontSize = label.length > 2 ? 10 : 12;
  const size = 38;
  const tipH = 10;
  const cx = size / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + tipH}" viewBox="0 0 ${size} ${size + tipH}">
    <defs><filter id="s${bus.bus}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.6)"/></filter></defs>
    <path d="M${cx},${size + tipH - 1} L${cx - 6},${size - 2} A${cx - 1},${cx - 1} 0 1,1 ${cx + 6},${size - 2} Z" fill="${color}" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" filter="url(#s${bus.bus})"/>
    <text x="${cx}" y="${cx}" text-anchor="middle" dominant-baseline="central" fill="${textColor}" font-size="${fontSize}" font-weight="800" font-family="Outfit,system-ui,sans-serif">${label}</text>
  </svg>`;
}

function updateMarkers() {
  if (!map || !map.loaded()) {
    map.once("load", updateMarkers);
    return;
  }

  const filtered = getFilteredBuses();
  const currentIds = new Set(filtered.map(b => b.bus));

  // Remove old markers
  Object.keys(markers).forEach(id => {
    if (!currentIds.has(id)) {
      markers[id].remove();
      delete markers[id];
    }
  });

  // Add/update
  filtered.forEach(bus => {
    const existing = markers[bus.bus];
    if (existing) {
      const pos = existing.getLngLat();
      if (pos.lng !== bus.lon || pos.lat !== bus.lat) {
        existing.setLngLat([bus.lon, bus.lat]);
      }
      existing.getElement().style.opacity = bus.cached ? "0.55" : "1";
    } else {
      const el = document.createElement("div");
      el.className = "bus-marker-wrapper";
      el.style.cursor = "pointer";
      if (bus.cached) el.style.opacity = "0.55";
      el.innerHTML = createMarkerSVG(bus);
      el.addEventListener("click", (e) => { e.stopPropagation(); openBottomSheet(bus); });

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([bus.lon, bus.lat])
        .addTo(map);
      markers[bus.bus] = marker;
    }
  });
}

// ---- Bus List ----
function toggleBusList() {
  listOpen = !listOpen;
  const panel = document.getElementById("bus-list-panel");
  const toggle = document.getElementById("bus-list-toggle");
  if (listOpen) {
    panel.classList.remove("hidden");
    toggle.style.display = "none";
    renderBusList();
  } else {
    panel.classList.add("hidden");
    toggle.style.display = "flex";
  }
}

function renderBusList() {
  const filtered = getFilteredBuses();
  const live = filtered.filter(b => !b.cached);
  const cached = filtered.filter(b => b.cached);
  const content = document.getElementById("bus-list-content");
  const title = document.getElementById("panel-title");
  title.textContent = `Buses activos (${live.length})`;

  let html = "";
  live.forEach(bus => { html += busRowHTML(bus); });
  if (cached.length > 0) {
    html += `<div class="cached-section-label">Última posición conocida</div>`;
    cached.forEach(bus => { html += busRowHTML(bus); });
  }
  content.innerHTML = html;
}

function busRowHTML(bus) {
  const color = getLineColor(bus.line);
  const textColor = isDarkText(bus.line) ? "#0A0A0A" : "#FFF";
  const opacity = bus.cached ? "0.55" : "1";
  const bg = bus.cached ? "#444" : color;
  return `<button class="bus-row" style="opacity:${opacity}" onclick='openBottomSheet(${JSON.stringify(bus)})'>
    <div class="bus-row-badge" style="background:${bg};color:${textColor}">${bus.bus}</div>
    <div class="bus-row-info">
      <div class="bus-row-name">Coche ${bus.bus} · L${bus.line}</div>
      <div class="bus-row-stop">${bus.current_stop || bus.route_name || "--"}</div>
    </div>
    ${bus.departure ? `<span class="bus-row-time">${bus.departure}</span>` : ""}
  </button>`;
}

// ---- Bottom Sheet ----
function openBottomSheet(bus) {
  const sheet = document.getElementById("bottom-sheet");
  const overlay = document.getElementById("sheet-overlay");
  const color = getLineColor(bus.line);
  const textColor = isDarkText(bus.line) ? "#0A0A0A" : "#FFF";

  let cachedWarning = "";
  if (bus.cached) {
    cachedWarning = `<div class="sheet-cached-warning">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>Última posición conocida</span>
    </div>`;
  }

  document.getElementById("sheet-content").innerHTML = `
    <div class="sheet-bus-header">
      <div class="sheet-bus-left">
        <div class="sheet-bus-badge" style="background:${bus.cached ? "#555" : color};color:${bus.cached ? "#FFF" : textColor}">${bus.bus}</div>
        <div>
          <div class="sheet-bus-title">Coche ${bus.bus}</div>
          <div class="sheet-bus-route">${bus.route_name || "Línea " + bus.line}</div>
        </div>
      </div>
      <div class="sheet-line-badge" style="background:${color}20;color:${color};border:1px solid ${color}40">Línea ${bus.line}</div>
    </div>
    ${cachedWarning}
    <div class="sheet-grid">
      <div class="sheet-widget">
        <div class="sheet-widget-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          Parada actual
        </div>
        <div class="sheet-widget-value">${bus.current_stop || "N/D"}</div>
      </div>
      <div class="sheet-widget">
        <div class="sheet-widget-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Salida
        </div>
        <div class="sheet-widget-value">${bus.departure || "N/D"}</div>
      </div>
      <div class="sheet-widget">
        <div class="sheet-widget-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
          Rumbo
        </div>
        <div class="sheet-widget-value">${bus.heading || 0}°</div>
      </div>
      <div class="sheet-widget">
        <div class="sheet-widget-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
          Matrícula
        </div>
        <div class="sheet-widget-value">N/D</div>
      </div>
    </div>
    <div class="sheet-route-row">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34C759" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>
      ${bus.route_name || "Sin información de ruta"}
    </div>`;

  sheet.classList.remove("hidden");
  overlay.classList.remove("hidden");
  if (listOpen) toggleBusList();
}

function closeBottomSheet() {
  document.getElementById("bottom-sheet").classList.add("hidden");
  document.getElementById("sheet-overlay").classList.add("hidden");
}
