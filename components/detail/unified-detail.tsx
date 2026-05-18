"use client";

import Image from "next/image";
import { Calendar, Clock, Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { type TicketEvent, formatDate } from "@/lib/events-shared";
import { useCart } from "@/lib/cart-context";
import { useEventModal } from "@/lib/event-modal-context";

interface UnifiedDetailProps {
  event: TicketEvent;
}

export default function UnifiedDetail({ event }: UnifiedDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [screeningId, setScreeningId] = useState<string>(event.screenings[0]?.id ?? "");
  const { addItem } = useCart();
  const { closeEvent } = useEventModal();

  const selected = event.screenings.find((s) => s.id === screeningId) ?? null;
  const maxTickets = selected?.availableTickets ?? 0;

  const handleAddToCart = () => {
    if (!selected) return;
    addItem(event, { id: selected.id, date: selected.date, time: selected.time }, quantity);
    closeEvent();
  };

  return (
    <div className="flex min-h-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      {/* Banner Header */}
      <div style={{ backgroundColor: "#9e5656" }} className="px-8 py-6 text-center">
        <h1 className="text-2xl font-bold italic text-white md:text-3xl">{event.name}</h1>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 md:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
          {/* Left Column - Images */}
          <div className="space-y-4">
            {/* Main Image - Larger */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gray-200 shadow-lg">
              <Image
                src={event.image || "/placeholder.svg"}
                alt={event.name}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-200 transition-opacity hover:opacity-80"
                >
                  <Image
                    src={event.image || "/placeholder.svg"}
                    alt={`${event.name} - Vista ${i}`}
                    fill
                    className="object-cover opacity-60"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            {/* Información Section */}
            <div className="rounded-lg border border-gray-200 p-5">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Función</h3>
              {event.screenings.length === 0 ? (
                <p className="text-sm text-gray-600">No hay funciones disponibles.</p>
              ) : (
                <div className="space-y-3">
                  <select
                    value={screeningId}
                    onChange={(e) => {
                      setScreeningId(e.target.value);
                      setQuantity(1);
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    {event.screenings.map((s) => (
                      <option key={s.id} value={s.id}>
                        {formatDate(s.date)} · {s.time}
                        {s.availableTickets === 0 ? " (agotado)" : ""}
                      </option>
                    ))}
                  </select>
                  {selected && (
                    <>
                      <div className="flex items-start gap-3">
                        <Calendar
                          className="mt-0.5 h-5 w-5 text-gray-600"
                          style={{ color: "#9e5656" }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-700">Fecha</p>
                          <p className="text-sm text-gray-900">{formatDate(selected.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock
                          className="mt-0.5 h-5 w-5 text-gray-600"
                          style={{ color: "#9e5656" }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-700">Hora</p>
                          <p className="text-sm text-gray-900">{selected.time}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Sobre el Evento Section */}
            <div className="rounded-lg border border-gray-200 p-5">
              <h3 className="mb-3 text-lg font-bold text-gray-900">Sobre el Evento</h3>
              <p className="text-sm leading-relaxed text-gray-700">{event.longDescription}</p>
            </div>

            {/* Asegura tu lugar Banner */}
            <div style={{ backgroundColor: "#9e5656" }} className="rounded-lg px-5 py-4">
              <h3 className="text-lg font-bold text-white">Asegura tu lugar</h3>
              <p className="text-sm text-white/90">Agrega las entradas que desees</p>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm font-semibold text-gray-700">Cantidad:</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                style={{ backgroundColor: "#9e5656" }}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition-all hover:shadow-lg"
                aria-label="Reducir cantidad"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-lg font-bold text-gray-900">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxTickets || q, q + 1))}
                style={{ backgroundColor: "#9e5656" }}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition-all hover:shadow-lg"
                aria-label="Aumentar cantidad"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!selected || maxTickets === 0}
              style={{ backgroundColor: "#9e5656" }}
              className="flex w-full items-center justify-center gap-3 rounded-lg px-6 py-4 text-base font-bold text-white transition-all hover:shadow-xl disabled:opacity-50"
            >
              <ShoppingCart className="h-5 w-5" />
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
