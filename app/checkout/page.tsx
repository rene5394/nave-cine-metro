"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Calendar, Loader2, Lock, ShoppingBag, Ticket } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatPrice, formatShortDate, formatTime12h } from "@/lib/events-shared";
import { startCheckout } from "@/app/actions/checkout";

const ACCENT = "#9e5656";

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageContent />
    </Suspense>
  );
}

function CheckoutPageContent() {
  const { items, totalItems, totalPriceInCents } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled") === "true";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0 && !loading) {
    router.replace("/");
    return null;
  }

  async function handleCheckout() {
    setError(null);
    setLoading(true);
    try {
      const cartItems = items.map((item) => ({
        eventId: item.event.id,
        screeningId: item.screening.id,
        quantity: item.quantity,
      }));

      const result = await startCheckout(cartItems);

      if ("error" in result) {
        setError(result.error as string);
        setLoading(false);
        return;
      }

      window.location.href = result.paymentLinkUrl as string;
    } catch {
      setError("Ocurrió un error al procesar tu orden. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header style={{ backgroundColor: "#333333" }} className="sticky top-0 z-40 shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-white transition-opacity hover:opacity-80"
          >
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

      <main className="mx-auto max-w-2xl px-4 py-10 md:px-6">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finalizar Compra</h1>
          <p className="mt-1 text-gray-500">
            {totalItems} {totalItems === 1 ? "entrada" : "entradas"} en tu orden
          </p>
        </div>

        {/* Cancellation Banner */}
        {cancelled && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              Tu pago fue cancelado. Puedes intentar de nuevo.
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Order Summary Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Header */}
          <div style={{ backgroundColor: ACCENT }} className="flex items-center gap-3 px-6 py-4">
            <ShoppingBag className="h-5 w-5 text-white" />
            <h2 className="text-base font-bold text-white">Resumen de Orden</h2>
          </div>

          {/* Items */}
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div key={`${item.event.id}-${item.screening.id}`} className="flex gap-4 px-5 py-4">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-200 shadow-sm">
                  <Image
                    src={item.event.image || "/placeholder.svg"}
                    alt={item.event.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                  <div>
                    <p className="line-clamp-2 text-sm font-bold leading-snug text-gray-900">
                      {item.event.name}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {formatShortDate(item.screening.date)} ·{" "}
                        {formatTime12h(item.screening.time)}
                      </span>
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
          <div className="space-y-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                Subtotal ({totalItems} {totalItems === 1 ? "entrada" : "entradas"})
              </span>
              <span>{formatPrice(totalPriceInCents)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Cargo por servicio</span>
              <span className="font-medium text-green-600">Gratis</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-2">
              <span className="text-base font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold" style={{ color: ACCENT }}>
                {formatPrice(totalPriceInCents)}
              </span>
            </div>
          </div>

          {/* Pay Button */}
          <div className="border-t border-gray-100 px-5 py-5">
            <button
              onClick={handleCheckout}
              disabled={loading}
              style={{ backgroundColor: loading ? undefined : ACCENT }}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Confirmar y Pagar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-5 py-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            Pago 100% seguro
          </p>
          <div className="flex flex-wrap gap-3">
            {["Visa", "Mastercard", "Amex"].map((brand) => (
              <span
                key={brand}
                className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600"
              >
                {brand}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Tus datos están protegidos con encriptación SSL de 256-bit. Procesado de forma segura
            con N1co.
          </p>
        </div>
      </main>
    </div>
  );
}
