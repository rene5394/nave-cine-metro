import type { Category, Event as PrismaEvent } from "@/lib/generated/prisma/client";

export type TicketEvent = PrismaEvent & { category: Category };

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
