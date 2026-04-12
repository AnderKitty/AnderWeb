import { useState, useEffect, useCallback, useRef } from "react";
import "@/index.css";
import "@/App.css";
import BusMap from "@/components/BusMap";
import MapControls from "@/components/MapControls";
import BusBottomSheet from "@/components/BusBottomSheet";
import BusListPanel from "@/components/BusListPanel";
import LoadingScreen from "@/components/LoadingScreen";
import { fetchBuses as fetchBusData, extractLines } from "@/services/busService";

const UPDATE_INTERVAL = 12000;

function App() {
  const [buses, setBuses] = useState([]);
  const [lines, setLines] = useState([]);
  const [selectedLine, setSelectedLine] = useState("all");
  const [selectedBus, setSelectedBus] = useState(null);
  const [isDarkMap, setIsDarkMap] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBusList, setShowBusList] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeCount, setActiveCount] = useState(0);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const intervalRef = useRef(null);

  const fetchBuses = useCallback(async (initial = false) => {
    if (!initial) setIsUpdating(true);
    try {
      const data = await fetchBusData();
      setBuses(data.buses || []);
      setActiveCount(data.activeCount || 0);
      setLastSeenCount(data.lastSeenCount || 0);
      setLastUpdate(new Date());
      if (initial) {
        setLines(extractLines(data.buses || []));
      } else {
        // Update lines on every fetch to catch new lines from ghost buses
        setLines(prev => {
          const newLines = extractLines(data.buses || []);
          return newLines.length > prev.length ? newLines : prev;
        });
      }
    } catch (e) {
      console.error("Error fetching buses:", e);
    } finally {
      if (initial) setIsLoading(false);
      setIsUpdating(false);
    }
  }, []);

  useEffect(() => {
    fetchBuses(true);
    intervalRef.current = setInterval(() => fetchBuses(false), UPDATE_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchBuses]);

  const filteredBuses = selectedLine === "all"
    ? buses
    : buses.filter(b => b.line === selectedLine);

  const handleBusClick = useCallback((bus) => {
    setSelectedBus(bus);
    setShowBusList(false);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedBus(null);
  }, []);

  const glassClass = isDarkMap ? "glass-dark" : "glass-light";
  const textClass = isDarkMap ? "text-white" : "text-gray-900";
  const textSecClass = isDarkMap ? "text-white/60" : "text-gray-500";

  return (
    <div className="relative w-screen h-screen overflow-hidden" data-testid="app-root">
      <LoadingScreen isLoading={isLoading} />

      <BusMap
        buses={filteredBuses}
        isDark={isDarkMap}
        selectedBus={selectedBus}
        onBusClick={handleBusClick}
      />

      <MapControls
        isDark={isDarkMap}
        onToggleTheme={() => setIsDarkMap(prev => !prev)}
        selectedLine={selectedLine}
        onSelectLine={setSelectedLine}
        lines={lines}
        isUpdating={isUpdating}
        lastUpdate={lastUpdate}
        busCount={filteredBuses.filter(b => !b.isLastSeen).length}
        lastSeenCount={filteredBuses.filter(b => b.isLastSeen).length}
        glassClass={glassClass}
        textClass={textClass}
        textSecClass={textSecClass}
        onToggleBusList={() => setShowBusList(prev => !prev)}
        showBusList={showBusList}
      />

      {showBusList && !selectedBus && (
        <BusListPanel
          buses={filteredBuses}
          onBusClick={handleBusClick}
          isDark={isDarkMap}
          glassClass={glassClass}
          textClass={textClass}
          textSecClass={textSecClass}
          onClose={() => setShowBusList(false)}
        />
      )}

      <BusBottomSheet
        bus={selectedBus}
        onClose={handleCloseSheet}
        isDark={isDarkMap}
        glassClass={glassClass}
        textClass={textClass}
        textSecClass={textSecClass}
      />
    </div>
  );
}

export default App;
