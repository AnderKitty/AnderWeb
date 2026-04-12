import { Sun, Moon, List, Filter, Bus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MapControls({
  isDark,
  onToggleTheme,
  selectedLine,
  onSelectLine,
  lines,
  isUpdating,
  lastUpdate,
  busCount,
  lastSeenCount,
  glassClass,
  textClass,
  textSecClass,
  onToggleBusList,
  showBusList,
}) {
  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--";

  return (
    <>
      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 ${glassClass} px-4 py-3 flex items-center justify-between`}
        data-testid="top-bar"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bus className={`w-5 h-5 ${isDark ? "text-[#CCFF00]" : "text-[#007AFF]"}`} />
            <h1
              className={`text-base font-bold tracking-tight ${textClass}`}
              style={{ fontFamily: "'IBM Plex Sans', system-ui" }}
            >
              MICRO Rivera
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="live-dot" data-testid="live-indicator" />
            <span className={`text-xs ${textSecClass}`}>
              {isUpdating ? "Actualizando..." : (
                <>
                  {busCount} activos
                  {lastSeenCount > 0 && <span className="opacity-60"> + {lastSeenCount} recientes</span>}
                </>
              )}
            </span>
          </div>
        </div>

        <div className={`text-xs font-mono ${textSecClass}`} data-testid="last-update-time">
          {timeStr}
        </div>
      </div>

      {/* Right side floating controls */}
      <div className="absolute top-20 right-3 z-10 flex flex-col gap-2" data-testid="map-controls">
        {/* Theme toggle */}
        <button
          className={`fab ${glassClass}`}
          onClick={onToggleTheme}
          data-testid="map-theme-toggle"
          title={isDark ? "Modo claro" : "Modo oscuro"}
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-[#CCFF00]" />
          ) : (
            <Moon className="w-5 h-5 text-gray-700" />
          )}
        </button>

        {/* Bus list toggle */}
        <button
          className={`fab ${glassClass} ${showBusList ? "ring-2 ring-[#CCFF00]/50" : ""}`}
          onClick={onToggleBusList}
          data-testid="bus-list-toggle"
          title="Lista de buses"
        >
          <List className={`w-5 h-5 ${isDark ? "text-white" : "text-gray-700"}`} />
        </button>
      </div>

      {/* Line filter - bottom left */}
      <div className="absolute bottom-6 left-3 z-10" data-testid="line-filter-container">
        <div className={`${glassClass} rounded-2xl p-1`}>
          <div className="flex items-center gap-1 px-2">
            <Filter className={`w-3.5 h-3.5 ${isDark ? "text-white/50" : "text-gray-400"}`} />
            <Select value={selectedLine} onValueChange={onSelectLine}>
              <SelectTrigger
                className={`border-0 bg-transparent shadow-none h-8 w-[140px] text-xs font-medium ${textClass} focus:ring-0`}
                data-testid="line-filter-dropdown"
              >
                <SelectValue placeholder="Todas las líneas" />
              </SelectTrigger>
              <SelectContent
                className={isDark
                  ? "bg-[#1a1a1a] border-white/10 text-white"
                  : "bg-white border-gray-200 text-gray-900"
                }
              >
                <SelectItem value="all" data-testid="line-filter-all">Todas las líneas</SelectItem>
                {lines.map(line => (
                  <SelectItem
                    key={line.id}
                    value={line.id}
                    data-testid={`line-filter-${line.id}`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: line.color }}
                      />
                      Línea {line.id}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </>
  );
}
