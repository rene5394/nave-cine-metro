import { prisma } from "@/lib/prisma";
import type { EventCategory } from "@/lib/events-shared";

export type { EventCategory };
export {
  type TicketEvent,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  formatPrice,
  formatDate,
  formatShortDate,
} from "@/lib/events-shared";

export async function getEvents() {
  return prisma.event.findMany({ orderBy: { date: "asc" } });
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({ where: { id } });
}

export async function getEventsByCategory(category: EventCategory) {
  return prisma.event.findMany({ where: { category }, orderBy: { date: "asc" } });
}

export async function getFeaturedEvents() {
  return prisma.event.findMany({ where: { featured: true }, orderBy: { date: "asc" } });
}
