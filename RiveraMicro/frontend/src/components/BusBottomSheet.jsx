import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Navigation, Bus, Route, Eye } from "lucide-react";

export default function BusBottomSheet({ bus, onClose, isDark, glassClass, textClass, textSecClass }) {
  if (!bus) return null;

  return (
    <Drawer open={!!bus} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DrawerContent
        className={`${isDark ? "bg-[#0f0f0f] border-white/10" : "bg-white border-gray-200"} rounded-t-[28px]`}
        data-testid="bus-detail-sheet"
      >
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: bus.color }}
                data-testid="bus-line-badge"
              >
                <span className="text-white font-bold text-lg" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {bus.line}
                </span>
              </div>
              <div>
                <DrawerTitle className={`text-lg font-bold ${textClass}`}>
                  Coche {bus.busNumber}
                </DrawerTitle>
                <DrawerDescription className={textSecClass}>
                  {bus.routeName}
                </DrawerDescription>
              </div>
            </div>
            <Badge
              className="text-xs px-2.5 py-1 border-0"
              style={{ backgroundColor: `${bus.color}20`, color: bus.color }}
              data-testid="bus-line-name-badge"
            >
              {bus.isLastSeen ? "Visto" : `Línea ${bus.line}`}
            </Badge>
          </div>
          {bus.isLastSeen && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10" data-testid="last-seen-banner">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-xs font-medium">
                Última posición conocida
              </span>
            </div>
          )}
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-3">
          {/* Info grid */}
          <div className={`grid grid-cols-2 gap-3`}>
            <InfoCard
              icon={<MapPin className="w-4 h-4" />}
              label="Parada actual"
              value={bus.currentStop || "Sin datos"}
              isDark={isDark}
              textClass={textClass}
              textSecClass={textSecClass}
            />
            <InfoCard
              icon={<Clock className="w-4 h-4" />}
              label="Salida"
              value={bus.departureTime || "--:--"}
              isDark={isDark}
              textClass={textClass}
              textSecClass={textSecClass}
            />
            <InfoCard
              icon={<Navigation className="w-4 h-4" />}
              label="Rumbo"
              value={`${bus.heading}°`}
              isDark={isDark}
              textClass={textClass}
              textSecClass={textSecClass}
            />
            <InfoCard
              icon={<Bus className="w-4 h-4" />}
              label="Matrícula"
              value={bus.licensePlate || "N/D"}
              isDark={isDark}
              textClass={textClass}
              textSecClass={textSecClass}
            />
          </div>

          {/* Route bar */}
          {bus.routeName && (
            <div
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${isDark ? "bg-white/5" : "bg-gray-50"}`}
              data-testid="bus-route-info"
            >
              <Route className={`w-4 h-4 ${isDark ? "text-[#CCFF00]" : "text-[#007AFF]"}`} />
              <span className={`text-sm font-medium ${textClass}`}>
                {bus.routeName}
              </span>
            </div>
          )}

          {/* Accessibility */}
          {bus.accessible && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10">
              <span className="text-blue-400 text-sm font-medium">Accesible</span>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function InfoCard({ icon, label, value, isDark, textClass, textSecClass }) {
  return (
    <div
      className={`px-3 py-2.5 rounded-xl ${isDark ? "bg-white/5" : "bg-gray-50"}`}
      data-testid={`info-card-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className={`flex items-center gap-1.5 mb-1 ${textSecClass}`}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-sm font-semibold ${textClass}`}>{value}</p>
    </div>
  );
}
