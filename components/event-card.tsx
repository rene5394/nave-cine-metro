"use client";

import Image from "next/image";
import { Calendar } from "lucide-react";
import { type TicketEvent, formatPrice, formatShortDate } from "@/lib/events-shared";
import { useEventModal } from "@/lib/event-modal-context";

interface EventCardProps {
  event: TicketEvent;
  index?: number;
}

export default function EventCard({ event, index = 99 }: EventCardProps) {
  const { openEvent } = useEventModal();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openEvent(event)}
      onKeyDown={(e) => e.key === "Enter" && openEvent(event)}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl transition-all hover:scale-105 hover:shadow-2xl"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-900">
        <Image
          src={event.image || "/placeholder.svg"}
          alt={event.name}
          fill
          priority={index < 4}
          loading={index < 4 ? "eager" : "lazy"}
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Content pinned to bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="mb-2 line-clamp-2 text-base font-bold leading-tight text-white">
            {event.name}
          </h3>
          <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-300">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatShortDate(event.date)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-white">
              {formatPrice(event.priceInCents)}
            </span>
            <button
              type="button"
              style={{ backgroundColor: "#9e5656" }}
              className="rounded px-3 py-1.5 text-xs font-bold text-white transition-all hover:shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                openEvent(event);
              }}
            >
              COMPRAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
