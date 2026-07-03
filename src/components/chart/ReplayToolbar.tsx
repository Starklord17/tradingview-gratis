"use client";

import { useEffect } from "react";
import { useReplayStore } from "@/lib/store/replay-store";
import { useChartStore } from "@/lib/store/chart-store";
import { Play, Pause, SkipForward, SkipBack, Scissors, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const SPEEDS = [
  { label: "0.2s", value: 200 },
  { label: "0.5s", value: 500 },
  { label: "1.0s", value: 1000 },
  { label: "2.0s", value: 2000 },
  { label: "3.0s", value: 3000 },
];

export function ReplayToolbar() {
  const isReplayActive = useReplayStore((s) => s.isReplayActive);
  const isPlaying = useReplayStore((s) => s.isPlaying);
  const speedMs = useReplayStore((s) => s.speedMs);
  const stepForward = useReplayStore((s) => s.stepForward);
  const stepBackward = useReplayStore((s) => s.stepBackward);
  const setIsPlaying = useReplayStore((s) => s.setIsPlaying);
  const setSpeedMs = useReplayStore((s) => s.setSpeedMs);
  const exitReplay = useReplayStore((s) => s.exitReplay);

  const tool = useChartStore((s) => s.tool);
  const setTool = useChartStore((s) => s.setTool);

  // Playback timer effect
  useEffect(() => {
    if (!isReplayActive || !isPlaying) return;
    const interval = setInterval(() => {
      stepForward();
    }, speedMs);
    return () => clearInterval(interval);
  }, [isReplayActive, isPlaying, speedMs, stepForward]);

  if (!isReplayActive) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-lg border border-tv-border bg-tv-panel/90 px-2.5 py-1.5 shadow-xl backdrop-blur-md select-none ring-1 ring-black/20">
      {/* Indicator label */}
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-tv-yellow animate-pulse mr-1">
        <span className="h-1.5 w-1.5 rounded-full bg-tv-yellow" />
        Simulación
      </span>

      <Separator orientation="vertical" className="h-4 bg-tv-border" />

      {/* Jump/Cut Tool Button */}
      <button
        onClick={() => setTool(tool === "replay_jump" ? "cursor" : "replay_jump")}
        className={cn(
          "flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue transition-colors",
          tool === "replay_jump"
            ? "bg-tv-blue text-white"
            : "text-tv-text-dim hover:bg-tv-panel-hover hover:text-tv-text"
        )}
        title="Cortar gráfico en un punto del pasado"
        aria-label="Cortar gráfico"
      >
        <Scissors className="h-3.5 w-3.5" />
        <span className="text-[10px]">Cortar</span>
      </button>

      <Separator orientation="vertical" className="h-4 bg-tv-border" />

      {/* Step Backwards */}
      <button
        onClick={stepBackward}
        disabled={isPlaying}
        className="rounded p-1.5 text-tv-text-dim hover:bg-tv-panel-hover hover:text-tv-text disabled:opacity-40 disabled:hover:bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue"
        title="Paso atrás"
        aria-label="Paso atrás"
      >
        <SkipBack className="h-3.5 w-3.5" />
      </button>

      {/* Play / Pause Toggle */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tv-blue focus-visible:ring-offset-1 focus-visible:ring-offset-tv-panel",
          isPlaying ? "bg-tv-yellow hover:bg-tv-yellow/90" : "bg-tv-blue hover:bg-tv-blue-hover"
        )}
        title={isPlaying ? "Pausar reproducción" : "Iniciar reproducción automática"}
        aria-label={isPlaying ? "Pausar" : "Reproducir"}
      >
        {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current ml-0.5" />}
      </button>

      {/* Step Forwards */}
      <button
        onClick={stepForward}
        disabled={isPlaying}
        className="rounded p-1.5 text-tv-text-dim hover:bg-tv-panel-hover hover:text-tv-text disabled:opacity-40 disabled:hover:bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue"
        title="Paso adelante"
        aria-label="Paso adelante"
      >
        <SkipForward className="h-3.5 w-3.5" />
      </button>

      <Separator orientation="vertical" className="h-4 bg-tv-border" />

      {/* Speed Selector */}
      <div className="flex items-center gap-1">
        <label htmlFor="replay-speed-select" className="sr-only">Velocidad</label>
        <select
          id="replay-speed-select"
          value={speedMs}
          onChange={(e) => setSpeedMs(parseInt(e.target.value, 10))}
          className="rounded border border-tv-border bg-tv-bg px-2 py-0.5 text-[10px] text-tv-text-dim focus:outline-none focus:border-tv-blue"
        >
          {SPEEDS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <Separator orientation="vertical" className="h-4 bg-tv-border" />

      {/* Exit Replay Button */}
      <button
        onClick={() => {
          exitReplay();
          if (tool === "replay_jump") setTool("cursor");
        }}
        className="rounded p-1.5 text-tv-text-dim hover:bg-tv-panel-hover hover:text-tv-red transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue"
        title="Salir del modo simulación"
        aria-label="Salir de simulación"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
