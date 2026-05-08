import type { Event as PrismaEvent, EventCategory } from "@/lib/generated/prisma/client";

export type { EventCategory };

export type TicketEvent = PrismaEvent;

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  cine: "Cine",
  teatro: "Teatro",
  concierto: "Concierto",
  popup: "Pop Up",
};

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  cine: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  teatro: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  concierto: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  popup: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceInCents / 100);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}
