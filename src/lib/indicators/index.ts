import type { Candle } from "@/lib/binance/types";

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface MACDPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

/**
 * Simple Moving Average
 */
export function sma(candles: Candle[], period: number): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  if (candles.length < period) return out;
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) out.push({ time: candles[i].time, value: sum / period });
  }
  return out;
}

/**
 * Exponential Moving Average — seeded with SMA of first `period` candles.
 */
export function ema(candles: Candle[], period: number): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  if (candles.length < period) return out;
  const k = 2 / (period + 1);
  let prev = 0;
  for (let i = 0; i < period; i++) prev += candles[i].close;
  prev /= period;
  out.push({ time: candles[period - 1].time, value: prev });
  for (let i = period; i < candles.length; i++) {
    prev = candles[i].close * k + prev * (1 - k);
    out.push({ time: candles[i].time, value: prev });
  }
  return out;
}

/**
 * RSI (Wilder) — period typically 14.
 */
export function rsi(candles: Candle[], period = 14): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  if (candles.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  gain /= period;
  loss /= period;
  let rs = loss === 0 ? 100 : gain / loss;
  out.push({ time: candles[period].time, value: 100 - 100 / (1 + rs) });
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    rs = loss === 0 ? 100 : gain / loss;
    out.push({ time: candles[i].time, value: 100 - 100 / (1 + rs) });
  }
  return out;
}

/**
 * MACD — fast EMA, slow EMA, signal EMA of the MACD line.
 * Defaults: 12 / 26 / 9.
 */
export function macd(
  candles: Candle[],
  fast = 12,
  slow = 26,
  signal = 9,
): MACDPoint[] {
  if (candles.length < slow + signal) return [];
  const emaFast = ema(candles, fast);
  const emaSlow = ema(candles, slow);
  // align: emaSlow starts later
  const slowStartTime = emaSlow[0].time;
  const fastByTime = new Map(emaFast.map((p) => [p.time, p.value]));
  const macdLine: IndicatorPoint[] = [];
  for (const p of emaSlow) {
    const f = fastByTime.get(p.time);
    if (f !== undefined) macdLine.push({ time: p.time, value: f - p.value });
  }
  // signal = EMA of MACD line. Build synthetic candles for ema()
  const synth: Candle[] = macdLine.map((p) => ({
    time: p.time,
    open: p.value,
    high: p.value,
    low: p.value,
    close: p.value,
    volume: 0,
  }));
  const sig = ema(synth, signal);
  const sigByTime = new Map(sig.map((p) => [p.time, p.value]));
  const out: MACDPoint[] = [];
  for (const p of macdLine) {
    const s = sigByTime.get(p.time);
    if (s === undefined) continue;
    out.push({ time: p.time, macd: p.value, signal: s, histogram: p.value - s });
  }
  void slowStartTime;
  return out;
}

export interface BBPoint {
  time: number;
  upper: number;
  basis: number;
  lower: number;
}

export function bollingerBands(
  candles: Candle[],
  period = 20,
  stdDevMultiplier = 2,
): BBPoint[] {
  const out: BBPoint[] = [];
  if (candles.length < period) return out;

  // 1. Calculate SMA (basis)
  const basisPoints = sma(candles, period);
  const basisByTime = new Map(basisPoints.map((p) => [p.time, p.value]));

  // 2. Calculate Standard Deviation for each candle
  for (let i = period - 1; i < candles.length; i++) {
    const time = candles[i].time;
    const basis = basisByTime.get(time);
    if (basis === undefined) continue;

    let sumSqDiff = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = candles[j].close - basis;
      sumSqDiff += diff * diff;
    }

    const stdDev = Math.sqrt(sumSqDiff / period);
    out.push({
      time,
      basis,
      upper: basis + stdDevMultiplier * stdDev,
      lower: basis - stdDevMultiplier * stdDev,
    });
  }

  return out;
}

export interface SuperTrendPoint {
  time: number;
  value: number;
  trend: "up" | "down";
}

export function superTrend(
  candles: Candle[],
  period = 10,
  multiplier = 3,
): SuperTrendPoint[] {
  const out: SuperTrendPoint[] = [];
  if (candles.length < period + 1) return out;

  const tr: number[] = [];
  const times: number[] = [];

  // TR is high - low for first candle
  tr.push(candles[0].high - candles[0].low);
  times.push(candles[0].time);

  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevClose = candles[i - 1].close;
    const trVal = Math.max(h - l, Math.abs(h - prevClose), Math.abs(l - prevClose));
    tr.push(trVal);
    times.push(candles[i].time);
  }

  const atr: number[] = new Array(candles.length).fill(0);
  let sumTr = 0;
  for (let i = 0; i < period; i++) {
    sumTr += tr[i];
  }
  atr[period - 1] = sumTr / period;

  for (let i = period; i < candles.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }

  const basicUpper: number[] = [];
  const basicLower: number[] = [];
  const finalUpper: number[] = new Array(candles.length).fill(0);
  const finalLower: number[] = new Array(candles.length).fill(0);
  const trend: ("up" | "down")[] = new Array(candles.length).fill("up");
  const supertrendVal: number[] = new Array(candles.length).fill(0);

  for (let i = 0; i < candles.length; i++) {
    const hl2 = (candles[i].high + candles[i].low) / 2;
    basicUpper.push(hl2 + multiplier * atr[i]);
    basicLower.push(hl2 - multiplier * atr[i]);
  }

  finalUpper[period - 1] = basicUpper[period - 1];
  finalLower[period - 1] = basicLower[period - 1];
  supertrendVal[period - 1] = finalUpper[period - 1];

  for (let i = period; i < candles.length; i++) {
    const prevClose = candles[i - 1].close;

    if (basicUpper[i] < finalUpper[i - 1] || prevClose > finalUpper[i - 1]) {
      finalUpper[i] = basicUpper[i];
    } else {
      finalUpper[i] = finalUpper[i - 1];
    }

    if (basicLower[i] > finalLower[i - 1] || prevClose < finalLower[i - 1]) {
      finalLower[i] = basicLower[i];
    } else {
      finalLower[i] = finalLower[i - 1];
    }

    if (candles[i].close > finalUpper[i - 1]) {
      trend[i] = "up";
    } else if (candles[i].close < finalLower[i - 1]) {
      trend[i] = "down";
    } else {
      trend[i] = trend[i - 1];
    }

    if (trend[i] === "up") {
      supertrendVal[i] = finalLower[i];
    } else {
      supertrendVal[i] = finalUpper[i];
    }

    out.push({
      time: candles[i].time,
      value: supertrendVal[i],
      trend: trend[i],
    });
  }

  return out;
}
