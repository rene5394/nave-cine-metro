"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatDate, formatPrice, type TicketEvent } from "@/lib/events-shared";

interface AddToCartButtonProps {
  event: TicketEvent;
}

export default function AddToCartButton({ event }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [screeningId, setScreeningId] = useState<string>(event.screenings[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = useMemo(
    () => event.screenings.find((s) => s.id === screeningId) ?? null,
    [event.screenings, screeningId],
  );
  const maxTickets = selected?.availableTickets ?? 0;

  const handleAdd = () => {
    if (!selected) return;
    addItem(event, { id: selected.id, date: selected.date, time: selected.time }, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const noScreenings = event.screenings.length === 0;
  const disabled = added || noScreenings || !selected || maxTickets === 0;

  return (
    <div className="flex flex-col gap-4">
      {noScreenings ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          No hay funciones disponibles.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-muted-foreground">Función</label>
          <select
            value={screeningId}
            onChange={(e) => {
              setScreeningId(e.target.value);
              setQuantity(1);
            }}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
          >
            {event.screenings.map((s) => (
              <option key={s.id} value={s.id}>
                {formatDate(s.date)} · {s.time}
                {s.availableTickets === 0 ? " (agotado)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

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
            onClick={() => setQuantity((q) => Math.min(maxTickets || q, q + 1))}
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
        disabled={disabled}
        className={`flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold transition-all disabled:opacity-50 ${
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

      {selected && (
        <p className="text-xs text-muted-foreground">{maxTickets} entradas disponibles</p>
      )}
    </div>
  );
}
