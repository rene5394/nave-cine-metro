import { prismaMock } from "@/tests/mocks/prisma";
import { describe, it, expect } from "vitest";
import {
  getEvents,
  getEventById,
  getEventsByCategory,
  getFeaturedEvents,
  formatPrice as formatPriceFromEvents,
  formatDate as formatDateFromEvents,
  formatShortDate as formatShortDateFromEvents,
  formatTime12h as formatTime12hFromEvents,
  type TicketEvent,
} from "@/lib/events";
import {
  formatPrice as formatPriceFromShared,
  formatDate as formatDateFromShared,
  formatShortDate as formatShortDateFromShared,
  formatTime12h as formatTime12hFromShared,
} from "@/lib/events-shared";
import { EventStatus } from "@/lib/generated/prisma/enums";
import { makeCategory, makeEvent, makeScreening } from "@/tests/fixtures/factories";

const screeningsInclude = {
  category: true,
  screenings: { orderBy: [{ date: "asc" as const }, { time: "asc" as const }] },
};

describe("getEvents", () => {
  it("queries active events with category and screenings included, newest first", async () => {
    const events = [makeEvent()];
    prismaMock.event.findMany.mockResolvedValue(events);

    await getEvents();

    expect(prismaMock.event.findMany).toHaveBeenCalledWith({
      where: { status: EventStatus.ACTIVE },
      include: screeningsInclude,
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns whatever findMany resolves", async () => {
    const events = [makeEvent(), makeEvent({ id: "other-id" })];
    prismaMock.event.findMany.mockResolvedValue(events);

    const result = await getEvents();

    expect(result).toBe(events);
  });
});

describe("getEventById", () => {
  it("queries a single active event by id, with category and screenings included", async () => {
    const event = makeEvent();
    prismaMock.event.findFirst.mockResolvedValue(event);

    await getEventById("33333333-3333-3333-3333-333333333333");

    expect(prismaMock.event.findFirst).toHaveBeenCalledWith({
      where: { id: "33333333-3333-3333-3333-333333333333", status: EventStatus.ACTIVE },
      include: screeningsInclude,
    });
  });

  it("returns the event when findFirst resolves one", async () => {
    const event = makeEvent();
    prismaMock.event.findFirst.mockResolvedValue(event);

    const result = await getEventById(event.id);

    expect(result).toBe(event);
  });

  it("returns null when no matching active event is found", async () => {
    prismaMock.event.findFirst.mockResolvedValue(null);

    const result = await getEventById("does-not-exist");

    expect(result).toBeNull();
  });
});

describe("getEventsByCategory", () => {
  it("queries active events filtered by category slug, newest first", async () => {
    const events = [makeEvent()];
    prismaMock.event.findMany.mockResolvedValue(events);

    await getEventsByCategory("conciertos");

    expect(prismaMock.event.findMany).toHaveBeenCalledWith({
      where: { category: { slug: "conciertos" }, status: EventStatus.ACTIVE },
      include: screeningsInclude,
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns whatever findMany resolves", async () => {
    const events = [makeEvent()];
    prismaMock.event.findMany.mockResolvedValue(events);

    const result = await getEventsByCategory("conciertos");

    expect(result).toBe(events);
  });
});

describe("getFeaturedEvents", () => {
  it("queries active, featured events, newest first", async () => {
    const events = [makeEvent({ featured: true })];
    prismaMock.event.findMany.mockResolvedValue(events);

    await getFeaturedEvents();

    expect(prismaMock.event.findMany).toHaveBeenCalledWith({
      where: { featured: true, status: EventStatus.ACTIVE },
      include: screeningsInclude,
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns whatever findMany resolves", async () => {
    const events = [makeEvent({ featured: true })];
    prismaMock.event.findMany.mockResolvedValue(events);

    const result = await getFeaturedEvents();

    expect(result).toBe(events);
  });
});

describe("barrel re-exports from events-shared", () => {
  it("re-exports formatPrice with identical output from both import paths", () => {
    expect(formatPriceFromEvents(1999)).toBe(formatPriceFromShared(1999));
    expect(formatPriceFromEvents(1999)).toBe("$19.99");
  });

  it("re-exports formatDate with identical output from both import paths", () => {
    expect(formatDateFromEvents("2026-12-31")).toBe(formatDateFromShared("2026-12-31"));
  });

  it("re-exports formatShortDate with identical output from both import paths", () => {
    expect(formatShortDateFromEvents("2026-12-31")).toBe(formatShortDateFromShared("2026-12-31"));
  });

  it("re-exports formatTime12h with identical output from both import paths", () => {
    expect(formatTime12hFromEvents("13:05")).toBe(formatTime12hFromShared("13:05"));
  });
});

describe("TicketEvent re-export (compile-time check)", () => {
  it("accepts an event enriched with category and screenings", () => {
    const ticketEvent: TicketEvent = {
      ...makeEvent(),
      category: makeCategory(),
      screenings: [makeScreening()],
    };

    // The assignment above only type-checks if TicketEvent is re-exported
    // with the expected shape; this also doubles as a runtime smoke check.
    expect(ticketEvent.category.slug).toBe("conciertos");
    expect(ticketEvent.screenings).toHaveLength(1);
  });
});
