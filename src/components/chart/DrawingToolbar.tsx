"use client";

import { useChartStore, type Drawing } from "@/lib/store/chart-store";
import { Trash2 } from "lucide-react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";

interface Props {
  chart: IChartApi | null;
  candleSeries: ISeriesApi<"Candlestick"> | null;
}

const COLORS = [
  { hex: "#2962ff", label: "Azul" },
  { hex: "#ab47bc", label: "Púrpura" },
  { hex: "#26a69a", label: "Verde" },
  { hex: "#ef5350", label: "Rojo" },
  { hex: "#ffb74d", label: "Naranja" },
  { hex: "#ffffff", label: "Blanco" },
];

export function DrawingToolbar({ chart, candleSeries }: Props) {
  const selectedDrawingId = useChartStore((s) => s.selectedDrawingId);
  const drawings = useChartStore((s) => s.drawings);
  const updateDrawing = useChartStore((s) => s.updateDrawing);
  const deleteDrawing = useChartStore((s) => s.deleteDrawing);
  const setSelectedDrawingId = useChartStore((s) => s.setSelectedDrawingId);

  if (!selectedDrawingId || !chart || !candleSeries) return null;

  const drawing = drawings.find((d) => d.id === selectedDrawingId);
  if (!drawing) return null;

  const ts = chart.timeScale();

  let left = 0;
  let top = 0;

  if (drawing.type === "hline") {
    const y = candleSeries.priceToCoordinate(drawing.a.price);
    if (y === null) return null;
    const width = chart.timeScale().width();
    left = width / 2;
    top = Math.max(12, y - 48);
  } else {
    // Trendline or Fibonacci
    const aX = ts.timeToCoordinate(drawing.a.time as UTCTimestamp);
    const bX = ts.timeToCoordinate(drawing.b.time as UTCTimestamp);
    const aY = candleSeries.priceToCoordinate(drawing.a.price);
    const bY = candleSeries.priceToCoordinate(drawing.b.price);

    if (aX === null || bX === null || aY === null || bY === null) return null;

    left = (aX + bX) / 2;
    top = Math.max(12, Math.min(aY, bY) - 48);
  }

  const activeColor = drawing.color || (drawing.type === "trendline" ? "#ab47bc" : "#2962ff");
  const activeStyle = drawing.lineStyle || "solid";

  return (
    <div
      className="absolute flex items-center gap-3 rounded-lg border border-tv-border bg-tv-panel/95 px-3 py-1.5 shadow-xl backdrop-blur-md transition-all z-30 -translate-x-1/2 drawing-element"
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
    >
      {/* Type Badge */}
      <span className="text-[9px] font-semibold uppercase tracking-wider text-tv-text-dim border-r border-tv-border pr-2.5">
        {drawing.type === "trendline"
          ? "Tendencia"
          : drawing.type === "fibonacci"
          ? "Fibonacci"
          : "H-Line"}
      </span>

      {/* Styling options for HLine and Trendline only */}
      {drawing.type !== "fibonacci" && (
        <>
          {/* Color Palette */}
          <div className="flex items-center gap-1">
            {COLORS.map((c) => {
              const active = activeColor.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.hex}
                  onClick={() => updateDrawing(drawing.id, { color: c.hex })}
                  className="group relative flex h-4.5 w-4.5 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                  aria-label={`Color ${c.label}`}
                >
                  {active && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: c.hex === "#ffffff" ? "#131722" : "#ffffff",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-tv-border" />

          {/* Line Style (Solid vs Dashed) */}
          <div className="flex items-center gap-1.5">
            {/* Solid */}
            <button
              onClick={() => updateDrawing(drawing.id, { lineStyle: "solid" })}
              className={`flex h-6 px-1.5 items-center justify-center rounded transition-colors text-xs font-medium hover:bg-tv-panel-hover ${
                activeStyle === "solid"
                  ? "bg-tv-blue/15 text-tv-blue"
                  : "text-tv-text-muted hover:text-tv-text"
              }`}
              title="Línea continua"
              aria-label="Línea continua"
            >
              <div className="w-5 h-0.75 bg-current rounded-sm" />
            </button>

            {/* Dashed */}
            <button
              onClick={() => updateDrawing(drawing.id, { lineStyle: "dashed" })}
              className={`flex h-6 px-1.5 items-center justify-center rounded transition-colors text-xs font-medium hover:bg-tv-panel-hover ${
                activeStyle === "dashed"
                  ? "bg-tv-blue/15 text-tv-blue"
                  : "text-tv-text-muted hover:text-tv-text"
              }`}
              title="Línea discontinua"
              aria-label="Línea discontinua"
            >
              <div className="w-5 h-0.75 border-t-2 border-dashed border-current" />
            </button>
          </div>

          <div className="h-4 w-px bg-tv-border" />
        </>
      )}

      {/* Delete button */}
      <button
        onClick={() => {
          deleteDrawing(drawing.id);
          setSelectedDrawingId(null);
        }}
        className="flex h-6 w-6 items-center justify-center rounded text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-red transition-colors"
        title="Eliminar dibujo"
        aria-label="Eliminar dibujo"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
