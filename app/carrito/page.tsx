"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Loader2,
  Lock,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  Ticket,
} from "lucide-react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useCart, type CartItem } from "@/lib/cart-context";
import { formatDate, formatPrice, formatTime12h } from "@/lib/events-shared";
import { startCheckout } from "@/app/actions/checkout";

const ACCENT = "#9e5656";

export default function CartPage() {
  return (
    <Suspense fallback={null}>
      <CartPageContent />
    </Suspense>
  );
}

function CartPageContent() {
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPriceInCents } = useCart();

  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled") === "true";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
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
  };

  const handleIncrement = (item: CartItem) => {
    updateQuantity(item.event.id, item.screening.id, item.quantity + 1);
  };

  const handleDecrement = (item: CartItem) => {
    updateQuantity(item.event.id, item.screening.id, item.quantity - 1);
  };

  const handleRemove = (item: CartItem) => {
    removeItem(item.event.id, item.screening.id);
  };

  const handleClearCart = () => {
    if (loading) return;
    clearCart();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-24 md:px-6">
        <div className="mb-8 flex items-center gap-3">
          <ShoppingCart className="h-6 w-6" style={{ color: ACCENT }} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mi Carrito</h1>
            <p className="mt-1 text-gray-500">
              {totalItems} {totalItems === 1 ? "entrada" : "entradas"}
            </p>
          </div>
        </div>

        {cancelled && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              Tu pago fue cancelado. Puedes intentar de nuevo.
            </p>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-24 text-center shadow-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <Ticket className="h-9 w-9 text-gray-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-800">Tu carrito esta vacio</p>
              <p className="mt-1 text-sm text-gray-500">Selecciona eventos para empezar</p>
            </div>
            <Link
              href="/"
              style={{ backgroundColor: ACCENT }}
              className="mt-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:shadow-lg"
            >
              Ver eventos
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div
                  key={`${item.event.id}-${item.screening.id}`}
                  className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  {/* Image */}
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-200">
                    <Image
                      src={item.event.image || "/placeholder.svg"}
                      alt={item.event.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        style={{ backgroundColor: ACCENT }}
                        className="w-fit max-w-[200px] truncate rounded px-2 py-0.5 text-xs font-bold text-white"
                      >
                        {item.event.name}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(item)}
                        className="shrink-0 text-gray-400 transition-colors hover:text-red-500"
                        aria-label={`Eliminar ${item.event.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-xs text-gray-500">
                      {formatDate(item.screening.date)} · {formatTime12h(item.screening.time)}
                    </p>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecrement(item)}
                          style={{ backgroundColor: ACCENT }}
                          className="flex h-7 w-7 items-center justify-center rounded text-white transition-all hover:shadow-md"
                          aria-label="Reducir cantidad"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-gray-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIncrement(item)}
                          style={{ backgroundColor: ACCENT }}
                          className="flex h-7 w-7 items-center justify-center rounded text-white transition-all hover:shadow-md"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {formatPrice(item.event.priceInCents * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals + actions */}
            <div className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-600">
                  {totalItems} {totalItems === 1 ? "entrada" : "entradas"}
                </span>
                <span className="text-xl font-bold text-gray-900">
                  {formatPrice(totalPriceInCents)}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClearCart}
                  disabled={loading}
                  className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition-all hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Vaciar
                </button>
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={loading}
                  style={{ backgroundColor: loading ? undefined : ACCENT }}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Pagar ahora
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
