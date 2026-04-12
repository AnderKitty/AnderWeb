import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLES = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

const RIVERA_CENTER = [-55.5508, -30.9053];
const DEFAULT_ZOOM = 14;
const MARKER_SIZE = 56;
const CIRCLE_R = 16;
const CX = MARKER_SIZE / 2;
const CY = MARKER_SIZE / 2;

// Build a single self-contained SVG string for each bus marker
function buildMarkerSVG(bus, isSelected) {
  const r = CIRCLE_R;
  const cx = CX;
  const cy = CY;
  const isGhost = bus.isLastSeen;

  // Arrow: a prominent triangle that extends well beyond the circle edge
  const tipY = 1;
  const baseY = cy - r + 4;
  const halfW = 10;
  const arrowPoints = `${cx},${tipY} ${cx - halfW},${baseY} ${cx + halfW},${baseY}`;

  const selRing = isSelected
    ? `<circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="none" stroke="#CCFF00" stroke-width="2" opacity="0.7">
         <animate attributeName="r" from="${r + 5}" to="${r + 14}" dur="1.5s" repeatCount="indefinite"/>
         <animate attributeName="opacity" from="0.7" to="0" dur="1.5s" repeatCount="indefinite"/>
       </circle>`
    : "";

  const borderColor = isSelected ? "#CCFF00" : isGhost ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.35)";
  // Ghost buses: lower opacity, dashed border
  const opacity = isGhost ? 0.45 : 1;
  const fillColor = bus.color;
  const ghostDash = isGhost ? `stroke-dasharray="3 2"` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${MARKER_SIZE}" height="${MARKER_SIZE}" viewBox="0 0 ${MARKER_SIZE} ${MARKER_SIZE}" opacity="${opacity}">
    ${selRing}
    <g transform="rotate(${bus.heading}, ${cx}, ${cy})">
      <polygon points="${arrowPoints}" fill="${fillColor}" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linejoin="round"/>
    </g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillColor}" stroke="${borderColor}" stroke-width="2.5" ${ghostDash}
      style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4))"/>
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
      fill="white" font-family="'IBM Plex Mono',monospace" font-size="11" font-weight="700"
      style="text-shadow:0 1px 2px rgba(0,0,0,0.5)">${bus.line}</text>
    ${isGhost ? `<text x="${cx}" y="${cy + r + 10}" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-family="'IBM Plex Sans',system-ui" font-size="8">Visto</text>` : ""}
  </svg>`;
}

export default function BusMap({ buses, isDark, selectedBus, onBusClick }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: isDark ? MAP_STYLES.dark : MAP_STYLES.light,
      center: RIVERA_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      pitchWithRotate: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    mapRef.current = map;

    return () => {
      Object.values(markersRef.current).forEach(m => m.remove());
      markersRef.current = {};
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle map style
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(isDark ? MAP_STYLES.dark : MAP_STYLES.light);
  }, [isDark]);

  // Create marker element: a single div with fixed size containing inline SVG
  const createMarkerEl = useCallback((bus, isSelected) => {
    const el = document.createElement("div");
    el.style.width = `${MARKER_SIZE}px`;
    el.style.height = `${MARKER_SIZE}px`;
    el.style.cursor = "pointer";
    el.setAttribute("data-testid", `bus-marker-${bus.id}`);
    el.innerHTML = buildMarkerSVG(bus, isSelected);
    return el;
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(buses.map(b => b.id));
    const existingIds = new Set(Object.keys(markersRef.current));

    // Remove old markers
    existingIds.forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Update or create markers
    buses.forEach(bus => {
      const isSelected = selectedBus?.id === bus.id;
      const existing = markersRef.current[bus.id];

      if (existing) {
        existing.setLngLat([bus.lon, bus.lat]);
        const el = existing.getElement();
        el.innerHTML = buildMarkerSVG(bus, isSelected);
      } else {
        const el = createMarkerEl(bus, isSelected);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onBusClick(bus);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([bus.lon, bus.lat])
          .addTo(map);

        markersRef.current[bus.id] = marker;
      }
    });
  }, [buses, selectedBus, createMarkerEl, onBusClick]);

  // Fly to selected bus
  useEffect(() => {
    if (!selectedBus || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [selectedBus.lon, selectedBus.lat],
      zoom: 16,
      duration: 800,
    });
  }, [selectedBus]);

  return (
    <div
      ref={mapContainer}
      data-testid="bus-map"
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
