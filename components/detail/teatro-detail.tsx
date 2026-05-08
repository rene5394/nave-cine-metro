"use client";

import Image from "next/image";
import { Calendar, Clock, Theater } from "lucide-react";
import { type TicketEvent, formatDate } from "@/lib/events-shared";
import AddToCartButton from "./add-to-cart-button";

interface TeatroDetailProps {
  event: TicketEvent;
}

export default function TeatroDetail({ event }: TeatroDetailProps) {
  return (
    <div className="relative">
      {/* Elegant theater curtain-style header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-rose-950/40 via-background to-background px-6 pb-6 pt-8">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,63,94,0.3),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(244,63,94,0.2),transparent_50%)]" />
        </div>

        <div className="relative z-10">
          <div className="mb-3 flex items-center gap-2">
            <Theater className="h-5 w-5 text-rose-400" />
            <span className="text-sm font-semibold uppercase tracking-widest text-rose-400">
              Teatro
            </span>
          </div>

          <h1 className="mb-2 max-w-3xl text-balance font-display text-2xl font-bold italic text-foreground md:text-4xl">
            {event.name}
          </h1>

          <p className="mb-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {event.description}
          </p>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
            <Theater className="h-4 w-4 text-rose-500/40" />
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
          </div>
        </div>
      </div>

      <div className="px-6 pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <div className="flex-1">
            {/* Main image with theater frame */}
            <div className="mb-6 overflow-hidden rounded-2xl border-2 border-rose-500/10">
              <div className="relative aspect-video">
                <Image
                  src={event.image || "/placeholder.svg"}
                  alt={event.name}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="pointer-events-none absolute inset-0 rounded-2xl border-[8px] border-rose-950/20" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-rose-500" />
                <h3 className="text-base font-bold text-foreground">Sobre la Obra</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {event.longDescription}
              </p>
            </div>
          </div>

          {/* Sidebar ticket panel */}
          <div className="lg:w-72">
            <div className="rounded-2xl border border-rose-500/20 bg-card p-5">
              <div className="mb-5 flex flex-col gap-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
                    <Calendar className="h-4 w-4 text-rose-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha</p>
                    <p className="text-sm font-medium text-foreground">{formatDate(event.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
                    <Clock className="h-4 w-4 text-rose-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hora</p>
                    <p className="text-sm font-medium text-foreground">{event.time} hrs</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <AddToCartButton event={event} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
