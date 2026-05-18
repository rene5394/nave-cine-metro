"use server";

import { prisma } from "@/lib/prisma";
import { createCheckoutLink, getCheckoutOrder } from "@/lib/n1co";

interface CartLineItem {
  eventId: string;
  screeningId: string;
  quantity: number;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function startCheckout(cartItems: CartLineItem[]) {
  if (cartItems.length === 0) {
    return { error: "El carrito está vacío" };
  }

  const eventIds = cartItems.map((item) => item.eventId);
  const screeningIds = cartItems.map((item) => item.screeningId);

  const [events, screenings] = await Promise.all([
    prisma.event.findMany({ where: { id: { in: eventIds } } }),
    prisma.screening.findMany({ where: { id: { in: screeningIds } } }),
  ]);

  // Validate all events + screenings exist and have enough tickets
  for (const item of cartItems) {
    const event = events.find((e) => e.id === item.eventId);
    if (!event) {
      return { error: `Evento no encontrado: ${item.eventId}` };
    }
    const screening = screenings.find(
      (s) => s.id === item.screeningId && s.eventId === item.eventId,
    );
    if (!screening) {
      return { error: `Función no encontrada para "${event.name}"` };
    }
    if (screening.availableTickets < item.quantity) {
      return {
        error: `No hay suficientes entradas para "${event.name}". Disponibles: ${screening.availableTickets}`,
      };
    }
  }

  // Compute total server-side
  const totalInCents = cartItems.reduce((sum, item) => {
    const event = events.find((e) => e.id === item.eventId)!;
    return sum + event.priceInCents * item.quantity;
  }, 0);

  // Create Order + OrderItems in DB
  const order = await prisma.order.create({
    data: {
      status: "PENDING",
      totalInCents,
      items: {
        create: cartItems.map((item) => {
          const event = events.find((e) => e.id === item.eventId)!;
          return {
            eventId: item.eventId,
            screeningId: item.screeningId,
            quantity: item.quantity,
            priceInCents: event.priceInCents,
          };
        }),
      },
    },
  });

  const first = cartItems[0];
  const firstEvent = events.find((e) => e.id === first.eventId)!;
  const firstScreening = screenings.find((s) => s.id === first.screeningId)!;

  const checkoutLink = await createCheckoutLink({
    orderName: firstEvent.name,
    orderReference: order.id,
    lineItems: cartItems.map((item) => {
      const event = events.find((e) => e.id === item.eventId)!;
      return {
        sku: event.sku,
        quantity: item.quantity,
        product: {
          name: event.name,
          price: event.priceInCents / 100,
          imageUrl: event.image ?? "",
          requiresShipping: false,
        },
      };
    }),
    metadata: [
      { name: "date", value: firstScreening.date },
      { name: "time", value: firstScreening.time },
      { name: "venue", value: firstEvent.venue },
    ],
    successUrl: `${BASE_URL}/payment-success?orderCode=PLACEHOLDER`,
    cancelUrl: `${BASE_URL}/checkout?cancelled=true`,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { n1coSessionId: checkoutLink.orderCode },
  });

  const successUrl = `${BASE_URL}/payment-success?orderCode=${checkoutLink.orderCode}`;

  return {
    paymentLinkUrl: checkoutLink.paymentLinkUrl,
    orderId: order.id,
    successUrl,
  };
}

export async function verifyPayment(orderCode: string) {
  const n1coOrder = await getCheckoutOrder(orderCode);

  const localOrder = await prisma.order.findFirst({
    where: { n1coSessionId: orderCode },
    include: { items: true },
  });

  if (!localOrder) {
    return { status: "ERROR" as const, orderCode };
  }

  if (
    (n1coOrder.orderStatus === "PAID" || n1coOrder.orderStatus === "FINALIZED") &&
    localOrder.status === "PENDING"
  ) {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: localOrder.id },
        data: { status: "PAID" },
      }),
      ...localOrder.items.flatMap((item) =>
        item.screeningId
          ? [
              prisma.screening.update({
                where: { id: item.screeningId },
                data: { availableTickets: { decrement: item.quantity } },
              }),
            ]
          : [],
      ),
    ]);
    return { status: "PAID" as const, orderCode };
  }

  if (n1coOrder.orderStatus === "CANCELLED" && localOrder.status === "PENDING") {
    await prisma.order.update({
      where: { id: localOrder.id },
      data: { status: "CANCELLED" },
    });
    return { status: "CANCELLED" as const, orderCode };
  }

  return { status: n1coOrder.orderStatus, orderCode };
}
