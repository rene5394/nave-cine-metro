import { createPaymentSession } from "@/lib/n1co"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      items: Array<{ id: string; name: string; quantity: number; priceInCents: number }>
      totalInCents: number
    }

    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/payment-success`

    // Convert cents to actual currency amount
    const amountInCents = body.totalInCents
    const amount = amountInCents / 100

    const session = await createPaymentSession({
      amount,
      currency: "MXN",
      orderId: `order-${Date.now()}`,
      returnUrl,
      items: body.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.priceInCents / 100,
      })),
    })

    return NextResponse.json({
      sessionId: session.id,
      sessionToken: session.sessionToken,
      redirectUrl: session.redirectUrl,
    })
  } catch (error) {
    console.error("[v0] N1CO checkout error:", error)
    return NextResponse.json(
      { error: "Failed to create payment session" },
      { status: 500 }
    )
  }
}
