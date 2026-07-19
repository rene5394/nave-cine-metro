// Import order matters: the prisma mock must be registered before
// "@/app/actions/checkout" is imported, so the "@/lib/prisma" mock wins the
// module-resolution race. See tests/mocks/prisma.ts for details.
import { prismaMock, mockTransaction } from "@/tests/mocks/prisma";

vi.mock("@/lib/n1co", () => ({
  createCheckoutLink: vi.fn(),
  getCheckoutOrder: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendTicketsEmail: vi.fn(),
}));

import { startCheckout, verifyPayment, resendTicketsEmail } from "@/app/actions/checkout";
import { createCheckoutLink, getCheckoutOrder } from "@/lib/n1co";
import { sendTicketsEmail } from "@/lib/email";
import {
  makeEvent,
  makeScreening,
  makeOrder,
  makeOrderItem,
  makeTicket,
} from "@/tests/fixtures/factories";
import { OrderStatus } from "@/lib/generated/prisma/enums";
import type { N1COOrderStatus } from "@/lib/n1co";

const createCheckoutLinkMock = vi.mocked(createCheckoutLink);
const getCheckoutOrderMock = vi.mocked(getCheckoutOrder);
const sendTicketsEmailMock = vi.mocked(sendTicketsEmail);

const EVENT_ID_1 = "33333333-3333-3333-3333-333333333333";
const EVENT_ID_2 = "33333333-3333-3333-3333-333333333334";
const SCREENING_ID_1 = "44444444-4444-4444-4444-444444444444";
const SCREENING_ID_2 = "44444444-4444-4444-4444-444444444445";
const ORDER_ID = "55555555-5555-5555-5555-555555555555";
const ORDER_ITEM_ID = "66666666-6666-6666-6666-666666666666";
const ORDER_CODE = "N1CO-CODE-123";

/** Minimal valid N1COOrderStatus fixture; override per test. */
function makeN1coOrder(overrides: Partial<N1COOrderStatus> = {}): N1COOrderStatus {
  return {
    orderId: 1,
    orderCode: ORDER_CODE,
    orderReference: ORDER_ID,
    orderStatus: "PENDING",
    total: 100,
    ...overrides,
  };
}

/**
 * Builds the raw row shape returned by prisma.ticket.findMany inside
 * loadIssuedTickets (orderItem -> event/screening projections). Not a raw
 * Ticket row, so it can't come from makeTicket() alone.
 */
function makeIssuedTicketRow(
  overrides: {
    token?: string;
    eventName?: string;
    screening?: { date: string; time: string } | null;
  } = {},
) {
  const {
    token = "issued-token",
    eventName = "Rock Concert",
    screening = { date: "2026-12-31", time: "20:00" },
  } = overrides;
  return {
    ...makeTicket({ token }),
    orderItem: {
      event: { name: eventName },
      screening,
    },
  };
}

beforeEach(() => {
  mockTransaction();
});

describe("startCheckout", () => {
  it("returns an error for an empty cart without querying the database", async () => {
    const result = await startCheckout([]);

    expect(result).toEqual({ error: "El carrito está vacío" });
    expect(prismaMock.event.findMany).not.toHaveBeenCalled();
  });

  it("returns an error when a cart event id is not found among active events", async () => {
    prismaMock.event.findMany.mockResolvedValue([]);
    prismaMock.screening.findMany.mockResolvedValue([]);

    const result = await startCheckout([
      { eventId: "missing-event-id", screeningId: SCREENING_ID_1, quantity: 1 },
    ]);

    expect(result).toEqual({ error: "Evento no encontrado: missing-event-id" });
  });

  it("returns an error when no screening matches the cart item's screeningId at all", async () => {
    const event = makeEvent({ id: EVENT_ID_1, name: "Rock Concert" });
    prismaMock.event.findMany.mockResolvedValue([event]);
    prismaMock.screening.findMany.mockResolvedValue([]);

    const result = await startCheckout([
      { eventId: EVENT_ID_1, screeningId: SCREENING_ID_1, quantity: 1 },
    ]);

    expect(result).toEqual({ error: 'Función no encontrada para "Rock Concert"' });
  });

  it("returns an error when the matching screening id belongs to a different event", async () => {
    const event = makeEvent({ id: EVENT_ID_1, name: "Rock Concert" });
    // Same screening id, but eventId does not match the cart item's eventId.
    const screening = makeScreening({ id: SCREENING_ID_1, eventId: EVENT_ID_2 });
    prismaMock.event.findMany.mockResolvedValue([event]);
    prismaMock.screening.findMany.mockResolvedValue([screening]);

    const result = await startCheckout([
      { eventId: EVENT_ID_1, screeningId: SCREENING_ID_1, quantity: 1 },
    ]);

    expect(result).toEqual({ error: 'Función no encontrada para "Rock Concert"' });
  });

  it("returns an error when requested quantity exceeds availableTickets", async () => {
    const event = makeEvent({ id: EVENT_ID_1, name: "Rock Concert" });
    const screening = makeScreening({
      id: SCREENING_ID_1,
      eventId: EVENT_ID_1,
      availableTickets: 2,
    });
    prismaMock.event.findMany.mockResolvedValue([event]);
    prismaMock.screening.findMany.mockResolvedValue([screening]);

    const result = await startCheckout([
      { eventId: EVENT_ID_1, screeningId: SCREENING_ID_1, quantity: 5 },
    ]);

    expect(result).toEqual({
      error: 'No hay suficientes entradas para "Rock Concert". Disponibles: 2',
    });
  });

  it("creates the order server-side and returns a payment link for a valid single-item cart", async () => {
    const event = makeEvent({
      id: EVENT_ID_1,
      name: "Rock Concert",
      sku: "EVT-001",
      priceInCents: 5000,
      image: "https://cdn.example.com/rock.jpg",
      venue: "Main Hall",
    });
    const screening = makeScreening({
      id: SCREENING_ID_1,
      eventId: EVENT_ID_1,
      date: "2026-12-31",
      time: "20:00",
      availableTickets: 10,
    });
    prismaMock.event.findMany.mockResolvedValue([event]);
    prismaMock.screening.findMany.mockResolvedValue([screening]);
    prismaMock.order.create.mockResolvedValue(makeOrder({ id: ORDER_ID, totalInCents: 10000 }));
    createCheckoutLinkMock.mockResolvedValue({
      orderCode: ORDER_CODE,
      orderId: 1,
      paymentLinkUrl: "https://pay.example.com/abc",
    });

    const result = await startCheckout([
      { eventId: EVENT_ID_1, screeningId: SCREENING_ID_1, quantity: 2 },
    ]);

    // Total is computed server-side from the DB event's priceInCents, not
    // from any client-supplied price (CartLineItem carries no price field).
    expect(prismaMock.order.create).toHaveBeenCalledWith({
      data: {
        status: "PENDING",
        totalInCents: 10000,
        items: {
          create: [
            {
              eventId: EVENT_ID_1,
              screeningId: SCREENING_ID_1,
              quantity: 2,
              priceInCents: 5000,
            },
          ],
        },
      },
    });

    expect(createCheckoutLinkMock).toHaveBeenCalledWith({
      orderName: "Rock Concert",
      orderReference: ORDER_ID,
      lineItems: [
        {
          sku: "EVT-001",
          quantity: 2,
          product: {
            name: "Rock Concert",
            price: 50,
            imageUrl: "https://cdn.example.com/rock.jpg",
            requiresShipping: false,
          },
        },
      ],
      metadata: [
        { name: "orderId", value: ORDER_ID },
        { name: "date", value: "2026-12-31" },
        { name: "time", value: "20:00" },
        { name: "venue", value: "Main Hall" },
      ],
      successUrl: "http://localhost:3000/payment-success",
      cancelUrl: "http://localhost:3000/checkout?cancelled=true",
    });

    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: { n1coSessionId: ORDER_CODE },
    });

    expect(result).toEqual({ paymentLinkUrl: "https://pay.example.com/abc" });
  });

  it("uses only the FIRST cart line's event/screening for orderName and checkout-link metadata in a multi-item cart", async () => {
    const event1 = makeEvent({
      id: EVENT_ID_1,
      name: "Event One",
      sku: "SKU-1",
      priceInCents: 1000,
      venue: "Venue One",
    });
    const event2 = makeEvent({
      id: EVENT_ID_2,
      name: "Event Two",
      sku: "SKU-2",
      priceInCents: 2000,
      venue: "Venue Two",
    });
    const screening1 = makeScreening({
      id: SCREENING_ID_1,
      eventId: EVENT_ID_1,
      date: "2026-01-01",
      time: "10:00",
      availableTickets: 5,
    });
    const screening2 = makeScreening({
      id: SCREENING_ID_2,
      eventId: EVENT_ID_2,
      date: "2026-02-02",
      time: "22:00",
      availableTickets: 5,
    });
    prismaMock.event.findMany.mockResolvedValue([event1, event2]);
    prismaMock.screening.findMany.mockResolvedValue([screening1, screening2]);
    prismaMock.order.create.mockResolvedValue(makeOrder({ id: ORDER_ID }));
    createCheckoutLinkMock.mockResolvedValue({
      orderCode: ORDER_CODE,
      orderId: 2,
      paymentLinkUrl: "https://pay.example.com/xyz",
    });

    await startCheckout([
      { eventId: EVENT_ID_1, screeningId: SCREENING_ID_1, quantity: 1 },
      { eventId: EVENT_ID_2, screeningId: SCREENING_ID_2, quantity: 3 },
    ]);

    expect(createCheckoutLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderName: "Event One",
        metadata: [
          { name: "orderId", value: ORDER_ID },
          { name: "date", value: "2026-01-01" },
          { name: "time", value: "10:00" },
          { name: "venue", value: "Venue One" },
        ],
      }),
    );

    // But lineItems still reflects BOTH cart lines.
    const call = createCheckoutLinkMock.mock.calls[0][0];
    expect(call.lineItems).toEqual([
      {
        sku: "SKU-1",
        quantity: 1,
        product: {
          name: "Event One",
          price: 10,
          imageUrl: expect.any(String),
          requiresShipping: false,
        },
      },
      {
        sku: "SKU-2",
        quantity: 3,
        product: {
          name: "Event Two",
          price: 20,
          imageUrl: expect.any(String),
          requiresShipping: false,
        },
      },
    ]);
  });
});

describe("verifyPayment", () => {
  it("returns ERROR when no local order matches the orderCode", async () => {
    getCheckoutOrderMock.mockResolvedValue(makeN1coOrder({ orderStatus: "PAID" }));
    prismaMock.order.findFirst.mockResolvedValue(null);

    const result = await verifyPayment(ORDER_CODE);

    expect(result).toEqual({ status: "ERROR", orderCode: ORDER_CODE });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  describe("N1CO status PAID/FINALIZED with a local PENDING order", () => {
    function pendingLocalOrder(quantity = 3) {
      return {
        ...makeOrder({ id: ORDER_ID, status: OrderStatus.PENDING, n1coSessionId: ORDER_CODE }),
        items: [
          makeOrderItem({
            id: ORDER_ITEM_ID,
            orderId: ORDER_ID,
            eventId: EVENT_ID_1,
            screeningId: SCREENING_ID_1,
            quantity,
          }),
        ],
      };
    }

    it("runs the transaction, issues tickets with the right math, and sends the tickets email when the buyer's email is present", async () => {
      prismaMock.order.findFirst.mockResolvedValue(pendingLocalOrder(3) as never);
      getCheckoutOrderMock.mockResolvedValue(
        makeN1coOrder({
          orderStatus: "PAID",
          payment: { buyer: { email: "buyer@example.com", name: "Jane Buyer" } },
        }),
      );
      const issuedRows = [
        makeIssuedTicketRow({ token: "tok-1" }),
        makeIssuedTicketRow({ token: "tok-2" }),
        makeIssuedTicketRow({ token: "tok-3" }),
      ];
      prismaMock.ticket.findMany.mockResolvedValue(issuedRows as never);
      sendTicketsEmailMock.mockResolvedValue({ ok: true });

      const result = await verifyPayment(ORDER_CODE);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.order.update).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        data: { status: "PAID" },
      });

      // Ticket-creation math: quantity 3 -> 3 fresh-token entries, each tied
      // to the order item.
      expect(prismaMock.ticket.createMany).toHaveBeenCalledTimes(1);
      const createManyArg = prismaMock.ticket.createMany.mock.calls[0][0] as {
        data: Array<{ orderItemId: string; token: string }>;
      };
      expect(createManyArg.data).toHaveLength(3);
      for (const entry of createManyArg.data) {
        expect(entry.orderItemId).toBe(ORDER_ITEM_ID);
        expect(typeof entry.token).toBe("string");
        expect(entry.token.length).toBeGreaterThan(0);
      }
      // Tokens are freshly generated per ticket, not repeated.
      expect(new Set(createManyArg.data.map((d) => d.token)).size).toBe(3);

      // screeningId is present on the order item -> availableTickets decremented.
      expect(prismaMock.screening.update).toHaveBeenCalledWith({
        where: { id: SCREENING_ID_1 },
        data: { availableTickets: { decrement: 3 } },
      });

      expect(sendTicketsEmailMock).toHaveBeenCalledWith(ORDER_ID, {
        email: "buyer@example.com",
        name: "Jane Buyer",
      });

      expect(result).toEqual({
        status: "PAID",
        orderCode: ORDER_CODE,
        tickets: issuedRows.map((r) => ({
          token: r.token,
          eventName: r.orderItem.event.name,
          date: r.orderItem.screening!.date,
          time: r.orderItem.screening!.time,
        })),
        emailSent: true,
      });
    });

    it("sets emailSent: false when the buyer email is present but sendTicketsEmail resolves ok: false (proves emailSent reflects .ok, not hardcoded)", async () => {
      prismaMock.order.findFirst.mockResolvedValue(pendingLocalOrder(1) as never);
      getCheckoutOrderMock.mockResolvedValue(
        makeN1coOrder({
          orderStatus: "PAID",
          payment: { buyer: { email: "buyer@example.com", name: "Jane Buyer" } },
        }),
      );
      prismaMock.ticket.findMany.mockResolvedValue([makeIssuedTicketRow()] as never);
      sendTicketsEmailMock.mockResolvedValue({ ok: false, error: "RESEND_API_KEY no configurado" });

      const result = await verifyPayment(ORDER_CODE);

      expect(sendTicketsEmailMock).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ status: "PAID", orderCode: ORDER_CODE, emailSent: false });
    });

    it("treats FINALIZED the same as PAID and does NOT call the email sender when the buyer's email is absent", async () => {
      prismaMock.order.findFirst.mockResolvedValue(pendingLocalOrder(1) as never);
      getCheckoutOrderMock.mockResolvedValue(
        makeN1coOrder({ orderStatus: "FINALIZED", payment: { buyer: { name: "No Email Buyer" } } }),
      );
      prismaMock.ticket.findMany.mockResolvedValue([makeIssuedTicketRow()] as never);

      const result = await verifyPayment(ORDER_CODE);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(sendTicketsEmailMock).not.toHaveBeenCalled();
      expect(result).toMatchObject({ status: "PAID", orderCode: ORDER_CODE, emailSent: false });
    });

    it("does not decrement availableTickets when the order item has no screeningId", async () => {
      const localOrder = {
        ...makeOrder({ id: ORDER_ID, status: OrderStatus.PENDING, n1coSessionId: ORDER_CODE }),
        items: [
          makeOrderItem({
            id: ORDER_ITEM_ID,
            orderId: ORDER_ID,
            eventId: EVENT_ID_1,
            screeningId: null,
            quantity: 1,
          }),
        ],
      };
      prismaMock.order.findFirst.mockResolvedValue(localOrder as never);
      getCheckoutOrderMock.mockResolvedValue(makeN1coOrder({ orderStatus: "PAID" }));
      prismaMock.ticket.findMany.mockResolvedValue([makeIssuedTicketRow()] as never);

      await verifyPayment(ORDER_CODE);

      expect(prismaMock.ticket.createMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.screening.update).not.toHaveBeenCalled();
    });
  });

  it('marks a PENDING local order CANCELLED when N1CO reports "CANCELLED", without touching tickets', async () => {
    const localOrder = {
      ...makeOrder({ id: ORDER_ID, status: OrderStatus.PENDING, n1coSessionId: ORDER_CODE }),
      items: [makeOrderItem({ id: ORDER_ITEM_ID, orderId: ORDER_ID })],
    };
    prismaMock.order.findFirst.mockResolvedValue(localOrder as never);
    getCheckoutOrderMock.mockResolvedValue(makeN1coOrder({ orderStatus: "CANCELLED" }));

    const result = await verifyPayment(ORDER_CODE);

    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: { status: "CANCELLED" },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "CANCELLED", orderCode: ORDER_CODE });
  });

  describe("idempotent revisit (local order already PAID/REDEEMED)", () => {
    it("returns issued tickets straight from loadIssuedTickets without re-running the transaction, and reflects emailSentAt truthily", async () => {
      const localOrder = {
        ...makeOrder({
          id: ORDER_ID,
          status: OrderStatus.PAID,
          n1coSessionId: ORDER_CODE,
          emailSentAt: new Date("2026-07-01T00:00:00.000Z"),
        }),
        items: [makeOrderItem({ id: ORDER_ITEM_ID, orderId: ORDER_ID })],
      };
      prismaMock.order.findFirst.mockResolvedValue(localOrder as never);
      getCheckoutOrderMock.mockResolvedValue(makeN1coOrder({ orderStatus: "PAID" }));
      const issuedRows = [makeIssuedTicketRow({ token: "already-issued" })];
      prismaMock.ticket.findMany.mockResolvedValue(issuedRows as never);

      const result = await verifyPayment(ORDER_CODE);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(sendTicketsEmailMock).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: "PAID",
        orderCode: ORDER_CODE,
        tickets: [
          {
            token: "already-issued",
            eventName: "Rock Concert",
            date: "2026-12-31",
            time: "20:00",
          },
        ],
        emailSent: true,
      });
    });

    it("reports emailSent: false for a REDEEMED order that never had emailSentAt set", async () => {
      const localOrder = {
        ...makeOrder({
          id: ORDER_ID,
          status: OrderStatus.REDEEMED,
          n1coSessionId: ORDER_CODE,
          emailSentAt: null,
        }),
        items: [makeOrderItem({ id: ORDER_ITEM_ID, orderId: ORDER_ID })],
      };
      prismaMock.order.findFirst.mockResolvedValue(localOrder as never);
      getCheckoutOrderMock.mockResolvedValue(makeN1coOrder({ orderStatus: "PAID" }));
      prismaMock.ticket.findMany.mockResolvedValue([] as never);

      const result = await verifyPayment(ORDER_CODE);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: "PAID",
        orderCode: ORDER_CODE,
        tickets: [],
        emailSent: false,
      });
    });
  });

  it("falls back to passing through the raw N1CO orderStatus when no known branch matches", async () => {
    const localOrder = {
      ...makeOrder({ id: ORDER_ID, status: OrderStatus.PENDING, n1coSessionId: ORDER_CODE }),
      items: [makeOrderItem({ id: ORDER_ITEM_ID, orderId: ORDER_ID })],
    };
    prismaMock.order.findFirst.mockResolvedValue(localOrder as never);
    getCheckoutOrderMock.mockResolvedValue(makeN1coOrder({ orderStatus: "PENDING" }));

    const result = await verifyPayment(ORDER_CODE);

    expect(result).toEqual({ status: "PENDING", orderCode: ORDER_CODE });
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("resendTicketsEmail", () => {
  it("returns 'Orden no encontrada' when no order matches the orderCode", async () => {
    prismaMock.order.findFirst.mockResolvedValue(null);

    const result = await resendTicketsEmail(ORDER_CODE);

    expect(result).toEqual({ ok: false, error: "Orden no encontrada" });
    expect(getCheckoutOrderMock).not.toHaveBeenCalled();
  });

  it("returns 'La orden no está pagada' when the order status is neither PAID nor REDEEMED", async () => {
    prismaMock.order.findFirst.mockResolvedValue(
      makeOrder({ id: ORDER_ID, status: OrderStatus.PENDING }),
    );

    const result = await resendTicketsEmail(ORDER_CODE);

    expect(result).toEqual({ ok: false, error: "La orden no está pagada" });
    expect(getCheckoutOrderMock).not.toHaveBeenCalled();
  });

  it("returns 'N1co no provee email del comprador' when N1CO has no buyer email on file", async () => {
    prismaMock.order.findFirst.mockResolvedValue(
      makeOrder({ id: ORDER_ID, status: OrderStatus.PAID }),
    );
    getCheckoutOrderMock.mockResolvedValue(makeN1coOrder({ orderStatus: "PAID" }));

    const result = await resendTicketsEmail(ORDER_CODE);

    expect(result).toEqual({ ok: false, error: "N1co no provee email del comprador" });
    expect(sendTicketsEmailMock).not.toHaveBeenCalled();
  });

  it("delegates directly to sendTicketsEmail and returns exactly what it resolves", async () => {
    prismaMock.order.findFirst.mockResolvedValue(
      makeOrder({ id: ORDER_ID, status: OrderStatus.PAID }),
    );
    getCheckoutOrderMock.mockResolvedValue(
      makeN1coOrder({
        orderStatus: "PAID",
        payment: { buyer: { email: "buyer@example.com", name: "Jane Buyer" } },
      }),
    );
    const resolvedValue = { ok: true as const };
    sendTicketsEmailMock.mockResolvedValue(resolvedValue);

    const result = await resendTicketsEmail(ORDER_CODE);

    expect(sendTicketsEmailMock).toHaveBeenCalledWith(ORDER_ID, {
      email: "buyer@example.com",
      name: "Jane Buyer",
    });
    // Pure delegation: same reference, not just a deep-equal copy.
    expect(result).toBe(resolvedValue);
  });
});
