"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, ShoppingBag, Ticket } from "lucide-react"
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { useCart } from "@/lib/cart-context"
import { formatPrice, formatShortDate } from "@/lib/events"
import { startCheckoutSession } from "@/app/actions/stripe"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
const ACCENT = "#9e5656"

export default function CheckoutPage() {
  const { items, totalItems, totalPriceInCents } = useCart()
  const router = useRouter()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/")
      return
    }
    const cartItems = items.map((item) => ({
      eventId: item.event.id,
      quantity: item.quantity,
    }))
    startCheckoutSession(cartItems)
      .then((secret) => {
        setClientSecret(secret)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [items, router])

  const fetchClientSecret = useCallback(() => {
    const cartItems = items.map((item) => ({
      eventId: item.event.id,
      quantity: item.quantity,
    }))
    return startCheckoutSession(cartItems)
  }, [items])

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header style={{ backgroundColor: "#333333" }} className="sticky top-0 z-40 shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-white transition-opacity hover:opacity-80">
            <Ticket className="h-6 w-6" style={{ color: ACCENT }} />
            <span className="text-xl font-bold tracking-tight">EntradasYa</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a eventos
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finalizar Compra</h1>
          <p className="mt-1 text-gray-500">
            {totalItems} {totalItems === 1 ? "entrada" : "entradas"} en tu orden
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_480px]">
          {/* Left — Stripe Checkout */}
          <div className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-200">
              {/* Section header */}
              <div style={{ backgroundColor: ACCENT }} className="px-6 py-4">
                <h2 className="text-base font-bold text-white">Datos de Pago</h2>
                <p className="text-xs text-white/70 mt-0.5">Procesado de forma segura con Stripe</p>
              </div>

              <div className="p-2">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-24">
                    <div
                      className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200"
                      style={{ borderTopColor: ACCENT }}
                    />
                    <p className="text-sm text-gray-500">Preparando tu pago seguro...</p>
                  </div>
                ) : clientSecret ? (
                  <EmbeddedCheckoutProvider
                    stripe={stripePromise}
                    options={{ clientSecret }}
                  >
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                    <p className="text-sm text-gray-500">
                      No se pudo cargar el formulario de pago.
                    </p>
                    <Link
                      href="/"
                      style={{ backgroundColor: ACCENT }}
                      className="rounded-lg px-5 py-2 text-sm font-bold text-white hover:shadow-lg transition-all"
                    >
                      Volver al inicio
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right — Order Summary */}
          <div className="order-1 lg:order-2">
            <div className="sticky top-24 space-y-4">
              {/* Order Summary Card */}
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-200">
                {/* Header */}
                <div style={{ backgroundColor: ACCENT }} className="flex items-center gap-3 px-6 py-4">
                  <ShoppingBag className="h-5 w-5 text-white" />
                  <h2 className="text-base font-bold text-white">Resumen de Orden</h2>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={item.event.id} className="flex gap-4 px-5 py-4">
                      {/* Poster */}
                      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-200 shadow-sm">
                        <Image
                          src={item.event.image || "/placeholder.svg"}
                          alt={item.event.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex flex-1 flex-col justify-between gap-1 min-w-0">
                        <div>
                          <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
                            {item.event.name}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{formatShortDate(item.event.date)} · {item.event.time}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span
                            className="rounded px-2 py-0.5 text-xs font-bold text-white"
                            style={{ backgroundColor: ACCENT }}
                          >
                            x{item.quantity}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {formatPrice(item.event.priceInCents * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Subtotal ({totalItems} {totalItems === 1 ? "entrada" : "entradas"})</span>
                    <span>{formatPrice(totalPriceInCents)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Cargo por servicio</span>
                    <span className="text-green-600 font-medium">Gratis</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                    <span className="text-base font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold" style={{ color: ACCENT }}>
                      {formatPrice(totalPriceInCents)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                  Pago 100% seguro
                </p>
                <div className="flex flex-wrap gap-3">
                  {["Visa", "Mastercard", "Amex", "Apple Pay"].map((brand) => (
                    <span
                      key={brand}
                      className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600"
                    >
                      {brand}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  Tus datos están protegidos con encriptación SSL de 256-bit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
