// Import order matters: the prisma mock must be registered before
// "@/app/actions/tickets" is imported, so the "@/lib/prisma" mock wins the
// module-resolution race. See tests/mocks/prisma.ts for details.
import { prismaMock, mockTransaction } from "@/tests/mocks/prisma";
import { getSessionMock } from "@/tests/mocks/auth-session";
import { redeemTicket } from "@/app/actions/tickets";
import { makeSession, makeTicket } from "@/tests/fixtures/factories";
import { Role, OrderStatus, TicketStatus } from "@/lib/generated/prisma/enums";

const EVENT_NAME = "Test Event";
const ORDER_ID = "55555555-5555-5555-5555-555555555555";

/**
 * Builds the query-result shape returned by tx.ticket.findUnique's `include`
 * clause in redeemTicket (orderItem -> event/screening/order projections).
 * This is not a raw Ticket row, so it can't come from makeTicket() alone.
 */
function makeTicketWithOrderItem(
  overrides: {
    ticket?: Partial<ReturnType<typeof makeTicket>>;
    orderStatus?: OrderStatus;
    eventName?: string;
    screening?: { date: string; time: string } | null;
  } = {},
) {
  const {
    ticket,
    orderStatus = OrderStatus.PAID,
    eventName = EVENT_NAME,
    screening = { date: "2026-12-31", time: "20:00" },
  } = overrides;

  return {
    ...makeTicket(ticket),
    orderItem: {
      event: { name: eventName },
      screening,
      order: { id: ORDER_ID, status: orderStatus },
    },
  };
}

beforeEach(() => {
  mockTransaction();
});

describe("redeemTicket", () => {
  describe("authorization", () => {
    it("returns UNAUTHORIZED when there is no session", async () => {
      getSessionMock.mockResolvedValue(null);

      const result = await redeemTicket({ token: "a".repeat(16) });

      expect(result).toEqual({ ok: false, code: "UNAUTHORIZED", message: "No autorizado" });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("returns UNAUTHORIZED when the session role is not ADMIN", async () => {
      getSessionMock.mockResolvedValue(makeSession({ role: Role.CLIENT }));

      const result = await redeemTicket({ token: "a".repeat(16) });

      expect(result).toEqual({ ok: false, code: "UNAUTHORIZED", message: "No autorizado" });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    // Regression-documenting test: redeemTicket only checks
    // `session.role === "ADMIN"` from the JWT via getSession() — unlike
    // requireActiveAdmin() (used by other actions such as app/actions/orders.ts
    // and app/actions/users.ts), it never re-checks the admin's live status in
    // the database. So a still-valid JWT for an admin who has SINCE been
    // deactivated will still succeed here. This test documents that known,
    // deliberately-preserved inconsistency rather than "fixing" it in source.
    it("succeeds for a valid ADMIN session even though no live DB user-status check exists (documents known getSession vs requireActiveAdmin inconsistency)", async () => {
      const token = "a".repeat(16);
      getSessionMock.mockResolvedValue(makeSession({ role: Role.ADMIN }));
      prismaMock.ticket.findUnique.mockResolvedValue(
        makeTicketWithOrderItem({ ticket: { status: TicketStatus.ISSUED, token } }) as never,
      );
      prismaMock.ticket.update.mockResolvedValue(
        makeTicket({
          status: TicketStatus.REDEEMED,
          redeemedAt: new Date("2026-07-18T12:00:00.000Z"),
        }),
      );
      prismaMock.ticket.count.mockResolvedValue(1);

      const result = await redeemTicket({ token });

      expect(result.ok).toBe(true);
    });
  });

  describe("input validation", () => {
    beforeEach(() => {
      getSessionMock.mockResolvedValue(makeSession({ role: Role.ADMIN }));
    });

    it("returns INVALID_INPUT when the token fails zod length bounds", async () => {
      const result = await redeemTicket({ token: "abc" });

      expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: "Token inválido" });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("with a valid ADMIN session and a valid token", () => {
    const token = "a".repeat(16);

    beforeEach(() => {
      getSessionMock.mockResolvedValue(makeSession({ role: Role.ADMIN }));
    });

    it("returns NOT_FOUND when the ticket does not exist", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      const result = await redeemTicket({ token });

      expect(result).toEqual({ ok: false, code: "NOT_FOUND", message: "Ticket no encontrado" });
    });

    it("returns ORDER_CANCELLED when the ticket's order was cancelled", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(
        makeTicketWithOrderItem({ orderStatus: OrderStatus.CANCELLED }) as never,
      );

      const result = await redeemTicket({ token });

      expect(result).toEqual({ ok: false, code: "ORDER_CANCELLED", message: "Orden cancelada" });
      expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    });

    it("returns ALREADY_REDEEMED when the ticket was already redeemed", async () => {
      const redeemedAt = new Date("2026-07-01T10:00:00.000Z");
      prismaMock.ticket.findUnique.mockResolvedValue(
        makeTicketWithOrderItem({
          ticket: { status: TicketStatus.REDEEMED, redeemedAt },
        }) as never,
      );

      const result = await redeemTicket({ token });

      expect(result).toEqual({
        ok: false,
        code: "ALREADY_REDEEMED",
        message: "Este ticket ya fue canjeado",
        eventName: EVENT_NAME,
        redeemedAt,
      });
      expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    });

    it("marks the ticket REDEEMED but does not touch the order when other tickets remain ISSUED", async () => {
      const redeemedAt = new Date("2026-07-18T12:00:00.000Z");
      prismaMock.ticket.findUnique.mockResolvedValue(
        makeTicketWithOrderItem({ ticket: { status: TicketStatus.ISSUED, token } }) as never,
      );
      prismaMock.ticket.update.mockResolvedValue(
        makeTicket({ status: TicketStatus.REDEEMED, redeemedAt }),
      );
      prismaMock.ticket.count.mockResolvedValue(2);

      const result = await redeemTicket({ token });

      expect(prismaMock.ticket.update).toHaveBeenCalledWith({
        where: { id: expect.any(String) },
        data: { status: TicketStatus.REDEEMED, redeemedAt: expect.any(Date) },
      });
      expect(prismaMock.order.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        ok: true,
        ticket: {
          eventName: EVENT_NAME,
          date: "2026-12-31",
          time: "20:00",
          redeemedAt,
        },
      });
    });

    it("marks the order REDEEMED when this was the last ISSUED ticket", async () => {
      const redeemedAt = new Date("2026-07-18T12:00:00.000Z");
      prismaMock.ticket.findUnique.mockResolvedValue(
        makeTicketWithOrderItem({ ticket: { status: TicketStatus.ISSUED, token } }) as never,
      );
      prismaMock.ticket.update.mockResolvedValue(
        makeTicket({ status: TicketStatus.REDEEMED, redeemedAt }),
      );
      prismaMock.ticket.count.mockResolvedValue(0);

      const result = await redeemTicket({ token });

      expect(prismaMock.order.update).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        data: { status: OrderStatus.REDEEMED },
      });
      expect(result.ok).toBe(true);
    });

    it("returns null date/time when the ticket's order item has no linked screening", async () => {
      const redeemedAt = new Date("2026-07-18T12:00:00.000Z");
      prismaMock.ticket.findUnique.mockResolvedValue(
        makeTicketWithOrderItem({
          ticket: { status: TicketStatus.ISSUED, token },
          screening: null,
        }) as never,
      );
      prismaMock.ticket.update.mockResolvedValue(
        makeTicket({ status: TicketStatus.REDEEMED, redeemedAt }),
      );
      prismaMock.ticket.count.mockResolvedValue(1);

      const result = await redeemTicket({ token });

      expect(result).toEqual({
        ok: true,
        ticket: {
          eventName: EVENT_NAME,
          date: null,
          time: null,
          redeemedAt,
        },
      });
    });
  });
});
