import { X, MapPin, Clock, Navigation, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

function timeAgo(isoStr) {
  if (!isoStr) return "";
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace instantes";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `hace ${hrs}h ${mins % 60}m`;
}

export default function BusListPanel({ buses, onBusClick, isDark, glassClass, textClass, textSecClass, onClose }) {
  const activeBuses = buses.filter(b => !b.isLastSeen);
  const lastSeenBuses = buses.filter(b => b.isLastSeen);

  return (
    <div
      className={`absolute top-20 left-3 right-16 z-10 ${glassClass} rounded-2xl overflow-hidden max-h-[60vh] animate-fade-up`}
      data-testid="bus-list-panel"
      style={{ maxWidth: 360 }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-white/8" : "border-gray-200"}`}>
        <h2 className={`text-sm font-bold ${textClass}`}>
          {activeBuses.length} activos{lastSeenBuses.length > 0 && ` + ${lastSeenBuses.length} recientes`}
        </h2>
        <button
          onClick={onClose}
          className={`p-1 rounded-lg transition-colors ${isDark ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
          data-testid="bus-list-close"
        >
          <X className={`w-4 h-4 ${isDark ? "text-white/50" : "text-gray-400"}`} />
        </button>
      </div>

      {/* Bus list */}
      <ScrollArea className="max-h-[50vh]">
        <div className="p-2 space-y-1">
          {buses.length === 0 ? (
            <div className={`text-center py-8 ${textSecClass}`}>
              <p className="text-sm">No hay buses activos</p>
            </div>
          ) : (
            <>
              {activeBuses.map((bus, idx) => (
                <BusListItem key={bus.id} bus={bus} idx={idx} onBusClick={onBusClick} isDark={isDark} textClass={textClass} textSecClass={textSecClass} />
              ))}
              {lastSeenBuses.length > 0 && (
                <>
                  <div className={`flex items-center gap-2 px-3 py-2 mt-1 ${textSecClass}`}>
                    <Eye className="w-3 h-3" />
                    <span className="text-xs font-medium">Vistos recientemente</span>
                  </div>
                  {lastSeenBuses.map((bus, idx) => (
                    <BusListItem key={bus.id} bus={bus} idx={activeBuses.length + idx} onBusClick={onBusClick} isDark={isDark} textClass={textClass} textSecClass={textSecClass} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function BusListItem({ bus, idx, onBusClick, isDark, textClass, textSecClass }) {
  return (
    <button
      onClick={() => onBusClick(bus)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
        isDark ? "hover:bg-white/8" : "hover:bg-gray-50"
      } ${bus.isLastSeen ? "opacity-50" : ""}`}
      style={{ animationDelay: `${idx * 50}ms` }}
      data-testid={`bus-list-item-${bus.id}`}
    >
      {/* Line badge */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: bus.color, opacity: bus.isLastSeen ? 0.6 : 1 }}
      >
        <span className="text-white text-sm font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {bus.line}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${textClass}`}>
            Coche {bus.busNumber}
          </span>
          {bus.isLastSeen ? (
            <span className="text-[10px] text-amber-400/80 font-medium">
              {timeAgo(bus.lastSeenAt)}
            </span>
          ) : (
            <span className={`text-xs ${textSecClass}`}>
              <Navigation className="w-3 h-3 inline mr-0.5" style={{ transform: `rotate(${bus.heading}deg)` }} />
              {bus.heading}°
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className={`text-xs ${textSecClass} truncate`}>
            <MapPin className="w-3 h-3 inline mr-0.5" />
            {bus.currentStop || "—"}
          </span>
          {bus.departureTime && (
            <span className={`text-xs ${textSecClass}`}>
              <Clock className="w-3 h-3 inline mr-0.5" />
              {bus.departureTime}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
