"use server"

import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

interface CartLineItem {
  eventId: string
  quantity: number
}

export async function startCheckoutSession(cartItems: CartLineItem[]) {
  const eventIds = cartItems.map((item) => item.eventId)
  const events = await prisma.event.findMany({
    where: { id: { in: eventIds } },
  })

  const lineItems = cartItems.map((item) => {
    const event = events.find((e) => e.id === item.eventId)
    if (!event) {
      throw new Error(`Event with id "${item.eventId}" not found`)
    }
    return {
      price_data: {
        currency: "usd",
        product_data: {
          name: event.name,
          description: `${event.date} ${event.time}`,
        },
        unit_amount: event.priceInCents,
      },
      quantity: item.quantity,
    }
  })

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    line_items: lineItems,
    mode: "payment",
  })

  return session.client_secret
}
