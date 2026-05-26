"use client";

import Image from "next/image";
import { Calendar, Clock, Film } from "lucide-react";
import { type TicketEvent, formatDate, formatTime12h } from "@/lib/events-shared";
import AddToCartButton from "./add-to-cart-button";

interface CineDetailProps {
  event: TicketEvent;
}

export default function CineDetail({ event }: CineDetailProps) {
  const firstScreening = event.screenings[0];
  return (
    <div className="relative">
      {/* Cinematic full-width backdrop */}
      <div className="relative h-[40vh] min-h-[280px] w-full overflow-hidden">
        <Image
          src={event.image || "/placeholder.svg"}
          alt={event.name}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />

        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-1">
          <Film className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Cine
          </span>
        </div>
      </div>

      <div className="relative z-10 -mt-28 px-6 pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          {/* Poster style card */}
          <div className="shrink-0 lg:w-56">
            <div className="overflow-hidden rounded-2xl border-2 border-amber-500/20 shadow-2xl shadow-amber-500/5">
              <div className="relative aspect-[2/3]">
                <Image
                  src={event.image || "/placeholder.svg"}
                  alt={event.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h1 className="mb-3 text-balance font-display text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
              {event.name}
            </h1>

            {firstScreening && (
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 text-amber-400" />
                  {formatDate(firstScreening.date)}
                </span>
                <span className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-amber-400" />
                  {formatTime12h(firstScreening.time)}
                </span>
              </div>
            )}

            <div className="mb-6 rounded-xl border border-border bg-card p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-400">
                Sinopsis
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {event.longDescription}
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-card to-amber-950/10 p-5">
              <AddToCartButton event={event} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
