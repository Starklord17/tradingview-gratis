"use client";

import { create } from "zustand";
import type { Candle } from "@/lib/binance/types";

interface ReplayState {
  isReplayActive: boolean;
  allCandles: Candle[];
  replayIndex: number;
  isPlaying: boolean;
  speedMs: number;

  enterReplay: (candles: Candle[]) => void;
  exitReplay: () => void;
  setReplayIndex: (index: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  setSpeedMs: (ms: number) => void;
  setIsPlaying: (playing: boolean) => void;
}

export const useReplayStore = create<ReplayState>((set, get) => ({
  isReplayActive: false,
  allCandles: [],
  replayIndex: -1,
  isPlaying: false,
  speedMs: 1000, // Default speed: 1s per candle

  enterReplay: (candles) => {
    set({
      isReplayActive: true,
      allCandles: candles,
      // Default starting point: last candle
      replayIndex: candles.length > 0 ? candles.length - 1 : -1,
      isPlaying: false,
    });
  },

  exitReplay: () => {
    set({
      isReplayActive: false,
      allCandles: [],
      replayIndex: -1,
      isPlaying: false,
    });
  },

  setReplayIndex: (index) => {
    const { allCandles } = get();
    if (index >= 0 && index < allCandles.length) {
      set({ replayIndex: index });
    }
  },

  stepForward: () => {
    const { replayIndex, allCandles } = get();
    if (replayIndex < allCandles.length - 1) {
      set({ replayIndex: replayIndex + 1 });
    } else {
      // Reached the end, pause
      set({ isPlaying: false });
    }
  },

  stepBackward: () => {
    const { replayIndex } = get();
    if (replayIndex > 0) {
      set({ replayIndex: replayIndex - 1 });
    }
  },

  setSpeedMs: (ms) => {
    set({ speedMs: ms });
  },

  setIsPlaying: (playing) => {
    set({ isPlaying: playing });
  },
}));
