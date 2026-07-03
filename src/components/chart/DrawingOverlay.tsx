"use client";

import { useEffect, useRef, useState } from "react";
import { useChartStore, type Drawing, type Point } from "@/lib/store/chart-store";
import type { IChartApi, ISeriesApi, UTCTimestamp, Coordinate, Time } from "lightweight-charts";

interface Props {
  chart: IChartApi | null;
  candleSeries: ISeriesApi<"Candlestick"> | null;
  symbol: string;
  activeDrawing: {
    type: "trendline" | "fibonacci";
    a: Point;
    b: Point;
  } | null;
  renderTick?: number; // Used to trigger re-renders on zoom/pan
}

const FIB_LEVELS = [
  { val: 0.0, color: "rgba(239, 83, 80, 0.6)", fill: "rgba(239, 83, 80, 0.04)" },
  { val: 0.236, color: "rgba(255, 128, 0, 0.6)", fill: "rgba(255, 128, 0, 0.04)" },
  { val: 0.382, color: "rgba(255, 200, 0, 0.6)", fill: "rgba(255, 200, 0, 0.04)" },
  { val: 0.5, color: "rgba(76, 175, 80, 0.6)", fill: "rgba(76, 175, 80, 0.04)" },
  { val: 0.618, color: "rgba(0, 150, 136, 0.6)", fill: "rgba(0, 150, 136, 0.04)" },
  { val: 0.786, color: "rgba(156, 39, 176, 0.6)", fill: "rgba(156, 39, 176, 0.04)" },
  { val: 1.0, color: "rgba(120, 123, 134, 0.6)", fill: "rgba(120, 123, 134, 0.04)" },
];

export function DrawingOverlay({
  chart,
  candleSeries,
  symbol,
  activeDrawing,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drawings = useChartStore((s) => s.drawings);
  const tool = useChartStore((s) => s.tool);
  const updateDrawing = useChartStore((s) => s.updateDrawing);
  const deleteDrawing = useChartStore((s) => s.deleteDrawing);
  const selectedDrawingId = useChartStore((s) => s.selectedDrawingId);
  const setSelectedDrawingId = useChartStore((s) => s.setSelectedDrawingId);

  const [dragState, setDragState] = useState<{
    id: string;
    target: "a" | "b" | "all";
    type: "trendline" | "fibonacci" | "hline";
    startX: number;
    startY: number;
    startA: Point;
    startB: Point;
  } | null>(null);

  const symbolDrawings = drawings.filter((d) => d.symbol === symbol);

  // Click handler to select drawings or delete them (eraser)
  const handleElementClick = (e: React.MouseEvent, id: string) => {
    if (tool === "eraser") {
      e.stopPropagation();
      deleteDrawing(id);
      if (selectedDrawingId === id) setSelectedDrawingId(null);
    } else if (tool === "cursor") {
      e.stopPropagation();
      setSelectedDrawingId(id);
    }
  };

  // Start dragging handles or the entire element
  const startDrag = (
    e: React.MouseEvent,
    id: string,
    target: "a" | "b" | "all",
    a: Point,
    b: Point
  ) => {
    if (tool !== "cursor") return;
    const d = drawings.find((x) => x.id === id);
    if (!d) return;
    e.stopPropagation();
    e.preventDefault();
    setDragState({
      id,
      target,
      type: d.type,
      startX: e.clientX,
      startY: e.clientY,
      startA: { ...a },
      startB: { ...b },
    });
    setSelectedDrawingId(id);
  };

  // Handle global mouse movement during drag
  useEffect(() => {
    if (!dragState || !chart || !candleSeries) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      const ts = chart.timeScale();

      // Get initial coordinates in pixels
      const aX = ts.timeToCoordinate(dragState.startA.time as UTCTimestamp);
      const bX = ts.timeToCoordinate(dragState.startB.time as UTCTimestamp);
      const aY = candleSeries.priceToCoordinate(dragState.startA.price);
      const bY = candleSeries.priceToCoordinate(dragState.startB.price);

      if (aX === null || bX === null || aY === null || bY === null) return;

      let newAX = aX as number;
      let newAY = aY as number;
      let newBX = bX as number;
      let newBY = bY as number;

      if (dragState.target === "a") {
        newAX += dx;
        newAY += dy;
      } else if (dragState.target === "b") {
        newBX += dx;
        newBY += dy;
      } else if (dragState.target === "all") {
        newAX += dx;
        newAY += dy;
        newBX += dx;
        newBY += dy;
      }

      // Convert pixel coordinates back to chart values
      let newTimeA = ts.coordinateToTime(newAX as Coordinate);
      const newPriceA = candleSeries.coordinateToPrice(newAY as Coordinate);
      let newTimeB = ts.coordinateToTime(newBX as Coordinate);
      const newPriceB = candleSeries.coordinateToPrice(newBY as Coordinate);

      // If infinite horizontal line, preserve the original time anchor
      if (dragState.type === "hline") {
        newTimeA = dragState.startA.time as unknown as Time;
        newTimeB = dragState.startB.time as unknown as Time;
      }

      if (
        newTimeA === null ||
        newPriceA === null ||
        newTimeB === null ||
        newPriceB === null
      ) {
        return;
      }

      updateDrawing(dragState.id, {
        a: { time: Number(newTimeA), price: newPriceA },
        b: { time: Number(newTimeB), price: newPriceB },
      });
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, chart, candleSeries, updateDrawing]);

  // Click outside to deselect
  useEffect(() => {
    const handleWindowMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".drawing-element")) {
        setSelectedDrawingId(null);
      }
    };
    window.addEventListener("mousedown", handleWindowMouseDown);
    return () => window.removeEventListener("mousedown", handleWindowMouseDown);
  }, [setSelectedDrawingId]);

  if (!chart || !candleSeries) return null;

  const ts = chart.timeScale();

  // Helper to render Fibonacci levels
  const renderFibLevels = (
    d: Drawing,
    aX: number,
    aY: number,
    bX: number,
    bY: number,
    isSelected: boolean
  ) => {
    const priceA = d.a.price;
    const priceB = d.b.price;
    const diff = priceA - priceB;

    const leftX = Math.min(aX, bX);
    const rightX = Math.max(aX, bX);
    const w = rightX - leftX;

    const levelLines: React.ReactNode[] = [];
    const shadingBoxes: React.ReactNode[] = [];

    // Calculate Y coordinates for all levels
    const levelCoords = FIB_LEVELS.map((lvl) => {
      const lvlPrice = priceB + lvl.val * diff;
      const y = candleSeries.priceToCoordinate(lvlPrice);
      return { lvl, price: lvlPrice, y };
    });

    // Render shading boxes between consecutive levels
    for (let i = 0; i < levelCoords.length - 1; i++) {
      const c1 = levelCoords[i];
      const c2 = levelCoords[i + 1];
      if (c1.y !== null && c2.y !== null && w > 0) {
        const topY = Math.min(c1.y, c2.y);
        const h = Math.abs(c1.y - c2.y);
        shadingBoxes.push(
          <rect
            key={`shading-${d.id}-${i}`}
            x={leftX}
            y={topY}
            width={w}
            height={h}
            fill={c1.lvl.fill}
            className="drawing-element pointer-events-none"
          />
        );
      }
    }

    // Render level lines and text labels
    levelCoords.forEach(({ lvl, price, y }) => {
      if (y === null) return;
      levelLines.push(
        <g key={`lvl-line-${d.id}-${lvl.val}`} className="drawing-element">
          {/* Main horizontal line */}
          <line
            x1={leftX}
            y1={y}
            x2={rightX}
            y2={y}
            stroke={lvl.color}
            strokeWidth={isSelected ? 1.5 : 1}
            strokeDasharray={lvl.val !== 0.0 && lvl.val !== 1.0 ? "3,3" : undefined}
            onClick={(e) => handleElementClick(e, d.id)}
            onMouseDown={(e) => startDrag(e, d.id, "all", d.a, d.b)}
            className="cursor-pointer"
            style={{ pointerEvents: tool === "cursor" || tool === "eraser" ? "auto" : "none" }}
          />
          {/* Text label */}
          <text
            x={leftX + 6}
            y={y - 4}
            fill={lvl.color}
            fontSize="10"
            fontFamily="sans-serif"
            className="select-none pointer-events-none"
          >
            {`${lvl.val.toFixed(3)} (${price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })})`}
          </text>
        </g>
      );
    });

    const boxX = Math.min(aX, bX);
    const boxY = Math.min(aY, bY);
    const boxW = Math.abs(aX - bX);
    const boxH = Math.abs(aY - bY);

    return (
      <g key={d.id}>
        {boxW > 0 && boxH > 0 && (
          <rect
            x={boxX}
            y={boxY}
            width={boxW}
            height={boxH}
            fill="transparent"
            className="cursor-pointer"
            style={{ pointerEvents: tool === "cursor" || tool === "eraser" ? "auto" : "none" }}
            onClick={(e) => handleElementClick(e, d.id)}
            onMouseDown={(e) => startDrag(e, d.id, "all", d.a, d.b)}
          />
        )}
        {shadingBoxes}
        {levelLines}
        {/* Diagonal trend guide line */}
        <line
          x1={aX}
          y1={aY}
          x2={bX}
          y2={bY}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth={1}
          strokeDasharray="4,4"
          className="drawing-element pointer-events-none"
        />
      </g>
    );
  };

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
    >
      {/* Completed Drawings */}
      {symbolDrawings.map((d) => {
        const aX = ts.timeToCoordinate(d.a.time as UTCTimestamp);
        const bX = ts.timeToCoordinate(d.b.time as UTCTimestamp);
        const aY = candleSeries.priceToCoordinate(d.a.price);
        const bY = candleSeries.priceToCoordinate(d.b.price);

        if (aX === null || bX === null || aY === null || bY === null) return null;

        const isSelected = selectedDrawingId === d.id;
        const drawColor = d.color || (d.type === "trendline" ? "#ab47bc" : "#2962ff");
        const drawStyle = d.lineStyle || "solid";

        return (
          <g key={d.id}>
            {d.type === "trendline" ? (
              <g className="drawing-element">
                {/* Wider invisible line for easier click detection */}
                <line
                  x1={aX}
                  y1={aY}
                  x2={bX}
                  y2={bY}
                  stroke="transparent"
                  strokeWidth={12}
                  className="cursor-pointer"
                  style={{ pointerEvents: tool === "cursor" || tool === "eraser" ? "auto" : "none" }}
                  onClick={(e) => handleElementClick(e, d.id)}
                  onMouseDown={(e) => startDrag(e, d.id, "all", d.a, d.b)}
                />
                {/* Visual line */}
                <line
                  x1={aX}
                  y1={aY}
                  x2={bX}
                  y2={bY}
                  stroke={isSelected ? "#2962ff" : drawColor}
                  strokeWidth={isSelected ? 2 : 1.5}
                  strokeDasharray={drawStyle === "dashed" ? "4,4" : drawStyle === "dotted" ? "1,2" : undefined}
                  onClick={(e) => handleElementClick(e, d.id)}
                  className="pointer-events-none"
                />
              </g>
            ) : d.type === "hline" ? (
              <g className="drawing-element">
                {/* Wider invisible line for easier click detection */}
                <line
                  x1="0"
                  x2="100%"
                  y1={aY}
                  y2={aY}
                  stroke="transparent"
                  strokeWidth={12}
                  className="cursor-pointer"
                  style={{ pointerEvents: tool === "cursor" || tool === "eraser" ? "auto" : "none" }}
                  onClick={(e) => handleElementClick(e, d.id)}
                  onMouseDown={(e) => startDrag(e, d.id, "a", d.a, d.b)}
                />
                {/* Visual line */}
                <line
                  x1="0"
                  x2="100%"
                  y1={aY}
                  y2={aY}
                  stroke={isSelected ? "#2962ff" : drawColor}
                  strokeWidth={isSelected ? 2 : 1.5}
                  strokeDasharray={drawStyle === "dashed" ? "4,4" : drawStyle === "dotted" ? "1,2" : undefined}
                  className="pointer-events-none"
                />
                {/* Price text indicator */}
                <text
                  x="98%"
                  y={aY - 4}
                  textAnchor="end"
                  fill={isSelected ? "#2962ff" : drawColor}
                  fontSize="10"
                  fontFamily="sans-serif"
                  className="select-none pointer-events-none font-medium"
                >
                  {d.a.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </text>
              </g>
            ) : (
              renderFibLevels(d, aX, aY, bX, bY, isSelected)
            )}

            {/* Drag Handles (endpoints) */}
            {isSelected && tool === "cursor" && d.type !== "hline" && (
              <g className="drawing-element">
                {/* Handle A */}
                <g className="cursor-move">
                  {/* Invisible target circle */}
                  <circle
                    cx={aX}
                    cy={aY}
                    r={14}
                    fill="transparent"
                    style={{ pointerEvents: "auto" }}
                    onMouseDown={(e) => startDrag(e, d.id, "a", d.a, d.b)}
                  />
                  {/* Visual circle */}
                  <circle
                    cx={aX}
                    cy={aY}
                    r={6}
                    fill="#2962ff"
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="pointer-events-none"
                  />
                </g>
                {/* Handle B */}
                <g className="cursor-move">
                  {/* Invisible target circle */}
                  <circle
                    cx={bX}
                    cy={bY}
                    r={14}
                    fill="transparent"
                    style={{ pointerEvents: "auto" }}
                    onMouseDown={(e) => startDrag(e, d.id, "b", d.a, d.b)}
                  />
                  {/* Visual circle */}
                  <circle
                    cx={bX}
                    cy={bY}
                    r={6}
                    fill="#2962ff"
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="pointer-events-none"
                  />
                </g>
              </g>
            )}
          </g>
        );
      })}

      {/* Active Drawing Guide (Preview in progress) */}
      {activeDrawing && (() => {
        const aX = ts.timeToCoordinate(activeDrawing.a.time as UTCTimestamp);
        const bX = ts.timeToCoordinate(activeDrawing.b.time as UTCTimestamp);
        const aY = candleSeries.priceToCoordinate(activeDrawing.a.price);
        const bY = candleSeries.priceToCoordinate(activeDrawing.b.price);

        if (aX === null || bX === null || aY === null || bY === null) return null;

        if (activeDrawing.type === "trendline") {
          return (
            <line
              x1={aX}
              y1={aY}
              x2={bX}
              y2={bY}
              stroke="#2962ff"
              strokeWidth={1.5}
              strokeDasharray="3,3"
              className="pointer-events-none"
            />
          );
        } else if (activeDrawing.type === "fibonacci") {
          const diff = activeDrawing.a.price - activeDrawing.b.price;
          const leftX = Math.min(aX, bX);
          const rightX = Math.max(aX, bX);
          const w = rightX - leftX;

          return (
            <g className="pointer-events-none">
              {/* Shading boxes preview */}
              {FIB_LEVELS.slice(0, -1).map((lvl, i) => {
                const c1 = activeDrawing.b.price + lvl.val * diff;
                const c2 = activeDrawing.b.price + FIB_LEVELS[i + 1].val * diff;
                const y1 = candleSeries.priceToCoordinate(c1);
                const y2 = candleSeries.priceToCoordinate(c2);
                if (y1 !== null && y2 !== null && w > 0) {
                  return (
                    <rect
                      key={`preview-shade-${i}`}
                      x={leftX}
                      y={Math.min(y1, y2)}
                      width={w}
                      height={Math.abs(y1 - y2)}
                      fill={lvl.fill}
                      opacity={0.5}
                    />
                  );
                }
                return null;
              })}
              {/* Level lines preview */}
              {FIB_LEVELS.map(({ val, color }) => {
                const lvlPrice = activeDrawing.b.price + val * diff;
                const y = candleSeries.priceToCoordinate(lvlPrice);
                if (y === null) return null;
                return (
                  <line
                    key={`preview-lvl-${val}`}
                    x1={leftX}
                    y1={y}
                    x2={rightX}
                    y2={y}
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray="2,2"
                  />
                );
              })}
              {/* Diagonal trend guide preview */}
              <line
                x1={aX}
                y1={aY}
                x2={bX}
                y2={bY}
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            </g>
          );
        }
        return null;
      })()}
    </svg>
  );
}
