import { prisma } from "@/lib/prisma";
import { EventStatus } from "@/lib/generated/prisma/enums";

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
    where: { status: EventStatus.ACTIVE },
    include: screeningsInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getEventById(id: string) {
  return prisma.event.findFirst({
    where: { id, status: EventStatus.ACTIVE },
    include: screeningsInclude,
  });
}

export async function getEventsByCategory(slug: string) {
  return prisma.event.findMany({
    where: { category: { slug }, status: EventStatus.ACTIVE },
    include: screeningsInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getFeaturedEvents() {
  return prisma.event.findMany({
    where: { featured: true, status: EventStatus.ACTIVE },
    include: screeningsInclude,
    orderBy: { createdAt: "desc" },
  });
}
