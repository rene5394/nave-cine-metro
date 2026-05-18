"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { TicketEvent } from "./events";

export interface CartScreening {
  id: string;
  date: string;
  time: string;
}

export interface CartItem {
  event: TicketEvent;
  screening: CartScreening;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (event: TicketEvent, screening: CartScreening, quantity?: number) => void;
  removeItem: (eventId: string, screeningId: string) => void;
  updateQuantity: (eventId: string, screeningId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPriceInCents: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "entradasya-cart-v2";

function isSameLine(item: CartItem, eventId: string, screeningId: string) {
  return item.event.id === eventId && item.screening.id === screeningId;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Hydration effect: localStorage isn't available during SSR, so we sync
  // from the external store on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Persist cart to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const addItem = useCallback((event: TicketEvent, screening: CartScreening, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => isSameLine(item, event.id, screening.id));
      if (existing) {
        return prev.map((item) =>
          isSameLine(item, event.id, screening.id)
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...prev, { event, screening, quantity }];
    });
    setIsCartOpen(true);
  }, []);

  const removeItem = useCallback((eventId: string, screeningId: string) => {
    setItems((prev) => prev.filter((item) => !isSameLine(item, eventId, screeningId)));
  }, []);

  const updateQuantity = useCallback((eventId: string, screeningId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => !isSameLine(item, eventId, screeningId)));
      return;
    }
    setItems((prev) =>
      prev.map((item) => (isSameLine(item, eventId, screeningId) ? { ...item, quantity } : item)),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {}
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPriceInCents = items.reduce(
    (sum, item) => sum + item.event.priceInCents * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPriceInCents,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
