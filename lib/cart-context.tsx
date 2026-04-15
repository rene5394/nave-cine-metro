"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import type { TicketEvent } from "./events"

export interface CartItem {
  event: TicketEvent
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (event: TicketEvent, quantity?: number) => void
  removeItem: (eventId: string) => void
  updateQuantity: (eventId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPriceInCents: number
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'entradasya-cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (stored) {
        setItems(JSON.parse(stored))
      }
    } catch {}
  }, [])

  // Persist cart to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {}
  }, [items])

  const addItem = useCallback((event: TicketEvent, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.event.id === event.id)
      if (existing) {
        return prev.map((item) =>
          item.event.id === event.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prev, { event, quantity }]
    })
    setIsCartOpen(true)
  }, [])

  const removeItem = useCallback((eventId: string) => {
    setItems((prev) => prev.filter((item) => item.event.id !== eventId))
  }, [])

  const updateQuantity = useCallback((eventId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.event.id !== eventId))
      return
    }
    setItems((prev) =>
      prev.map((item) =>
        item.event.id === eventId ? { ...item, quantity } : item
      )
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch {}
  }, [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPriceInCents = items.reduce(
    (sum, item) => sum + item.event.priceInCents * item.quantity,
    0
  )

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
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
