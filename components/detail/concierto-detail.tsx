"use client"

import Image from "next/image"
import { Calendar, Clock, Music, Zap, MapPin } from "lucide-react"
import { type TicketEvent, formatDate } from "@/lib/events-shared"
import AddToCartButton from "./add-to-cart-button"

interface ConciertoDetailProps {
  event: TicketEvent
}

export default function ConciertoDetail({ event }: ConciertoDetailProps) {
  return (
    <div className="relative">
      {/* Full-bleed concert hero */}
      <div className="relative h-[35vh] min-h-[250px] w-full overflow-hidden">
        <Image
          src={event.image || "/placeholder.svg"}
          alt={event.name}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-sky-950/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,hsl(var(--background))_100%)]" />

        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/20 px-4 py-1.5 backdrop-blur-sm">
          <Music className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
            En Vivo
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-6">
          <h1 className="mb-2 text-2xl font-black uppercase tracking-tight text-foreground md:text-4xl font-display">
            {event.name}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-sky-300">
              <Calendar className="h-4 w-4" />
              {formatDate(event.date)}
            </span>
            <span className="flex items-center gap-1.5 text-sky-300">
              <Clock className="h-4 w-4" />
              {event.time} hrs
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <div className="flex-1">
            {/* Info cards */}
            <div className="mb-6 grid gap-3 grid-cols-2">
              <div className="rounded-xl border border-sky-500/20 bg-card p-4 text-center">
                <Zap className="mx-auto mb-1.5 h-5 w-5 text-sky-400" />
                <p className="text-[10px] text-muted-foreground">Formato</p>
                <p className="text-xs font-bold text-foreground">En Vivo</p>
              </div>
              <div className="rounded-xl border border-sky-500/20 bg-card p-4 text-center">
                <Music className="mx-auto mb-1.5 h-5 w-5 text-sky-400" />
                <p className="text-[10px] text-muted-foreground">Disponibles</p>
                <p className="text-xs font-bold text-foreground">
                  {event.availableTickets}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-2 text-base font-bold text-foreground">
                Sobre el Evento
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {event.longDescription}
              </p>
            </div>
          </div>

          {/* Ticket panel */}
          <div className="lg:w-72">
            <div className="overflow-hidden rounded-2xl border border-sky-500/20 bg-card">
              <div className="bg-gradient-to-r from-sky-600 to-sky-500 p-4">
                <p className="text-sm font-bold text-sky-50 uppercase tracking-wider">
                  Asegura tu lugar
                </p>
                <p className="text-xs text-sky-100/80">
                  Entradas limitadas
                </p>
              </div>
              <div className="p-5">
                <AddToCartButton event={event} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
