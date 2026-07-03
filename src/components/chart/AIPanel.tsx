"use client";

import { useState, useRef, useEffect } from "react";
import { useChartStore } from "@/lib/store/chart-store";
import { useAlertStore } from "@/lib/store/alert-store";
import { X, Sparkles, Send, Trash2, HelpCircle, Bot, User, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// Custom Markdown rendering utility to avoid npm package bloating
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  let inList = false;
  const listItems: React.ReactNode[] = [];
  const renderedElements: React.ReactNode[] = [];

  const parseInlineStyles = (lineStr: string): React.ReactNode[] => {
    // Basic bold **text** parsing
    const parts = lineStr.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, idx) => {
      // Bold parts are at odd indices in the split result
      if (idx % 2 === 1) {
        return <strong key={idx} className="font-bold text-tv-text">{part}</strong>;
      }
      // Code blocks `code` parsing
      const subparts = part.split(/`([^`]+)`/g);
      return subparts.map((subpart, subidx) => {
        if (subidx % 2 === 1) {
          return (
            <code key={subidx} className="rounded bg-tv-bg px-1 py-0.5 font-mono text-[10px] text-tv-yellow border border-tv-border">
              {subpart}
            </code>
          );
        }
        return subpart;
      });
    });
  };

  lines.forEach((line, lineIdx) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
      inList = true;
      listItems.push(
        <li key={lineIdx} className="ml-4 list-disc text-tv-text-dim leading-relaxed mb-1 text-[11px]">
          {parseInlineStyles(trimmedLine.substring(2))}
        </li>
      );
    } else {
      if (inList) {
        renderedElements.push(
          <ul key={`list-${lineIdx}`} className="space-y-1 my-2">
            {[...listItems]}
          </ul>
        );
        listItems.length = 0;
        inList = false;
      }

      if (trimmedLine.startsWith("### ")) {
        renderedElements.push(
          <h3 key={lineIdx} className="text-xs font-bold text-tv-text mt-3 mb-1.5 border-b border-tv-border pb-0.5">
            {parseInlineStyles(trimmedLine.substring(4))}
          </h3>
        );
      } else if (trimmedLine.startsWith("#### ")) {
        renderedElements.push(
          <h4 key={lineIdx} className="text-xs font-semibold text-tv-text mt-2 mb-1">
            {parseInlineStyles(trimmedLine.substring(5))}
          </h4>
        );
      } else if (trimmedLine === "") {
        renderedElements.push(<div key={lineIdx} className="h-2" />);
      } else {
        renderedElements.push(
          <p key={lineIdx} className="text-tv-text-dim text-[11.5px] leading-relaxed my-1">
            {parseInlineStyles(trimmedLine)}
          </p>
        );
      }
    }
  });

  if (inList) {
    renderedElements.push(
      <ul key="list-end" className="space-y-1 my-2">
        {listItems}
      </ul>
    );
  }

  return <div className="space-y-1 select-text">{renderedElements}</div>;
}

export function AIPanel() {
  const symbol = useChartStore((s) => s.symbol);
  const timeframe = useChartStore((s) => s.timeframe);
  const isAIPanelOpen = useChartStore((s) => s.isAIPanelOpen);
  const setAIPanelOpen = useChartStore((s) => s.setAIPanelOpen);
  const indicators = useChartStore((s) => s.indicators);

  const currentPrice = useAlertStore((s) => s.currentPrice);
  const lastValues = useAlertStore((s) => s.lastValues);

  const [inputMsg, setInputMsg] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `👋 ¡Hola! Soy tu asistente de análisis cuantitativo. 

Escanearé los indicadores técnicos de **${symbol.toUpperCase()}** y crearé reportes estructurados de mercado.

Presioná **Generar Análisis Técnico** abajo para comenzar, o escribí tu pregunta.`,
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!isAIPanelOpen) return null;

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputMsg;
    if (!textToSend.trim()) return;

    if (!customText) setInputMsg("");

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      content: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol,
          timeframe,
          currentPrice,
          rsi: indicators.rsi ? lastValues.rsi : null,
          macd: indicators.macd ? lastValues.macd : null,
          ema20: indicators.ema20 ? lastValues.ema20 : null,
          ema50: indicators.ema50 ? lastValues.ema50 : null,
          ema200: indicators.ema200 ? lastValues.ema200 : null,
          bb: indicators.bb ? lastValues.bb : null,
          supertrend: indicators.supertrend ? lastValues.supertrend : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch analysis");
      }

      const assistantMsg: Message = {
        id: Math.random().toString(),
        role: "assistant",
        content: data.text,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      const errorMsg: Message = {
        id: Math.random().toString(),
        role: "assistant",
        content: `❌ Error al conectar con el servidor: ${e?.message || "Error desconocido."}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAnalysis = () => {
    handleSend(`Generá un análisis técnico completo para ${symbol.toUpperCase()} (${timeframe}) basado en los indicadores activos.`);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Escanearé los indicadores técnicos de **${symbol.toUpperCase()}** y crearé reportes estructurados de mercado.

Presioná **Generar Análisis Técnico** abajo para comenzar.`,
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 z-30 flex w-85 flex-col border-l border-tv-border bg-tv-panel/95 shadow-2xl backdrop-blur-md transition-all duration-300 ease-in-out">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-tv-border px-4 py-3.5 select-none">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-tv-yellow fill-tv-yellow/10" />
          <h2 className="text-sm font-semibold text-tv-text">Asistente Técnico IA</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClearChat}
            className="rounded p-1 text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-red focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue transition-colors"
            title="Limpiar chat"
            aria-label="Limpiar chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setAIPanelOpen(false)}
            className="rounded p-1 text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue transition-colors"
            aria-label="Cerrar asistente"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Board containing active indicators summary */}
      <div className="border-b border-tv-border bg-tv-bg/30 p-3 grid grid-cols-2 gap-1.5 text-[10px] select-none">
        {/* RSI */}
        <div className="rounded border border-tv-border bg-tv-bg/50 p-2 flex justify-between items-center">
          <span className="text-tv-text-dim">RSI (14)</span>
          <span className={`font-mono font-semibold ${
            !indicators.rsi 
              ? "text-tv-text-muted" 
              : lastValues.rsi && lastValues.rsi > 70 
              ? "text-tv-green" 
              : lastValues.rsi && lastValues.rsi < 30 
              ? "text-tv-red" 
              : "text-tv-text"
          }`}>
            {indicators.rsi && lastValues.rsi !== undefined ? lastValues.rsi.toFixed(1) : "Apagado"}
          </span>
        </div>

        {/* SuperTrend */}
        <div className="rounded border border-tv-border bg-tv-bg/50 p-2 flex justify-between items-center">
          <span className="text-tv-text-dim">SuperTrend</span>
          <span className={`font-semibold ${
            !indicators.supertrend
              ? "text-tv-text-muted"
              : lastValues.supertrend?.trend === "up"
              ? "text-tv-green"
              : "text-tv-red"
          }`}>
            {indicators.supertrend && lastValues.supertrend ? (lastValues.supertrend.trend === "up" ? "Alcista" : "Bajista") : "Apagado"}
          </span>
        </div>

        {/* Bollinger */}
        <div className="rounded border border-tv-border bg-tv-bg/50 p-2 flex justify-between items-center col-span-2">
          <span className="text-tv-text-dim">Bandas de Bollinger</span>
          <span className={`font-mono font-medium ${indicators.bb ? "text-tv-text" : "text-tv-text-muted"}`}>
            {indicators.bb && lastValues.bb 
              ? `Canal: $${Math.floor(lastValues.bb.lower)} - $${Math.floor(lastValues.bb.upper)}`
              : "Desactivado en gráfico"}
          </span>
        </div>
      </div>

      {/* Messages Log area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-[85%] ${
              m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            <div className={`flex h-6.5 w-6.5 shrink-0 select-none items-center justify-center rounded-full border ${
              m.role === "user" 
                ? "border-tv-blue/30 bg-tv-blue/10 text-tv-blue" 
                : "border-tv-yellow/30 bg-tv-yellow/10 text-tv-yellow"
            }`}>
              {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>
            
            <div className={`rounded-lg px-3 py-2 text-xs border ${
              m.role === "user" 
                ? "bg-tv-blue/10 border-tv-blue/15 text-tv-text" 
                : "bg-tv-panel-hover/30 border-tv-border text-tv-text-dim"
            }`}>
              {m.role === "assistant" ? renderMarkdown(m.content) : <p className="leading-relaxed whitespace-pre-wrap select-text">{m.content}</p>}
              <span className="block text-[8px] text-tv-text-muted text-right mt-1 pt-0.5">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 mr-auto items-center">
            <div className="flex h-6.5 w-6.5 select-none items-center justify-center rounded-full border border-tv-yellow/30 bg-tv-yellow/10 text-tv-yellow">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-tv-border bg-tv-panel-hover/30 px-3 py-2 text-xs text-tv-text-dim">
              <Loader2 className="h-3.5 w-3.5 text-tv-yellow animate-spin" />
              <span>Analizando datos del mercado…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Action panel & Chat input */}
      <div className="border-t border-tv-border p-3 space-y-2 bg-tv-panel select-none">
        {/* Generate Analysis Quick Action Button */}
        <button
          type="button"
          onClick={handleGenerateAnalysis}
          disabled={isLoading || currentPrice <= 0}
          className="flex w-full items-center justify-center gap-1.5 rounded bg-tv-blue hover:bg-tv-blue-hover py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tv-blue focus-visible:ring-offset-1 focus-visible:ring-offset-tv-panel"
        >
          <Sparkles className="h-3.5 w-3.5 text-tv-yellow fill-tv-yellow/10" />
          Generar Análisis Técnico
        </button>

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            required
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            disabled={isLoading}
            placeholder="Preguntame sobre este par..."
            className="flex-1 rounded border border-tv-border bg-tv-bg px-3 py-1.5 text-xs text-tv-text placeholder:text-tv-text-muted focus:border-tv-blue focus:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue disabled:opacity-55"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMsg.trim()}
            className="flex h-7.5 w-7.5 items-center justify-center rounded bg-tv-panel-hover text-tv-text-muted hover:text-tv-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tv-blue"
            aria-label="Enviar pregunta"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
