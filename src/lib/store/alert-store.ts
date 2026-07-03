"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Alert {
  id: string;
  symbol: string;
  price: number;
  condition: "above" | "below";
  isActive: boolean;
  isTriggered: boolean;
  createdAt: number;
  triggeredAt?: number;
}

interface AlertState {
  alerts: Alert[];
  telegramChatId: string;
  isAlertsPanelOpen: boolean;
  currentPrice: number;
  addAlert: (symbol: string, price: number, condition: "above" | "below") => void;
  toggleAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  setTelegramChatId: (chatId: string) => void;
  setAlertsPanelOpen: (isOpen: boolean) => void;
  setCurrentPrice: (price: number) => void;
  checkAlerts: (
    symbol: string,
    currentPrice: number,
    onTrigger: (alert: Alert) => void
  ) => void;
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set, get) => ({
      alerts: [],
      telegramChatId: "",
      isAlertsPanelOpen: false,
      currentPrice: 0,

      addAlert: (symbol, price, condition) => {
        const newAlert: Alert = {
          id: Math.random().toString(36).substring(2, 9),
          symbol,
          price,
          condition,
          isActive: true,
          isTriggered: false,
          createdAt: Date.now(),
        };
        set((state) => ({
          alerts: [newAlert, ...state.alerts],
        }));
      },

      toggleAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id
              ? {
                  ...alert,
                  isActive: !alert.isActive,
                  // If reactivating, reset triggered status
                  isTriggered: !alert.isActive ? false : alert.isTriggered,
                }
              : alert
          ),
        }));
      },

      deleteAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.id !== id),
        }));
      },

      setTelegramChatId: (chatId) => {
        set({ telegramChatId: chatId });
      },

      setAlertsPanelOpen: (isOpen) => {
        set({ isAlertsPanelOpen: isOpen });
      },

      setCurrentPrice: (price) => {
        set({ currentPrice: price });
      },

      checkAlerts: (symbol, currentPrice, onTrigger) => {
        const { alerts } = get();
        let hasChanges = false;

        const updatedAlerts = alerts.map((alert) => {
          if (
            alert.symbol.toLowerCase() === symbol.toLowerCase() &&
            alert.isActive &&
            !alert.isTriggered
          ) {
            const isAbove = alert.condition === "above" && currentPrice >= alert.price;
            const isBelow = alert.condition === "below" && currentPrice <= alert.price;

            if (isAbove || isBelow) {
              hasChanges = true;
              const triggeredAlert = {
                ...alert,
                isActive: false,
                isTriggered: true,
                triggeredAt: Date.now(),
              };

              // Trigger callback asynchronously to not block the map iteration
              setTimeout(() => onTrigger(triggeredAlert), 0);

              return triggeredAlert;
            }
          }
          return alert;
        });

        if (hasChanges) {
          set({ alerts: updatedAlerts });
        }
      },
    }),
    {
      name: "tradingview-alerts-store",
      partialize: (state) => ({
        alerts: state.alerts,
        telegramChatId: state.telegramChatId,
      }),
    }
  )
);
