"use client";

import Image from "next/image";
import { Calendar, Clock, Sparkles, Users, Timer } from "lucide-react";
import { type TicketEvent, formatDate, formatTime12h } from "@/lib/events-shared";
import AddToCartButton from "./add-to-cart-button";

interface PopupDetailProps {
  event: TicketEvent;
}

export default function PopupDetail({ event }: PopupDetailProps) {
  const firstScreening = event.screenings[0];
  return (
    <div className="relative">
      {/* Playful gradient top section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 via-background to-background" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="relative z-10 px-6 pb-6 pt-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            {/* Image */}
            <div className="relative lg:w-1/2">
              <div className="overflow-hidden rounded-2xl border border-emerald-500/20">
                <div className="relative aspect-[4/3]">
                  <Image
                    src={event.image || "/placeholder.svg"}
                    alt={event.name}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
              <div className="absolute -bottom-3 left-4 flex gap-2">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 backdrop-blur-sm">
                  Experiencia
                </span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 backdrop-blur-sm">
                  Limitado
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col pt-2 lg:w-1/2">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-bold uppercase tracking-widest text-emerald-400">
                  Evento Pop Up
                </span>
              </div>

              <h1 className="mb-3 text-balance font-display text-2xl font-bold text-foreground md:text-3xl">
                {event.name}
              </h1>

              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                {event.description}
              </p>

              {/* Compact info tiles */}
              <div className="mb-5 grid grid-cols-2 gap-2">
                {firstScreening && (
                  <>
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5">
                      <Calendar className="h-4 w-4 shrink-0 text-emerald-400" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Fecha
                        </p>
                        <p className="text-xs font-semibold text-foreground">
                          {formatDate(firstScreening.date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5">
                      <Clock className="h-4 w-4 shrink-0 text-emerald-400" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Apertura
                        </p>
                        <p className="text-xs font-semibold text-foreground">
                          {formatTime12h(firstScreening.time)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5">
                  <Users className="h-4 w-4 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Capacidad
                    </p>
                    <p className="text-xs font-semibold text-foreground">
                      {event.screenings.reduce((n, s) => n + s.availableTickets, 0)} lugares
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-card p-4">
                <AddToCartButton event={event} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description section */}
      <div className="px-6 pb-8">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Timer className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-foreground">Sobre esta Experiencia</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{event.longDescription}</p>
        </div>
      </div>
    </div>
  );
}
