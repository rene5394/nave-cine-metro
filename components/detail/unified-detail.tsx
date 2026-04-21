"use client"

import Image from "next/image"
import { Calendar, Clock, Minus, Plus, ShoppingCart } from "lucide-react"
import { useState } from "react"
import { type TicketEvent, formatDate } from "@/lib/events-shared"
import { useCart } from "@/lib/cart-context"
import { useEventModal } from "@/lib/event-modal-context"

interface UnifiedDetailProps {
  event: TicketEvent
}

export default function UnifiedDetail({ event }: UnifiedDetailProps) {
  const [quantity, setQuantity] = useState(1)
  const { addItem } = useCart()
  const { closeEvent } = useEventModal()

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(event)
    }
    closeEvent()
  }

  return (
    <div className="flex flex-col min-h-full bg-white rounded-2xl overflow-hidden shadow-2xl">
      {/* Banner Header */}
      <div
        style={{ backgroundColor: "#9e5656" }}
        className="px-8 py-6 text-center"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-white italic">
          {event.name}
        </h1>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">
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
                  className="relative aspect-square overflow-hidden rounded-lg bg-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
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
            <div className="border border-gray-200 rounded-lg p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Información
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-600 mt-0.5" style={{ color: "#9e5656" }} />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Fecha</p>
                    <p className="text-sm text-gray-900">{formatDate(event.date)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-600 mt-0.5" style={{ color: "#9e5656" }} />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Hora</p>
                    <p className="text-sm text-gray-900">{event.time} PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sobre el Evento Section */}
            <div className="border border-gray-200 rounded-lg p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Sobre el Evento
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {event.longDescription}
              </p>
            </div>

            {/* Asegura tu lugar Banner */}
            <div
              style={{ backgroundColor: "#9e5656" }}
              className="rounded-lg px-5 py-4"
            >
              <h3 className="text-lg font-bold text-white">Asegura tu lugar</h3>
              <p className="text-sm text-white/90">
                Agrega las entradas que desees
              </p>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm font-semibold text-gray-700">
                Cantidad:
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                style={{ backgroundColor: "#9e5656" }}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition-all hover:shadow-lg"
                aria-label="Reducir cantidad"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-lg font-bold text-gray-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((q) => Math.min(event.availableTickets, q + 1))
                }
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
              style={{ backgroundColor: "#9e5656" }}
              className="w-full flex items-center justify-center gap-3 rounded-lg px-6 py-4 text-base font-bold text-white transition-all hover:shadow-xl"
            >
              <ShoppingCart className="h-5 w-5" />
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
