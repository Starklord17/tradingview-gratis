"use client";

import { useState, useEffect } from "react";
import { useAlertStore } from "@/lib/store/alert-store";
import { useChartStore } from "@/lib/store/chart-store";
import { X, Plus, Trash2, Bell, Clock, Settings, Volume2, VolumeX, Send, AlertTriangle, HelpCircle, ExternalLink } from "lucide-react";

export function AlertsPanel() {
  const symbol = useChartStore((s) => s.symbol);
  const isAlertsPanelOpen = useAlertStore((s) => s.isAlertsPanelOpen);
  const setAlertsPanelOpen = useAlertStore((s) => s.setAlertsPanelOpen);
  const alerts = useAlertStore((s) => s.alerts);
  const currentPrice = useAlertStore((s) => s.currentPrice);
  const addAlert = useAlertStore((s) => s.addAlert);
  const toggleAlert = useAlertStore((s) => s.toggleAlert);
  const deleteAlert = useAlertStore((s) => s.deleteAlert);
  const telegramChatId = useAlertStore((s) => s.telegramChatId);
  const setTelegramChatId = useAlertStore((s) => s.setTelegramChatId);

  const [activeTab, setActiveTab] = useState<"create" | "active" | "history" | "settings">("create");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [testStatus, setTestStatus] = useState<{ type: "success" | "error" | "loading"; msg: string } | null>(null);

  // Pre-fill target price when symbol changes or panel opens
  useEffect(() => {
    if (currentPrice > 0 && !targetPrice) {
      const handle = requestAnimationFrame(() => {
        setTargetPrice(currentPrice.toString());
      });
      return () => cancelAnimationFrame(handle);
    }
  }, [currentPrice, targetPrice]);

  if (!isAlertsPanelOpen) return null;

  const activeAlerts = alerts.filter((a) => !a.isTriggered);
  const triggeredAlerts = alerts.filter((a) => a.isTriggered);

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(targetPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    addAlert(symbol, priceNum, condition);
    setActiveTab("active");
    // Reset price input for future alerts
    setTargetPrice("");
  };

  const applyOffset = (percent: number) => {
    if (currentPrice <= 0) return;
    const offsetPrice = currentPrice * (1 + percent / 100);
    // Keep decimal precision based on price scale
    const decimals = currentPrice < 1 ? 6 : currentPrice < 100 ? 4 : 2;
    setTargetPrice(offsetPrice.toFixed(decimals));
  };

  const handleTestTelegram = async () => {
    if (!telegramChatId) {
      setTestStatus({ type: "error", msg: "Por favor, ingresá un Chat ID válido." });
      return;
    }

    setTestStatus({ type: "loading", msg: "Enviando…" });

    try {
      const res = await fetch("/api/alerts/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: "TEST",
          price: 12345.67,
          condition: "above",
          actualPrice: 12345.67,
          chatId: telegramChatId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al enviar mensaje");
      }

      setTestStatus({ type: "success", msg: "¡Mensaje de prueba enviado!" });
      setTimeout(() => setTestStatus(null), 4000);
    } catch (error: unknown) {
      setTestStatus({
        type: "error",
        msg: error instanceof Error ? error.message : "Error de conexión. Verificá tu token de servidor.",
      });
    }
  };

  return (
    <div className="absolute left-0 top-0 bottom-0 z-30 flex w-85 flex-col border-r border-tv-border bg-tv-panel/95 shadow-2xl backdrop-blur-md transition-all duration-300 ease-in-out select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-tv-border px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Bell className="h-4.5 w-4.5 text-tv-blue animate-pulse" />
          <h2 className="text-sm font-semibold text-tv-text">Panel de Alertas</h2>
        </div>
        <button
          onClick={() => setAlertsPanelOpen(false)}
          className="rounded p-1 text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue transition-colors"
          aria-label="Cerrar panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="grid grid-cols-4 border-b border-tv-border/60 bg-tv-bg/40 p-1 text-[11px] font-medium text-tv-text-dim">
        <button
          onClick={() => setActiveTab("create")}
          className={`flex flex-col items-center gap-1 rounded py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue ${
            activeTab === "create" ? "bg-tv-panel-hover text-tv-blue" : "hover:text-tv-text"
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Crear</span>
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`flex flex-col items-center gap-1 rounded py-1.5 relative transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue ${
            activeTab === "active" ? "bg-tv-panel-hover text-tv-blue" : "hover:text-tv-text"
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          <span>Activas</span>
          {activeAlerts.length > 0 && (
            <span className="absolute right-2 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-tv-blue px-1 text-[9px] font-bold text-white">
              {activeAlerts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center gap-1 rounded py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue ${
            activeTab === "history" ? "bg-tv-panel-hover text-tv-blue" : "hover:text-tv-text"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Historial</span>
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center gap-1 rounded py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue ${
            activeTab === "settings" ? "bg-tv-panel-hover text-tv-blue" : "hover:text-tv-text"
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Ajustes</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 text-xs">
        {/* TAB 1: CREATE ALERT */}
        {activeTab === "create" && (
          <form onSubmit={handleCreateAlert} className="space-y-4">
            {/* Active Info Badge */}
            <div className="rounded-lg bg-tv-bg/50 border border-tv-border p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-tv-text-dim">Activo Seleccionado</span>
                <span className="rounded bg-tv-blue/15 px-2 py-0.5 text-xs font-semibold text-tv-blue">
                  {symbol.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tv-text-dim">Precio en Vivo</span>
                <span className="font-mono font-bold text-tv-text">
                  {currentPrice > 0
                    ? `$${currentPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}`
                    : "Cargando…"}
                </span>
              </div>
            </div>

            {/* Condition Segmented Controls */}
            <div className="space-y-2">
              <span className="font-medium text-tv-text-dim block">Condición de disparo</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCondition("above")}
                  className={`rounded border py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue ${
                    condition === "above"
                      ? "border-tv-blue bg-tv-blue/10 text-tv-blue font-semibold"
                      : "border-tv-border bg-tv-panel-hover/30 text-tv-text-muted hover:text-tv-text"
                  }`}
                >
                  Cruza hacia Arriba (Above)
                </button>
                <button
                  type="button"
                  onClick={() => setCondition("below")}
                  className={`rounded border py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue ${
                    condition === "below"
                      ? "border-tv-blue bg-tv-blue/10 text-tv-blue font-semibold"
                      : "border-tv-border bg-tv-panel-hover/30 text-tv-text-muted hover:text-tv-text"
                  }`}
                >
                  Cruza hacia Abajo (Below)
                </button>
              </div>
            </div>

            {/* Target Price input */}
            <div className="space-y-2">
              <label htmlFor="alert-price-input" className="font-medium text-tv-text-dim block">
                Precio Objetivo (USD)
              </label>
              <div className="relative">
                <input
                  id="alert-price-input"
                  type="number"
                  step="any"
                  required
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder={currentPrice > 0 ? currentPrice.toString() : "0.00"}
                  className="w-full rounded border border-tv-border bg-tv-bg px-3 py-2 font-mono text-sm text-tv-text focus:border-tv-blue focus:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue"
                />
              </div>

              {/* Offset Buttons */}
              <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => applyOffset(-1)}
                  className="rounded border border-tv-border bg-tv-panel-hover/20 py-1 text-tv-text-dim hover:bg-tv-panel-hover hover:text-tv-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue"
                >
                  -1.0%
                </button>
                <button
                  type="button"
                  onClick={() => applyOffset(-0.5)}
                  className="rounded border border-tv-border bg-tv-panel-hover/20 py-1 text-tv-text-dim hover:bg-tv-panel-hover hover:text-tv-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue"
                >
                  -0.5%
                </button>
                <button
                  type="button"
                  onClick={() => applyOffset(0.5)}
                  className="rounded border border-tv-border bg-tv-panel-hover/20 py-1 text-tv-text-dim hover:bg-tv-panel-hover hover:text-tv-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue"
                >
                  +0.5%
                </button>
                <button
                  type="button"
                  onClick={() => applyOffset(1)}
                  className="rounded border border-tv-border bg-tv-panel-hover/20 py-1 text-tv-text-dim hover:bg-tv-panel-hover hover:text-tv-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue"
                >
                  +1.0%
                </button>
              </div>
            </div>

            {/* Warning if Telegram is not set */}
            {!telegramChatId && (
              <div className="rounded border border-yellow-500/20 bg-yellow-500/5 p-2.5 flex gap-2 text-yellow-500/90 leading-normal">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-[10px]">
                  No has configurado tu Telegram Chat ID en Ajustes. Las alertas sólo se mostrarán como notificaciones web en el navegador.
                </p>
              </div>
            )}

            {/* Create Button */}
            <button
              type="submit"
              disabled={currentPrice <= 0}
              className="flex w-full items-center justify-center gap-1.5 rounded bg-tv-blue hover:bg-tv-blue-hover py-2.5 font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tv-blue focus-visible:ring-offset-1 focus-visible:ring-offset-tv-panel"
            >
              <Plus className="h-4 w-4" />
              Crear Alerta de Precio
            </button>
          </form>
        )}

        {/* TAB 2: ACTIVE ALERTS */}
        {activeTab === "active" && (
          <div className="space-y-3">
            {activeAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-tv-text-muted space-y-2">
                <Bell className="h-10 w-10 text-tv-border" />
                <p>No tenés alertas activas.</p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="text-tv-blue hover:underline text-[11px]"
                >
                  Crear una nueva alerta
                </button>
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-lg border border-tv-border bg-tv-bg/30 p-3 hover:border-tv-border/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-tv-border/50 px-1.5 py-0.5 text-[10px] font-bold text-tv-text">
                        {alert.symbol.toUpperCase()}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          alert.condition === "above" ? "text-tv-green" : "text-tv-red"
                        }`}
                      >
                        {alert.condition === "above" ? "Cruza ↑" : "Cruza ↓"}
                      </span>
                    </div>
                    <div className="font-mono text-sm font-semibold text-tv-text">
                      ${alert.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Toggle Switch Button */}
                    <button
                      onClick={() => toggleAlert(alert.id)}
                      className={`flex h-6 w-6 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue ${
                        alert.isActive
                          ? "bg-tv-blue/15 text-tv-blue hover:bg-tv-blue/25"
                          : "bg-tv-panel-hover/40 text-tv-text-dim hover:bg-tv-panel-hover"
                      }`}
                      title={alert.isActive ? "Pausar Alerta" : "Activar Alerta"}
                      aria-label={alert.isActive ? "Pausar Alerta" : "Activar Alerta"}
                    >
                      {alert.isActive ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="flex h-6 w-6 items-center justify-center rounded text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-red transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue"
                      title="Eliminar Alerta"
                      aria-label="Eliminar Alerta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: TRIGGER HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {triggeredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-tv-text-muted space-y-2">
                <Clock className="h-10 w-10 text-tv-border" />
                <p>El historial de alertas está vacío.</p>
              </div>
            ) : (
              triggeredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-lg border border-tv-border/40 bg-tv-bg/10 p-3 opacity-70"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-tv-border/20 px-1.5 py-0.5 text-[10px] font-medium text-tv-text-muted">
                        {alert.symbol.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-tv-text-muted">
                        {alert.condition === "above" ? "Cruzó ↑" : "Cruzó ↓"}
                      </span>
                    </div>
                    <div className="font-mono text-sm text-tv-text-muted line-through">
                      ${alert.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span className="block text-[9px] text-tv-text-dim">
                      {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleTimeString() : ""}
                    </span>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-tv-text-muted hover:bg-tv-panel-hover hover:text-tv-red transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue"
                      title="Eliminar registro"
                      aria-label="Eliminar registro"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: TELEGRAM SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-tv-text">Configuración de Notificaciones</h3>

            <div className="space-y-2">
              <label htmlFor="telegram-chat-id" className="font-medium text-tv-text-dim block">
                Telegram Chat ID
              </label>
              <input
                id="telegram-chat-id"
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Ej: 123456789"
                className="w-full rounded border border-tv-border bg-tv-bg px-3 py-2 font-mono text-sm text-tv-text focus:border-tv-blue focus:outline-none focus-visible:ring-1 focus-visible:ring-tv-blue"
              />
              <p className="text-[9px] text-tv-text-dim">
                Guardado localmente en tu navegador. Usado para enviarte mensajes.
              </p>
            </div>

            {/* Test Send Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={testStatus?.type === "loading"}
                className="flex w-full items-center justify-center gap-1.5 rounded bg-tv-panel-hover hover:bg-tv-panel-hover/80 border border-tv-border py-2 font-semibold text-tv-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tv-blue"
              >
                <Send className="h-3.5 w-3.5 text-tv-blue" />
                Enviar Mensaje de Prueba
              </button>

              {testStatus && (
                <div
                  className={`rounded border p-2 text-[10px] leading-normal flex gap-1.5 ${
                    testStatus.type === "success"
                      ? "border-tv-green/30 bg-tv-green/5 text-tv-green"
                      : testStatus.type === "loading"
                      ? "border-tv-blue/30 bg-tv-blue/5 text-tv-blue"
                      : "border-tv-red/30 bg-tv-red/5 text-tv-red"
                  }`}
                >
                  <span className="font-medium">{testStatus.msg}</span>
                </div>
              )}
            </div>

            {/* Config Instructions */}
            <div className="rounded-lg bg-tv-bg/40 border border-tv-border/80 p-3 space-y-2 text-[11px] leading-relaxed text-tv-text-dim">
              <div className="flex items-center gap-1 text-tv-text font-semibold border-b border-tv-border pb-1">
                <HelpCircle className="h-3.5 w-3.5 text-tv-blue" />
                <span>¿Cómo configurar el bot de Telegram?</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 pt-0.5">
                <li>
                  Hablá con{" "}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tv-blue hover:underline inline-flex items-center gap-0.5"
                  >
                    @BotFather <ExternalLink className="h-2.5 w-2.5" />
                  </a>{" "}
                  en Telegram para crear tu Bot y obtener el <b>Token</b>.
                </li>
                <li>
                  Escribe ese token en el archivo <code>.env.local</code> del servidor como <code>TELEGRAM_BOT_TOKEN</code>.
                </li>
                <li>
                  Iniciá el chat con tu bot y luego buscá tu <b>Chat ID</b> chateando con{" "}
                  <a
                    href="https://t.me/userinfobot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tv-blue hover:underline inline-flex items-center gap-0.5"
                  >
                    @userinfobot <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </li>
                <li>
                  Ingresá ese Chat ID en el campo de arriba y hacé click en <b>Enviar Mensaje de Prueba</b>.
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
