import { Bus } from "lucide-react";

export default function LoadingScreen({ isLoading }) {
  return (
    <div
      className={`loading-screen ${!isLoading ? "hidden" : ""}`}
      data-testid="loading-screen"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="loading-bus" />
          <Bus className="w-6 h-6 text-[#CCFF00] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center">
          <h2
            className="text-xl font-bold text-white tracking-tight mb-1"
            style={{ fontFamily: "'IBM Plex Sans', system-ui" }}
          >
            MICRO Rivera
          </h2>
          <p className="text-sm text-white/40">Cargando buses en tiempo real...</p>
        </div>
      </div>
    </div>
  );
}
