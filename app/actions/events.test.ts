// Import order matters: the prisma mock must be registered before
// "@/app/actions/events" is imported, so the "@/lib/prisma" mock wins the
// module-resolution race. See tests/mocks/prisma.ts for details.
import { prismaMock } from "@/tests/mocks/prisma";
import { requireActiveAdminMock } from "@/tests/mocks/authz";

vi.mock("@/lib/n1co", () => ({
  createProducts: vi.fn(),
  updateProducts: vi.fn(),
  getLatestProduct: vi.fn(),
}));
vi.mock("@/lib/s3", () => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createProducts, updateProducts, getLatestProduct } from "@/lib/n1co";
import { uploadImage, deleteImage } from "@/lib/s3";
import { EventStatus } from "@/lib/generated/prisma/enums";
import {
  getEvents,
  getEventsStatusCounts,
  deleteEvent,
  setEventStatus,
  createEvent,
  updateEvent,
} from "@/app/actions/events";
import { makeSession, makeEvent, makeCategory, makeScreening } from "@/tests/fixtures/factories";

const createProductsMock = vi.mocked(createProducts);
const updateProductsMock = vi.mocked(updateProducts);
const getLatestProductMock = vi.mocked(getLatestProduct);
const uploadImageMock = vi.mocked(uploadImage);
const deleteImageMock = vi.mocked(deleteImage);
const revalidatePathMock = vi.mocked(revalidatePath);
const afterMock = vi.mocked(after);

const EVENT_ID = "33333333-3333-3333-3333-333333333333";
const CATEGORY_ID = "22222222-2222-2222-2222-222222222222";
const ADMIN = () => makeSession({ role: "ADMIN" });

// Dates safely in the past/future of *any* actual wall-clock "today" this
// suite might run on, used for tests that don't need a pinned system time.
const FAR_FUTURE_DATE = "2099-01-01";
const FAR_PAST_DATE = "2020-01-01";

function makeEventFormData(
  overrides: Record<string, string> = {},
  screenings: unknown[] = [],
  image?: File,
) {
  const fd = new FormData();
  fd.set("sku", "EVT-1");
  fd.set("name", "Test Event");
  fd.set("description", "desc");
  fd.set("longDescription", "long desc");
  fd.set("categoryId", CATEGORY_ID);
  fd.set("venue", "Venue");
  fd.set("city", "City");
  fd.set("priceInCents", "5000");
  fd.set("screenings", JSON.stringify(screenings));
  Object.entries(overrides).forEach(([k, v]) => fd.set(k, v));
  if (image) fd.set("image", image);
  return fd;
}

function testImage() {
  return new File(["fake-image-bytes"], "photo.jpg", { type: "image/jpeg" });
}

function emptyImage() {
  return new File([], "empty.jpg", { type: "image/jpeg" });
}

describe("getEvents", () => {
  beforeEach(() => {
    prismaMock.event.findMany.mockResolvedValue([]);
    prismaMock.event.count.mockResolvedValue(0);
  });

  describe("pagination clamping", () => {
    it.each([
      { page: 0, expectedSkip: 0 },
      { page: -5, expectedSkip: 0 },
      { page: 2.7, expectedSkip: 10 },
    ])("clamps/floors page=$page (expected skip=$expectedSkip)", async ({ page, expectedSkip }) => {
      await getEvents({ page });
      expect(prismaMock.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: expectedSkip, take: 10 }),
      );
      expect(prismaMock.event.count).toHaveBeenCalledWith(expect.objectContaining({}));
    });

    it.each([
      { pageSize: 500, expectedTake: 100 },
      { pageSize: 0, expectedTake: 1 },
      { pageSize: -3, expectedTake: 1 },
      { pageSize: 2.7, expectedTake: 2 },
    ])(
      "clamps/floors pageSize=$pageSize (expected take=$expectedTake)",
      async ({ pageSize, expectedTake }) => {
        await getEvents({ pageSize });
        expect(prismaMock.event.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: expectedTake }),
        );
      },
    );

    it("returns page/pageSize in the result using the clamped values, not the raw input", async () => {
      const result = await getEvents({ page: -5, pageSize: 500 });
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(100);
    });

    it("computes totalPages from totalCount and pageSize, floored at 1", async () => {
      prismaMock.event.count.mockResolvedValue(25);
      const result = await getEvents({ pageSize: 10 });
      expect(result).toEqual({ events: [], totalCount: 25, page: 1, pageSize: 10, totalPages: 3 });
    });

    it("floors totalPages at 1 even when totalCount is 0", async () => {
      const result = await getEvents({});
      expect(result.totalPages).toBe(1);
    });
  });

  describe("includeInactive / admin gating", () => {
    it("widens where.status to ACTIVE+DEACTIVE when includeInactive is true and the caller is an active admin", async () => {
      requireActiveAdminMock.mockResolvedValue(ADMIN());

      await getEvents({ includeInactive: true });

      expect(requireActiveAdminMock).toHaveBeenCalledTimes(1);
      expect(prismaMock.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [EventStatus.ACTIVE, EventStatus.DEACTIVE] },
          }),
        }),
      );
    });

    it("keeps where.status as ACTIVE only when includeInactive is true but the caller is not an admin", async () => {
      requireActiveAdminMock.mockResolvedValue(null);

      await getEvents({ includeInactive: true });

      expect(prismaMock.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: EventStatus.ACTIVE }) }),
      );
    });

    it("does not call requireActiveAdmin when includeInactive is omitted", async () => {
      await getEvents({});

      expect(requireActiveAdminMock).not.toHaveBeenCalled();
      expect(prismaMock.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: EventStatus.ACTIVE }) }),
      );
    });

    it("does not call requireActiveAdmin when includeInactive is explicitly false", async () => {
      await getEvents({ includeInactive: false });

      expect(requireActiveAdminMock).not.toHaveBeenCalled();
    });
  });

  describe("filters", () => {
    it("adds a case-insensitive name filter, trimming whitespace", async () => {
      await getEvents({ name: "  Rock  " });

      expect(prismaMock.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ name: { contains: "Rock" } }),
        }),
      );
    });

    it("omits the name filter when name is blank/whitespace-only", async () => {
      await getEvents({ name: "   " });

      const where = prismaMock.event.findMany.mock.calls[0][0]?.where;
      expect(where).not.toHaveProperty("name");
    });

    it("adds a categoryId filter", async () => {
      await getEvents({ categoryId: CATEGORY_ID });

      expect(prismaMock.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ categoryId: CATEGORY_ID }) }),
      );
    });

    it("adds featured: true when featured is true", async () => {
      await getEvents({ featured: true });

      expect(prismaMock.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ featured: true }) }),
      );
    });

    it("omits the featured filter entirely when featured is false (not set to false)", async () => {
      await getEvents({ featured: false });

      const where = prismaMock.event.findMany.mock.calls[0][0]?.where;
      expect(where).not.toHaveProperty("featured");
    });

    it("composes name, categoryId, and featured filters together", async () => {
      await getEvents({ name: "Rock", categoryId: CATEGORY_ID, featured: true });

      expect(prismaMock.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: { contains: "Rock" },
            categoryId: CATEGORY_ID,
            featured: true,
            status: EventStatus.ACTIVE,
          },
        }),
      );
    });
  });
});

describe("getEventsStatusCounts", () => {
  it("returns zero counts without querying prisma.event.count when the caller is unauthorized", async () => {
    requireActiveAdminMock.mockResolvedValue(null);

    const result = await getEventsStatusCounts();

    expect(result).toEqual({ active: 0, inactive: 0 });
    expect(prismaMock.event.count).not.toHaveBeenCalled();
  });

  it("returns active/inactive counts for an active admin", async () => {
    requireActiveAdminMock.mockResolvedValue(ADMIN());
    prismaMock.event.count.mockResolvedValueOnce(7).mockResolvedValueOnce(3);

    const result = await getEventsStatusCounts();

    expect(prismaMock.event.count).toHaveBeenCalledWith({ where: { status: EventStatus.ACTIVE } });
    expect(prismaMock.event.count).toHaveBeenCalledWith({
      where: { status: EventStatus.DEACTIVE },
    });
    expect(result).toEqual({ active: 7, inactive: 3 });
  });
});

describe("deleteEvent", () => {
  it("returns 'No autorizado' when the caller is not an active admin", async () => {
    requireActiveAdminMock.mockResolvedValue(null);

    const result = await deleteEvent(EVENT_ID);

    expect(result).toEqual({ error: "No autorizado" });
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });

  it("returns 'Event not found' when the event doesn't exist", async () => {
    requireActiveAdminMock.mockResolvedValue(ADMIN());
    prismaMock.event.findUnique.mockResolvedValue(null);

    const result = await deleteEvent(EVENT_ID);

    expect(result).toEqual({ error: "Event not found" });
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });

  it("soft-deletes the event and revalidates the 3 event views", async () => {
    requireActiveAdminMock.mockResolvedValue(ADMIN());
    prismaMock.event.findUnique.mockResolvedValue(makeEvent());
    prismaMock.event.update.mockResolvedValue(makeEvent({ status: "DELETED" }));

    const result = await deleteEvent(EVENT_ID);

    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: EVENT_ID },
      data: { status: EventStatus.DELETED },
    });
    expect(revalidatePathMock).toHaveBeenCalledTimes(3);
    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/admin/panel-de-control");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/admin/eventos");
    expect(result).toEqual({ success: true });
  });
});

describe("setEventStatus", () => {
  it("returns 'No autorizado' when the caller is not an active admin", async () => {
    requireActiveAdminMock.mockResolvedValue(null);

    const result = await setEventStatus(EVENT_ID, "ACTIVE");

    expect(result).toEqual({ error: "No autorizado" });
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });

  it("returns 'Estado inválido' for a status outside the ACTIVE/DEACTIVE enum (e.g. DELETED)", async () => {
    requireActiveAdminMock.mockResolvedValue(ADMIN());

    const result = await setEventStatus(EVENT_ID, "DELETED" as "ACTIVE" | "DEACTIVE");

    expect(result).toEqual({ error: "Estado inválido" });
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });

  it("returns a generic error instead of throwing when prisma.event.update rejects", async () => {
    requireActiveAdminMock.mockResolvedValue(ADMIN());
    prismaMock.event.update.mockRejectedValue(new Error("db connection lost"));

    const result = await setEventStatus(EVENT_ID, "ACTIVE");

    expect(result).toEqual({ error: "No se pudo actualizar el estado del evento" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("updates the status and revalidates views on success", async () => {
    requireActiveAdminMock.mockResolvedValue(ADMIN());
    prismaMock.event.update.mockResolvedValue(makeEvent({ status: "DEACTIVE" }));

    const result = await setEventStatus(EVENT_ID, "DEACTIVE");

    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: EVENT_ID },
      data: { status: EventStatus.DEACTIVE },
    });
    expect(revalidatePathMock).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ success: true });
  });
});

describe("createEvent", () => {
  it("returns a form-level 'No autorizado' error when the caller is not an active admin", async () => {
    requireActiveAdminMock.mockResolvedValue(null);

    const result = await createEvent(makeEventFormData({}, [], testImage()));

    expect(result).toEqual({ error: { form: ["No autorizado"] } });
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("returns an image-required error when no image file is provided", async () => {
    requireActiveAdminMock.mockResolvedValue(ADMIN());

    const result = await createEvent(makeEventFormData());

    expect(result).toEqual({ error: { image: ["Image file is required"] } });
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("returns an image-required error when the image file is empty (size 0)", async () => {
    requireActiveAdminMock.mockResolvedValue(ADMIN());

    const result = await createEvent(makeEventFormData({}, [], emptyImage()));

    expect(result).toEqual({ error: { image: ["Image file is required"] } });
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("returns zod field errors when a required field (sku) is missing", async () => {
    requireActiveAdminMock.mockResolvedValue(ADMIN());

    const result = await createEvent(makeEventFormData({ sku: "" }, [], testImage()));

    expect(result.error).toHaveProperty("sku");
    expect((result as { error: Record<string, string[]> }).error.sku.length).toBeGreaterThan(0);
    expect(prismaMock.category.findUnique).not.toHaveBeenCalled();
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("returns a categoryId error when the category doesn't exist", async () => {
    requireActiveAdminMock.mockResolvedValue(ADMIN());
    prismaMock.category.findUnique.mockResolvedValue(null);

    const result = await createEvent(makeEventFormData({}, [], testImage()));

    expect(result).toEqual({ error: { categoryId: ["La categoría seleccionada no existe"] } });
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("allows a screening dated before today", async () => {
    requireActiveAdminMock.mockResolvedValue(ADMIN());
    prismaMock.category.findUnique.mockResolvedValue(makeCategory());
    uploadImageMock.mockResolvedValue("https://cdn.test.example.com/events/new.jpg");
    prismaMock.event.create.mockResolvedValue(makeEvent());
    prismaMock.screening.createMany.mockResolvedValue({ count: 1 });

    const result = await createEvent(
      makeEventFormData(
        {},
        [{ date: FAR_PAST_DATE, time: "20:00", availableTickets: 10 }],
        testImage(),
      ),
    );

    expect(result).not.toHaveProperty("error");
    expect(prismaMock.event.create).toHaveBeenCalled();
  });

  describe("happy path", () => {
    function setupHappyPath() {
      requireActiveAdminMock.mockResolvedValue(ADMIN());
      prismaMock.category.findUnique.mockResolvedValue(makeCategory({ slug: "conciertos" }));
      uploadImageMock.mockResolvedValue("https://cdn.test.example.com/events/evt-1.jpg");
      const createdEvent = makeEvent({ id: EVENT_ID, sku: "EVT-1", n1coProductId: null });
      prismaMock.event.create.mockResolvedValue(createdEvent);
      prismaMock.screening.createMany.mockResolvedValue({ count: 1 });
      return createdEvent;
    }

    it("creates the event, creates screenings, revalidates views, and returns the event", async () => {
      const createdEvent = setupHappyPath();

      const result = await createEvent(
        makeEventFormData(
          {},
          [{ date: FAR_FUTURE_DATE, time: "20:00", availableTickets: 50 }],
          testImage(),
        ),
      );

      expect(uploadImageMock).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringMatching(/^events\/EVT-1-\d+\.jpg$/),
        "image/jpeg",
      );
      expect(prismaMock.event.create).toHaveBeenCalledWith({
        data: {
          sku: "EVT-1",
          name: "Test Event",
          description: "desc",
          longDescription: "long desc",
          categoryId: CATEGORY_ID,
          venue: "Venue",
          city: "City",
          priceInCents: 5000,
          featured: false,
          image: "https://cdn.test.example.com/events/evt-1.jpg",
          n1coProductId: null,
        },
      });
      expect(prismaMock.screening.createMany).toHaveBeenCalledWith({
        data: [{ eventId: EVENT_ID, date: FAR_FUTURE_DATE, time: "20:00", availableTickets: 50 }],
      });
      expect(revalidatePathMock).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ event: createdEvent });
    });

    it("does not call screening.createMany when there are no screenings", async () => {
      setupHappyPath();

      await createEvent(makeEventFormData({}, [], testImage()));

      expect(prismaMock.screening.createMany).not.toHaveBeenCalled();
    });

    it("includes n1coProductId in eventData when syncN1co is true and an n1coProductId is provided", async () => {
      setupHappyPath();

      await createEvent(
        makeEventFormData({ syncN1co: "true", n1coProductId: "manual-123" }, [], testImage()),
      );

      expect(prismaMock.event.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ n1coProductId: "manual-123" }) }),
      );
    });

    describe("after() N1CO sync callback", () => {
      it("calls createProducts with a payload shaped by toN1COProduct (stock summed across screenings)", async () => {
        setupHappyPath();

        await createEvent(
          makeEventFormData(
            {},
            [
              { date: FAR_FUTURE_DATE, time: "20:00", availableTickets: 50 },
              { date: FAR_FUTURE_DATE, time: "22:00", availableTickets: 30 },
            ],
            testImage(),
          ),
        );

        // `after`'s signature is generic (`after<T>(task: AfterTask<T>)`),
        // which makes the raw mock-call-args type a `Promise<T> | (() =>
        // T | Promise<T>)` union that TS won't let us call directly. The
        // source always passes an async closure, never a bare Promise, so
        // narrowing to a callable here reflects real usage.
        const afterCallback = afterMock.mock.calls.at(-1)?.[0] as (() => Promise<void>) | undefined;
        expect(afterCallback).toBeDefined();

        getLatestProductMock.mockResolvedValue(null);
        createProductsMock.mockResolvedValue(undefined);

        await afterCallback?.();

        expect(createProductsMock).toHaveBeenCalledWith([
          {
            sku: "EVT-1",
            name: "Test Event",
            description: "desc",
            stock: 80,
            price: 50,
            collections: ["conciertos"],
            image: "https://cdn.test.example.com/events/evt-1.jpg",
            enable: true,
            salesChannel: ["PaymentLink"],
            locations: [{ locationCode: "Venue", isAvailable: true }],
            modifiers: [],
            images: ["https://cdn.test.example.com/events/evt-1.jpg"],
          },
        ]);
      });

      it("omits the stock key entirely when there are no screenings (total stock is 0)", async () => {
        setupHappyPath();

        await createEvent(makeEventFormData({}, [], testImage()));

        // `after`'s signature is generic (`after<T>(task: AfterTask<T>)`),
        // which makes the raw mock-call-args type a `Promise<T> | (() =>
        // T | Promise<T>)` union that TS won't let us call directly. The
        // source always passes an async closure, never a bare Promise, so
        // narrowing to a callable here reflects real usage.
        const afterCallback = afterMock.mock.calls.at(-1)?.[0] as (() => Promise<void>) | undefined;
        getLatestProductMock.mockResolvedValue(null);
        createProductsMock.mockResolvedValue(undefined);

        await afterCallback?.();

        const product = createProductsMock.mock.calls[0][0][0];
        expect(product).not.toHaveProperty("stock");
      });

      it("looks up and persists the latest N1CO productId when the created event has no n1coProductId", async () => {
        setupHappyPath();

        await createEvent(makeEventFormData({}, [], testImage()));

        // `after`'s signature is generic (`after<T>(task: AfterTask<T>)`),
        // which makes the raw mock-call-args type a `Promise<T> | (() =>
        // T | Promise<T>)` union that TS won't let us call directly. The
        // source always passes an async closure, never a bare Promise, so
        // narrowing to a callable here reflects real usage.
        const afterCallback = afterMock.mock.calls.at(-1)?.[0] as (() => Promise<void>) | undefined;
        createProductsMock.mockResolvedValue(undefined);
        getLatestProductMock.mockResolvedValue({ productId: 555, name: "x", sku: "EVT-1" });
        prismaMock.event.update.mockResolvedValue(
          makeEvent({ id: EVENT_ID, n1coProductId: "555" }),
        );

        await afterCallback?.();

        expect(getLatestProductMock).toHaveBeenCalledTimes(1);
        expect(prismaMock.event.update).toHaveBeenCalledWith({
          where: { id: EVENT_ID },
          data: { n1coProductId: "555" },
        });
      });

      it("does not persist an n1coProductId when getLatestProduct resolves null", async () => {
        setupHappyPath();

        await createEvent(makeEventFormData({}, [], testImage()));

        // `after`'s signature is generic (`after<T>(task: AfterTask<T>)`),
        // which makes the raw mock-call-args type a `Promise<T> | (() =>
        // T | Promise<T>)` union that TS won't let us call directly. The
        // source always passes an async closure, never a bare Promise, so
        // narrowing to a callable here reflects real usage.
        const afterCallback = afterMock.mock.calls.at(-1)?.[0] as (() => Promise<void>) | undefined;
        createProductsMock.mockResolvedValue(undefined);
        getLatestProductMock.mockResolvedValue(null);

        await afterCallback?.();

        expect(prismaMock.event.update).not.toHaveBeenCalled();
      });

      it("skips getLatestProduct and prisma.event.update when the created event already has an n1coProductId", async () => {
        requireActiveAdminMock.mockResolvedValue(ADMIN());
        prismaMock.category.findUnique.mockResolvedValue(makeCategory({ slug: "conciertos" }));
        uploadImageMock.mockResolvedValue("https://cdn.test.example.com/events/evt-1.jpg");
        prismaMock.event.create.mockResolvedValue(
          makeEvent({ id: EVENT_ID, n1coProductId: "existing-123" }),
        );

        await createEvent(makeEventFormData({}, [], testImage()));

        // `after`'s signature is generic (`after<T>(task: AfterTask<T>)`),
        // which makes the raw mock-call-args type a `Promise<T> | (() =>
        // T | Promise<T>)` union that TS won't let us call directly. The
        // source always passes an async closure, never a bare Promise, so
        // narrowing to a callable here reflects real usage.
        const afterCallback = afterMock.mock.calls.at(-1)?.[0] as (() => Promise<void>) | undefined;
        createProductsMock.mockResolvedValue(undefined);

        await afterCallback?.();

        expect(createProductsMock).toHaveBeenCalled();
        expect(getLatestProductMock).not.toHaveBeenCalled();
        expect(prismaMock.event.update).not.toHaveBeenCalled();
      });

      it("swallows errors from the N1CO sync without throwing or rejecting", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        setupHappyPath();

        await createEvent(makeEventFormData({}, [], testImage()));

        // `after`'s signature is generic (`after<T>(task: AfterTask<T>)`),
        // which makes the raw mock-call-args type a `Promise<T> | (() =>
        // T | Promise<T>)` union that TS won't let us call directly. The
        // source always passes an async closure, never a bare Promise, so
        // narrowing to a callable here reflects real usage.
        const afterCallback = afterMock.mock.calls.at(-1)?.[0] as (() => Promise<void>) | undefined;
        createProductsMock.mockRejectedValue(new Error("network down"));

        await expect(afterCallback?.()).resolves.not.toThrow();

        warnSpy.mockRestore();
      });
    });
  });

  describe("known gap: screening.createMany failing after event.create succeeds", () => {
    it("rolls back the uploaded image but does NOT delete the already-created event row (documented current behavior, not a fix)", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      requireActiveAdminMock.mockResolvedValue(ADMIN());
      prismaMock.category.findUnique.mockResolvedValue(makeCategory());
      uploadImageMock.mockResolvedValue("https://cdn.test.example.com/events/evt-1.jpg");
      deleteImageMock.mockResolvedValue(undefined);
      prismaMock.event.create.mockResolvedValue(makeEvent());
      prismaMock.screening.createMany.mockRejectedValue(new Error("db error"));

      const result = await createEvent(
        makeEventFormData(
          {},
          [{ date: FAR_FUTURE_DATE, time: "20:00", availableTickets: 10 }],
          testImage(),
        ),
      );

      expect(prismaMock.event.create).toHaveBeenCalledTimes(1);
      expect(deleteImageMock).toHaveBeenCalledWith("https://cdn.test.example.com/events/evt-1.jpg");
      // KNOWN GAP: there is no prisma.event.delete call anywhere in the source's
      // catch block, so the event row created above is never rolled back even
      // though its uploaded image was just deleted. This test documents that
      // as-is behavior; it is not something to "fix" here.
      expect(prismaMock.event.delete).not.toHaveBeenCalled();
      expect(result).toEqual({
        error: { form: ["Ocurrió un error al guardar el evento. Intenta de nuevo."] },
      });

      errorSpy.mockRestore();
    });
  });

  describe("Prisma error -> user-facing message mapping", () => {
    beforeEach(() => {
      requireActiveAdminMock.mockResolvedValue(ADMIN());
      prismaMock.category.findUnique.mockResolvedValue(makeCategory());
      uploadImageMock.mockResolvedValue("https://cdn.test.example.com/events/evt-1.jpg");
      deleteImageMock.mockResolvedValue(undefined);
    });

    it("maps P2002 with a string target containing 'sku' to a SKU-specific conflict message", async () => {
      prismaMock.event.create.mockRejectedValue({
        code: "P2002",
        meta: { target: "events_sku_key" },
      });

      const result = await createEvent(makeEventFormData({}, [], testImage()));

      expect(result).toEqual({ error: { sku: ["Ya existe un evento con este SKU"] } });
      expect(deleteImageMock).toHaveBeenCalled();
    });

    it("maps P2002 with an array target containing 'sku' to the same SKU-specific message", async () => {
      prismaMock.event.create.mockRejectedValue({
        code: "P2002",
        meta: { target: ["sku"] },
      });

      const result = await createEvent(makeEventFormData({}, [], testImage()));

      expect(result).toEqual({ error: { sku: ["Ya existe un evento con este SKU"] } });
    });

    it("maps an unrelated P2002 target to the generic conflict message", async () => {
      prismaMock.event.create.mockRejectedValue({
        code: "P2002",
        meta: { target: "events_name_key" },
      });

      const result = await createEvent(makeEventFormData({}, [], testImage()));

      expect(result).toEqual({
        error: { form: ["Ya existe un evento con uno de los datos ingresados"] },
      });
    });

    it("maps P2025 to an 'event doesn't exist' message", async () => {
      prismaMock.event.create.mockRejectedValue({ code: "P2025" });

      const result = await createEvent(makeEventFormData({}, [], testImage()));

      expect(result).toEqual({ error: { form: ["El evento no existe o fue eliminado"] } });
    });

    it("maps P2003 to a 'category doesn't exist' message", async () => {
      prismaMock.event.create.mockRejectedValue({ code: "P2003" });

      const result = await createEvent(makeEventFormData({}, [], testImage()));

      expect(result).toEqual({ error: { form: ["La categoría seleccionada no existe"] } });
    });

    it("falls back to a generic message for an unrecognized error shape", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      prismaMock.event.create.mockRejectedValue(new Error("boom"));

      const result = await createEvent(makeEventFormData({}, [], testImage()));

      expect(result).toEqual({
        error: { form: ["Ocurrió un error al guardar el evento. Intenta de nuevo."] },
      });
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});

describe("updateEvent", () => {
  beforeEach(() => {
    requireActiveAdminMock.mockResolvedValue(ADMIN());
    prismaMock.category.findUnique.mockResolvedValue(makeCategory({ slug: "conciertos" }));
    prismaMock.event.findUniqueOrThrow.mockResolvedValue(makeEvent());
    prismaMock.screening.findMany.mockResolvedValue([]);
    prismaMock.event.update.mockResolvedValue(makeEvent());
    prismaMock.screening.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("returns a form-level 'No autorizado' error when the caller is not an active admin", async () => {
    requireActiveAdminMock.mockResolvedValue(null);

    const result = await updateEvent(EVENT_ID, makeEventFormData({}, []));

    expect(result).toEqual({ error: { form: ["No autorizado"] } });
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });

  it("returns zod field errors when a required field (sku) is missing, without requiring an image", async () => {
    const result = await updateEvent(EVENT_ID, makeEventFormData({ sku: "" }, []));

    expect(result.error).toHaveProperty("sku");
    expect(prismaMock.category.findUnique).not.toHaveBeenCalled();
  });

  it("returns a categoryId error when the category doesn't exist", async () => {
    prismaMock.category.findUnique.mockResolvedValue(null);

    const result = await updateEvent(EVENT_ID, makeEventFormData({}, []));

    expect(result).toEqual({ error: { categoryId: ["La categoría seleccionada no existe"] } });
    expect(prismaMock.event.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  describe("past-dated screenings are allowed", () => {
    // Pin "today" to a specific instant. The test environment's TZ
    // (America/El_Salvador, UTC-6, no DST) means a UTC instant near midnight
    // could roll the local calendar date backward, so we pin to local noon
    // (18:00 UTC = 12:00 local) to stay safely inside 2026-01-01 regardless
    // of exactly how far off UTC the local zone is.
    const TODAY = "2026-01-01";
    const YESTERDAY = "2025-12-31";
    const SCREENING_ID = "44444444-4444-4444-4444-444444444444";

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${TODAY}T18:00:00Z`));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("allows a NEW screening (no id) with a past date", async () => {
      const result = await updateEvent(
        EVENT_ID,
        makeEventFormData({}, [{ date: YESTERDAY, time: "20:00", availableTickets: 10 }]),
      );

      expect(result).not.toHaveProperty("error");
    });

    it("allows an EXISTING screening (matched by id) to remain past-dated when its date is unchanged", async () => {
      prismaMock.screening.findMany.mockResolvedValue([
        makeScreening({ id: SCREENING_ID, eventId: EVENT_ID, date: YESTERDAY }),
      ]);
      prismaMock.screening.update.mockResolvedValue(makeScreening({ id: SCREENING_ID }));

      const result = await updateEvent(
        EVENT_ID,
        makeEventFormData({}, [
          { id: SCREENING_ID, date: YESTERDAY, time: "20:00", availableTickets: 10 },
        ]),
      );

      expect(result).not.toHaveProperty("error");
      expect(prismaMock.screening.update).toHaveBeenCalledWith({
        where: { id: SCREENING_ID },
        data: { date: YESTERDAY, time: "20:00", availableTickets: 10 },
      });
    });

    it("allows a screening dated exactly today", async () => {
      const result = await updateEvent(
        EVENT_ID,
        makeEventFormData({}, [{ date: TODAY, time: "20:00", availableTickets: 10 }]),
      );

      expect(result).not.toHaveProperty("error");
    });
  });

  describe("image replacement", () => {
    it("deletes the old image and uploads a new one when a new image file is provided", async () => {
      const existingEvent = makeEvent({ image: "https://cdn.test.example.com/events/old.jpg" });
      prismaMock.event.findUniqueOrThrow.mockResolvedValue(existingEvent);
      uploadImageMock.mockResolvedValue("https://cdn.test.example.com/events/new.jpg");
      prismaMock.event.update.mockResolvedValue(
        makeEvent({ image: "https://cdn.test.example.com/events/new.jpg" }),
      );

      await updateEvent(EVENT_ID, makeEventFormData({}, [], testImage()));

      expect(deleteImageMock).toHaveBeenCalledWith("https://cdn.test.example.com/events/old.jpg");
      expect(uploadImageMock).toHaveBeenCalled();
      expect(prismaMock.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ image: "https://cdn.test.example.com/events/new.jpg" }),
        }),
      );
    });

    it("keeps the existing image and skips upload/delete when no new image file is provided", async () => {
      const existingEvent = makeEvent({ image: "https://cdn.test.example.com/events/old.jpg" });
      prismaMock.event.findUniqueOrThrow.mockResolvedValue(existingEvent);
      prismaMock.event.update.mockResolvedValue(existingEvent);

      await updateEvent(EVENT_ID, makeEventFormData({}, []));

      expect(deleteImageMock).not.toHaveBeenCalled();
      expect(uploadImageMock).not.toHaveBeenCalled();
      expect(prismaMock.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ image: "https://cdn.test.example.com/events/old.jpg" }),
        }),
      );
    });

    it("treats an empty (size 0) image file the same as no new file", async () => {
      const existingEvent = makeEvent({ image: "https://cdn.test.example.com/events/old.jpg" });
      prismaMock.event.findUniqueOrThrow.mockResolvedValue(existingEvent);
      prismaMock.event.update.mockResolvedValue(existingEvent);

      await updateEvent(EVENT_ID, makeEventFormData({}, [], emptyImage()));

      expect(deleteImageMock).not.toHaveBeenCalled();
      expect(uploadImageMock).not.toHaveBeenCalled();
    });
  });

  describe("screening diffing", () => {
    const SCREENING_ID_1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const SCREENING_ID_2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

    it("updates screenings with an id, creates screenings without an id, and deletes ids missing from the incoming array", async () => {
      prismaMock.screening.findMany.mockResolvedValue([
        makeScreening({ id: SCREENING_ID_1, eventId: EVENT_ID }),
        makeScreening({ id: SCREENING_ID_2, eventId: EVENT_ID }),
      ]);
      prismaMock.screening.update.mockResolvedValue(makeScreening({ id: SCREENING_ID_1 }));
      prismaMock.screening.create.mockResolvedValue(makeScreening());

      await updateEvent(
        EVENT_ID,
        makeEventFormData({}, [
          { id: SCREENING_ID_1, date: FAR_FUTURE_DATE, time: "20:00", availableTickets: 20 },
          { date: "2099-02-01", time: "21:00", availableTickets: 30 },
        ]),
      );

      expect(prismaMock.screening.deleteMany).toHaveBeenCalledWith({
        where: { eventId: EVENT_ID, id: { notIn: [SCREENING_ID_1] } },
      });
      expect(prismaMock.screening.update).toHaveBeenCalledWith({
        where: { id: SCREENING_ID_1 },
        data: { date: FAR_FUTURE_DATE, time: "20:00", availableTickets: 20 },
      });
      expect(prismaMock.screening.create).toHaveBeenCalledWith({
        data: { eventId: EVENT_ID, date: "2099-02-01", time: "21:00", availableTickets: 30 },
      });
    });

    it("deletes all existing screenings for the event (no notIn filter) when no incoming screening has an id", async () => {
      prismaMock.screening.findMany.mockResolvedValue([
        makeScreening({ id: SCREENING_ID_1, eventId: EVENT_ID }),
      ]);
      prismaMock.screening.create.mockResolvedValue(makeScreening());

      await updateEvent(
        EVENT_ID,
        makeEventFormData({}, [{ date: FAR_FUTURE_DATE, time: "20:00", availableTickets: 5 }]),
      );

      expect(prismaMock.screening.deleteMany).toHaveBeenCalledWith({
        where: { eventId: EVENT_ID },
      });
    });
  });

  describe("error rollback", () => {
    it("rolls back the newly uploaded image when prisma.event.update rejects", async () => {
      const existingEvent = makeEvent({ image: "https://cdn.test.example.com/events/old.jpg" });
      prismaMock.event.findUniqueOrThrow.mockResolvedValue(existingEvent);
      uploadImageMock.mockResolvedValue("https://cdn.test.example.com/events/new.jpg");
      prismaMock.event.update.mockRejectedValue({ code: "P2025" });

      const result = await updateEvent(EVENT_ID, makeEventFormData({}, [], testImage()));

      expect(deleteImageMock).toHaveBeenCalledWith("https://cdn.test.example.com/events/new.jpg");
      expect(result).toEqual({ error: { form: ["El evento no existe o fue eliminado"] } });
    });

    it("does not roll back any image when prisma.event.update rejects and no new image was provided", async () => {
      const existingEvent = makeEvent({ image: "https://cdn.test.example.com/events/old.jpg" });
      prismaMock.event.findUniqueOrThrow.mockResolvedValue(existingEvent);
      prismaMock.event.update.mockRejectedValue({ code: "P2025" });

      const result = await updateEvent(EVENT_ID, makeEventFormData({}, []));

      expect(deleteImageMock).not.toHaveBeenCalled();
      expect(result).toEqual({ error: { form: ["El evento no existe o fue eliminado"] } });
    });

    it("does not additionally roll back the image when the newly uploaded url happens to equal the existing image url", async () => {
      const existingEvent = makeEvent({ image: "https://cdn.test.example.com/events/same.jpg" });
      prismaMock.event.findUniqueOrThrow.mockResolvedValue(existingEvent);
      uploadImageMock.mockResolvedValue("https://cdn.test.example.com/events/same.jpg");
      prismaMock.event.update.mockRejectedValue({ code: "P2025" });

      await updateEvent(EVENT_ID, makeEventFormData({}, [], testImage()));

      // deleteImage is always called once upfront to remove the old image
      // before uploading the replacement (see the "image replacement"
      // describe block above). Because the "new" url happens to match the
      // existing url here, the catch block's rollback guard
      // (imageUrl !== existing.image) is false, so there is no SECOND
      // (rollback) deleteImage call.
      expect(deleteImageMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("after() N1CO sync callback", () => {
    it("calls updateProducts when the updated event already has an n1coProductId", async () => {
      prismaMock.event.update.mockResolvedValue(makeEvent({ n1coProductId: "prod-123" }));

      await updateEvent(EVENT_ID, makeEventFormData({}, []));

      // See the comment on the analogous line in the createEvent tests above
      // for why this cast is necessary given `after`'s generic signature.
      const afterCallback = afterMock.mock.calls.at(-1)?.[0] as (() => Promise<void>) | undefined;
      expect(afterCallback).toBeDefined();
      updateProductsMock.mockResolvedValue(undefined);

      await afterCallback?.();

      expect(updateProductsMock).toHaveBeenCalledWith([
        expect.objectContaining({ sku: "EVT-1", collections: ["conciertos"] }),
      ]);
      expect(createProductsMock).not.toHaveBeenCalled();
    });

    it("calls createProducts when the updated event has no n1coProductId", async () => {
      prismaMock.event.update.mockResolvedValue(makeEvent({ n1coProductId: null }));

      await updateEvent(EVENT_ID, makeEventFormData({}, []));

      // See the comment on the analogous line in the createEvent tests above
      // for why this cast is necessary given `after`'s generic signature.
      const afterCallback = afterMock.mock.calls.at(-1)?.[0] as (() => Promise<void>) | undefined;
      createProductsMock.mockResolvedValue(undefined);

      await afterCallback?.();

      expect(createProductsMock).toHaveBeenCalledWith([
        expect.objectContaining({ sku: "EVT-1", collections: ["conciertos"] }),
      ]);
      expect(updateProductsMock).not.toHaveBeenCalled();
    });

    it("swallows errors from the N1CO sync without throwing or rejecting", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      prismaMock.event.update.mockResolvedValue(makeEvent({ n1coProductId: null }));

      await updateEvent(EVENT_ID, makeEventFormData({}, []));

      // See the comment on the analogous line in the createEvent tests above
      // for why this cast is necessary given `after`'s generic signature.
      const afterCallback = afterMock.mock.calls.at(-1)?.[0] as (() => Promise<void>) | undefined;
      createProductsMock.mockRejectedValue(new Error("network down"));

      await expect(afterCallback?.()).resolves.not.toThrow();

      warnSpy.mockRestore();
    });
  });

  describe("happy path", () => {
    it("updates the event, revalidates views, and returns the event", async () => {
      const updatedEvent = makeEvent({ id: EVENT_ID });
      prismaMock.event.update.mockResolvedValue(updatedEvent);

      const result = await updateEvent(EVENT_ID, makeEventFormData({}, []));

      expect(prismaMock.event.update).toHaveBeenCalledWith({
        where: { id: EVENT_ID },
        data: expect.objectContaining({
          sku: "EVT-1",
          name: "Test Event",
          categoryId: CATEGORY_ID,
        }),
      });
      expect(revalidatePathMock).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ event: updatedEvent });
    });
  });
});
