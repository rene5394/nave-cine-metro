"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react"
import {
  type TicketEvent,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  formatPrice,
  formatDate,
} from "@/lib/events"
import { useEventModal } from "@/lib/event-modal-context"

interface HeroSliderProps {
  events: TicketEvent[]
}

export default function HeroSlider({ events }: HeroSliderProps) {
  const [current, setCurrent] = useState(0)
  const { openEvent } = useEventModal()

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % events.length)
  }, [events.length])

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + events.length) % events.length)
  }, [events.length])

  useEffect(() => {
    const timer = setInterval(next, 6000)
    return () => clearInterval(timer)
  }, [next])

  if (events.length === 0) return null

  const event = events[current]

  return (
    <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
      {events.map((e, i) => (
        <div
          key={e.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === current ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Image
            src={e.image || "/placeholder.svg"}
            alt={e.name}
            fill
            className="object-cover"
            priority={i === 0}
            loading={i === 0 ? "eager" : "lazy"}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>
      ))}

      <div className="relative z-10 flex h-full items-end">
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 md:pb-16">
          <span
            className={`mb-4 inline-block rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${CATEGORY_COLORS[event.category]}`}
          >
            {CATEGORY_LABELS[event.category]}
          </span>
          <h1 className="mb-3 max-w-2xl text-4xl font-bold leading-tight text-white md:text-5xl lg:text-7xl text-balance font-display drop-shadow-lg">
            {event.name}
          </h1>
          <p className="mb-5 max-w-xl text-base text-white/90 leading-relaxed md:text-lg drop-shadow">
            {event.description}
          </p>
          <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(event.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {event.venue}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => openEvent(event)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              Comprar desde {formatPrice(event.priceInCents)}
            </button>
          </div>
        </div>
      </div>

      <div className="absolute right-4 bottom-12 z-20 flex items-center gap-2 md:right-8">
            <button
              type="button"
              onClick={prev}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-all hover:bg-primary hover:text-white"
              aria-label="Evento anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-all hover:bg-primary hover:text-white"
              aria-label="Siguiente evento"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
      </div>

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {events.map((e, i) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === current
                ? "w-8 bg-primary"
                : "w-1.5 bg-muted-foreground/40"
            }`}
            aria-label={`Ir al evento ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
