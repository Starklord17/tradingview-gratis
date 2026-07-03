"use client";

import { Code2, Zap, Sparkles, History } from "lucide-react";
import { SymbolSelector } from "@/components/chart/SymbolSelector";
import { TimeframeSelector } from "@/components/chart/TimeframeSelector";
import { IndicatorMenu } from "@/components/chart/IndicatorMenu";
import { Separator } from "@/components/ui/separator";
import { useChartStore } from "@/lib/store/chart-store";
import { useReplayStore } from "@/lib/store/replay-store";
import { cn } from "@/lib/utils";

export function Header() {
  const isAIPanelOpen = useChartStore((s) => s.isAIPanelOpen);
  const setAIPanelOpen = useChartStore((s) => s.setAIPanelOpen);

  const isReplayActive = useReplayStore((s) => s.isReplayActive);
  const exitReplay = useReplayStore((s) => s.exitReplay);

  return (
    <header className="flex h-12 items-center justify-between border-b border-tv-border bg-tv-panel px-3 select-none">
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-2 pr-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-tv-blue/20">
            <Zap className="h-4 w-4 text-tv-blue" />
          </div>
          <span className="text-sm font-semibold text-tv-text">
            TradingView <span className="text-tv-text-muted">Gratis</span>
          </span>
        </div>
        <Separator orientation="vertical" className="h-6 bg-tv-border" />
        <SymbolSelector />
        <Separator orientation="vertical" className="h-6 bg-tv-border" />
        <TimeframeSelector />
        <Separator orientation="vertical" className="mx-1 h-6 bg-tv-border" />
        <IndicatorMenu />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (isReplayActive) {
              exitReplay();
            } else {
              useReplayStore.setState({ isReplayActive: true });
            }
          }}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue",
            isReplayActive
              ? "bg-tv-yellow/20 text-tv-yellow"
              : "text-tv-text-dim hover:bg-tv-panel-hover hover:text-tv-text"
          )}
        >
          <History className="h-3.5 w-3.5" />
          <span>Simulación</span>
        </button>
        <Separator orientation="vertical" className="h-5 bg-tv-border" />
        <button
          onClick={() => setAIPanelOpen(!isAIPanelOpen)}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue",
            isAIPanelOpen
              ? "bg-tv-blue/20 text-tv-blue"
              : "text-tv-text-dim hover:bg-tv-panel-hover hover:text-tv-text"
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-tv-yellow fill-tv-yellow/10" />
          <span>Analizar con IA</span>
        </button>
        <Separator orientation="vertical" className="h-5 bg-tv-border" />
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue"
        >
          <Code2 className="h-3.5 w-3.5" />
          <span>Source</span>
        </a>
      </div>
    </header>
  );
}
