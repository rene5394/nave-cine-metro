'use server'

import { prisma } from '@/lib/prisma'
import { createCheckoutLink, getCheckoutOrder } from '@/lib/n1co'

interface CartLineItem {
  eventId: string
  quantity: number
}

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

export async function startCheckout(cartItems: CartLineItem[]) {
  const eventIds = cartItems.map((item) => item.eventId)
  const events = await prisma.event.findMany({
    where: { id: { in: eventIds } },
  })

  // Validate all events exist and have enough tickets
  for (const item of cartItems) {
    const event = events.find((e) => e.id === item.eventId)
    if (!event) {
      return { error: `Evento no encontrado: ${item.eventId}` }
    }
    if (event.availableTickets < item.quantity) {
      return {
        error: `No hay suficientes entradas para "${event.name}". Disponibles: ${event.availableTickets}`,
      }
    }
  }

  // Compute total server-side
  const totalInCents = cartItems.reduce((sum, item) => {
    const event = events.find((e) => e.id === item.eventId)!
    return sum + event.priceInCents * item.quantity
  }, 0)

  // Create Order + OrderItems in DB
  const order = await prisma.order.create({
    data: {
      status: 'PENDING',
      totalInCents,
      items: {
        create: cartItems.map((item) => {
          const event = events.find((e) => e.id === item.eventId)!
          return {
            eventId: item.eventId,
            quantity: item.quantity,
            priceInCents: event.priceInCents,
          }
        }),
      },
    },
  })

  // Create N1co checkout link with SKU-based lineItems
  const checkoutLink = await createCheckoutLink({
    orderName: 'EntradasYa Order',
    orderReference: order.id,
    lineItems: cartItems.map((item) => {
      const event = events.find((e) => e.id === item.eventId)!
      return { sku: event.sku, quantity: item.quantity }
    }),
    successUrl: `${BASE_URL}/payment-success?orderCode=PLACEHOLDER`,
    cancelUrl: `${BASE_URL}/checkout?cancelled=true`,
    metadata: [{ key: 'orderId', value: order.id }],
  })

  // Update order with n1co orderCode
  await prisma.order.update({
    where: { id: order.id },
    data: { n1coSessionId: checkoutLink.orderCode },
  })

  // Build the real successUrl with the orderCode
  const successUrl = `${BASE_URL}/payment-success?orderCode=${checkoutLink.orderCode}`

  return {
    paymentLinkUrl: checkoutLink.paymentLinkUrl,
    orderId: order.id,
    successUrl,
  }
}

export async function verifyPayment(orderCode: string) {
  const n1coOrder = await getCheckoutOrder(orderCode)

  const localOrder = await prisma.order.findFirst({
    where: { n1coSessionId: orderCode },
    include: { items: true },
  })

  if (!localOrder) {
    return { status: 'ERROR' as const, orderCode }
  }

  if (
    (n1coOrder.orderStatus === 'PAID' ||
      n1coOrder.orderStatus === 'FINALIZED') &&
    localOrder.status === 'PENDING'
  ) {
    // Update order to PAID and decrement available tickets
    await prisma.$transaction([
      prisma.order.update({
        where: { id: localOrder.id },
        data: { status: 'PAID' },
      }),
      ...localOrder.items.map((item) =>
        prisma.event.update({
          where: { id: item.eventId },
          data: { availableTickets: { decrement: item.quantity } },
        }),
      ),
    ])
    return { status: 'PAID' as const, orderCode }
  }

  if (n1coOrder.orderStatus === 'CANCELLED' && localOrder.status === 'PENDING') {
    await prisma.order.update({
      where: { id: localOrder.id },
      data: { status: 'CANCELLED' },
    })
    return { status: 'CANCELLED' as const, orderCode }
  }

  return { status: n1coOrder.orderStatus, orderCode }
}
