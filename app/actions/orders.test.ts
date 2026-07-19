// Import order matters: the prisma mock must be registered before
// "@/app/actions/orders" is imported, so the "@/lib/prisma" mock wins the
// module-resolution race. See tests/mocks/prisma.ts for details.
import { prismaMock } from "@/tests/mocks/prisma";
import { requireActiveAdminMock } from "@/tests/mocks/authz";
import { getOrders } from "@/app/actions/orders";
import { makeSession, makeOrder } from "@/tests/fixtures/factories";

const VALID_EVENT_ID = "33333333-3333-3333-3333-333333333333";

const INCLUDE = {
  user: { select: { email: true, name: true } },
  items: {
    include: {
      event: { select: { id: true, name: true, sku: true } },
      screening: true,
    },
  },
};

describe("getOrders", () => {
  describe("authorization", () => {
    it("returns 'No autorizado' when there is no active admin session, without querying the database", async () => {
      requireActiveAdminMock.mockResolvedValue(null);

      const result = await getOrders();

      expect(result).toEqual({ ok: false, error: "No autorizado" });
      expect(prismaMock.order.findMany).not.toHaveBeenCalled();
      expect(prismaMock.order.count).not.toHaveBeenCalled();
    });
  });

  describe("input validation", () => {
    beforeEach(() => {
      requireActiveAdminMock.mockResolvedValue(makeSession());
    });

    it("returns 'Filtros inválidos' when eventId is not a valid uuid", async () => {
      const result = await getOrders({ eventId: "not-a-uuid" });

      expect(result).toEqual({ ok: false, error: "Filtros inválidos" });
      expect(prismaMock.order.findMany).not.toHaveBeenCalled();
      expect(prismaMock.order.count).not.toHaveBeenCalled();
    });

    it("returns 'Filtros inválidos' when page is 0", async () => {
      const result = await getOrders({ page: 0 });

      expect(result).toEqual({ ok: false, error: "Filtros inválidos" });
      expect(prismaMock.order.findMany).not.toHaveBeenCalled();
    });

    it("returns 'Filtros inválidos' when pageSize exceeds the max of 100", async () => {
      const result = await getOrders({ pageSize: 101 });

      expect(result).toEqual({ ok: false, error: "Filtros inválidos" });
      expect(prismaMock.order.findMany).not.toHaveBeenCalled();
    });
  });

  describe("with a valid admin session", () => {
    beforeEach(() => {
      requireActiveAdminMock.mockResolvedValue(makeSession());
      prismaMock.order.findMany.mockResolvedValue([]);
      prismaMock.order.count.mockResolvedValue(0);
    });

    it("applies default page (1) and pageSize (20) when input is an empty object", async () => {
      await getOrders({});

      expect(prismaMock.order.findMany).toHaveBeenCalledWith({
        where: {},
        include: INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      });
      expect(prismaMock.order.count).toHaveBeenCalledWith({ where: {} });
    });

    it("applies default page and pageSize when called with no arguments at all", async () => {
      await getOrders();

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it("computes skip/take from a non-default page and pageSize", async () => {
      await getOrders({ page: 3, pageSize: 10 });

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it("filters by eventId via items.some.eventId when eventId is given", async () => {
      await getOrders({ eventId: VALID_EVENT_ID });

      const expectedWhere = { items: { some: { eventId: VALID_EVENT_ID } } };
      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
      expect(prismaMock.order.count).toHaveBeenCalledWith({ where: expectedWhere });
    });

    describe("date range filtering", () => {
      it("sets only 'gte' on createdAt when only startDate is given", async () => {
        await getOrders({ startDate: "2026-01-01" });

        expect(prismaMock.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { createdAt: { gte: new Date("2026-01-01T00:00:00Z") } },
          }),
        );
      });

      it("sets only 'lte' on createdAt when only endDate is given", async () => {
        await getOrders({ endDate: "2026-01-31" });

        expect(prismaMock.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { createdAt: { lte: new Date("2026-01-31T23:59:59Z") } },
          }),
        );
      });

      it("sets both 'gte' and 'lte' on createdAt when both dates are given", async () => {
        await getOrders({ startDate: "2026-01-01", endDate: "2026-01-31" });

        expect(prismaMock.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              createdAt: {
                gte: new Date("2026-01-01T00:00:00Z"),
                lte: new Date("2026-01-31T23:59:59Z"),
              },
            },
          }),
        );
      });

      it("omits the createdAt key from where entirely when neither date is given", async () => {
        await getOrders({});

        expect(prismaMock.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: {} }),
        );
        const [findManyArgs] = prismaMock.order.findMany.mock.calls[0];
        expect(findManyArgs?.where).not.toHaveProperty("createdAt");
      });
    });

    describe("totalPages", () => {
      it("is 1 (never 0) when the total count is 0", async () => {
        prismaMock.order.count.mockResolvedValue(0);

        const result = await getOrders({ pageSize: 20 });

        expect(result).toMatchObject({ ok: true, totalPages: 1 });
      });

      it("rounds up when total is not an exact multiple of pageSize", async () => {
        prismaMock.order.count.mockResolvedValue(45);

        const result = await getOrders({ pageSize: 20 });

        expect(result).toMatchObject({ ok: true, totalPages: 3 });
      });

      it("computes an exact page count when total is a multiple of pageSize", async () => {
        prismaMock.order.count.mockResolvedValue(40);

        const result = await getOrders({ pageSize: 20 });

        expect(result).toMatchObject({ ok: true, totalPages: 2 });
      });
    });

    it("returns ok:true with orders, total, page, pageSize, and totalPages on the happy path", async () => {
      const orders = [makeOrder()];
      prismaMock.order.findMany.mockResolvedValue(orders as never);
      prismaMock.order.count.mockResolvedValue(1);

      const result = await getOrders({ page: 2, pageSize: 5 });

      expect(result).toEqual({
        ok: true,
        orders,
        total: 1,
        page: 2,
        pageSize: 5,
        totalPages: 1,
      });
    });
  });
});
