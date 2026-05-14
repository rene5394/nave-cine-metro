import { prisma } from "@/lib/prisma";

export { type TicketEvent, formatPrice, formatDate, formatShortDate } from "@/lib/events-shared";

export async function getEvents() {
  return prisma.event.findMany({
    include: { category: true },
    orderBy: { date: "asc" },
  });
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: { category: true },
  });
}

export async function getEventsByCategory(slug: string) {
  return prisma.event.findMany({
    where: { category: { slug } },
    include: { category: true },
    orderBy: { date: "asc" },
  });
}

export async function getFeaturedEvents() {
  return prisma.event.findMany({
    where: { featured: true },
    include: { category: true },
    orderBy: { date: "asc" },
  });
}
