import { prisma } from "@/lib/prisma";

export {
  type TicketEvent,
  formatPrice,
  formatDate,
  formatShortDate,
  formatTime12h,
} from "@/lib/events-shared";

const screeningsInclude = {
  category: true,
  screenings: { orderBy: [{ date: "asc" as const }, { time: "asc" as const }] },
};

export async function getEvents() {
  return prisma.event.findMany({
    include: screeningsInclude,
    orderBy: { date: "asc" },
  });
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: screeningsInclude,
  });
}

export async function getEventsByCategory(slug: string) {
  return prisma.event.findMany({
    where: { category: { slug } },
    include: screeningsInclude,
    orderBy: { date: "asc" },
  });
}

export async function getFeaturedEvents() {
  return prisma.event.findMany({
    where: { featured: true },
    include: screeningsInclude,
    orderBy: { date: "asc" },
  });
}
