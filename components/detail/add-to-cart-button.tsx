"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatPrice, type TicketEvent } from "@/lib/events-shared";

interface AddToCartButtonProps {
  event: TicketEvent;
}

export default function AddToCartButton({ event }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(event, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Cantidad:</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            style={{ backgroundColor: "#9e5656" }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-all hover:shadow-lg"
            aria-label="Reducir cantidad"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-base font-bold text-foreground">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(event.availableTickets, q + 1))}
            style={{ backgroundColor: "#9e5656" }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-all hover:shadow-lg"
            aria-label="Aumentar cantidad"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-primary">
          {formatPrice(event.priceInCents * quantity)}
        </span>
        {quantity > 1 && (
          <span className="text-sm text-muted-foreground">
            ({formatPrice(event.priceInCents)} c/u)
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={added}
        className={`flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold transition-all ${
          added
            ? "bg-emerald-600 text-emerald-50"
            : "bg-primary text-primary-foreground hover:brightness-110"
        }`}
      >
        {added ? (
          <>
            <Check className="h-5 w-5" />
            Agregado al carrito
          </>
        ) : (
          <>
            <ShoppingCart className="h-5 w-5" />
            Agregar al carrito
          </>
        )}
      </button>

      <p className="text-xs text-muted-foreground">{event.availableTickets} entradas disponibles</p>
    </div>
  );
}
