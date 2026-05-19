"use client";

import Image from "next/image";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { type TicketEvent, formatDate, formatTime12h } from "@/lib/events-shared";
import { useCart } from "@/lib/cart-context";
import { useEventModal } from "@/lib/event-modal-context";

interface UnifiedDetailProps {
  event: TicketEvent;
}

export default function UnifiedDetail({ event }: UnifiedDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { closeEvent } = useEventModal();

  const screeningsByDate = useMemo(() => {
    const map = new Map<string, typeof event.screenings>();
    const sorted = [...event.screenings].sort((a, b) =>
      a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
    );
    for (const s of sorted) {
      const list = map.get(s.date);
      if (list) list.push(s);
      else map.set(s.date, [s]);
    }
    return map;
  }, [event.screenings]);

  const uniqueDates = useMemo(() => Array.from(screeningsByDate.keys()), [screeningsByDate]);

  const defaultDate = useMemo(() => {
    if (uniqueDates.length === 0) return "";
    const today = new Date().toISOString().slice(0, 10);
    return uniqueDates.find((d) => d >= today) ?? uniqueDates[uniqueDates.length - 1];
  }, [uniqueDates]);

  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);

  const defaultTimeForDate = (date: string): string => {
    const list = screeningsByDate.get(date) ?? [];
    const firstAvailable = list.find((s) => s.availableTickets > 0);
    return (firstAvailable ?? list[0])?.time ?? "";
  };

  const [selectedTime, setSelectedTime] = useState<string>(defaultTimeForDate(defaultDate));

  const selected = screeningsByDate.get(selectedDate)?.find((s) => s.time === selectedTime) ?? null;
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
          <div className="overflow-hidden rounded-lg border border-gray-200">
            {/* Sobre el Evento Section */}
            <div className="p-5">
              <h3 className="mb-3 text-lg font-bold text-gray-900">Sobre el Evento</h3>
              <p className="text-sm leading-relaxed text-gray-700">{event.longDescription}</p>
            </div>

            {/* Información Section */}
            <div className="p-5">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Función</h3>
              {event.screenings.length === 0 ? (
                <p className="text-sm text-gray-600">No hay funciones disponibles.</p>
              ) : (
                <div className="space-y-4">
                  <select
                    value={selectedDate}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      setSelectedDate(nextDate);
                      setSelectedTime(defaultTimeForDate(nextDate));
                      setQuantity(1);
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    {uniqueDates.map((d) => {
                      const label = formatDate(d);
                      return (
                        <option key={d} value={d}>
                          {label.charAt(0).toUpperCase() + label.slice(1)}
                        </option>
                      );
                    })}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    {(screeningsByDate.get(selectedDate) ?? []).map((s) => {
                      const isActive = s.time === selectedTime;
                      const soldOut = s.availableTickets === 0;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={soldOut}
                          onClick={() => {
                            setSelectedTime(s.time);
                            setQuantity(1);
                          }}
                          style={
                            isActive
                              ? {
                                  backgroundColor: "#9e5656",
                                  borderColor: "#9e5656",
                                  color: "#fff",
                                }
                              : { borderColor: "#9e5656", color: "#9e5656" }
                          }
                          className="rounded-md border-2 px-3 py-1.5 text-center text-xs font-semibold transition-colors hover:bg-[#9e5656]/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                          {formatTime12h(s.time)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Asegura tu lugar + Cantidad + CTA */}
            <div className="space-y-5 p-5">
              <div>
                <h3 className="text-lg font-bold" style={{ color: "#9e5656" }}>
                  Asegura tu lugar
                </h3>
                <p className="text-sm text-gray-600">Agrega las entradas que desees</p>
              </div>

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
    </div>
  );
}
