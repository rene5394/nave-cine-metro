"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, Minus, Plus, ShoppingCart, Trash2, Ticket } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatPrice, formatTime12h } from "@/lib/events-shared";

const ACCENT = "#9e5656";

export default function CartSidebar() {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPriceInCents,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const router = useRouter();

  const handleClose = () => setIsCartOpen(false);

  const handleCheckout = () => {
    setIsCartOpen(false);
    router.push("/checkout");
  };

  if (!isCartOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={handleClose}
      onKeyDown={() => {}}
      role="presentation"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Sidebar */}
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
        role="presentation"
      >
        {/* Header */}
        <div
          style={{ backgroundColor: ACCENT }}
          className="flex items-center justify-between px-6 py-5"
        >
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold text-white">Mi Carrito</h2>
            {totalItems > 0 && (
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold"
                style={{ color: ACCENT }}
              >
                {totalItems}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            aria-label="Cerrar carrito"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <Ticket className="h-9 w-9 text-gray-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-800">Tu carrito esta vacio</p>
                <p className="mt-1 text-sm text-gray-500">Selecciona eventos para empezar</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-5">
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
                        className="w-fit max-w-[160px] truncate rounded px-2 py-0.5 text-xs font-bold text-white"
                      >
                        {item.event.name}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.event.id, item.screening.id)}
                        className="shrink-0 text-gray-400 transition-colors hover:text-red-500"
                        aria-label={`Eliminar ${item.event.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-xs text-gray-500">
                      {item.screening.date} · {formatTime12h(item.screening.time)}
                    </p>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.event.id, item.screening.id, item.quantity - 1)
                          }
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
                          onClick={() =>
                            updateQuantity(item.event.id, item.screening.id, item.quantity + 1)
                          }
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
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="space-y-4 border-t border-gray-200 bg-white p-5">
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
                onClick={clearCart}
                className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition-all hover:border-gray-400"
              >
                Vaciar
              </button>
              <button
                type="button"
                onClick={handleCheckout}
                style={{ backgroundColor: ACCENT }}
                className="flex-[2] rounded-xl px-4 py-3 text-sm font-bold text-white transition-all hover:shadow-lg"
              >
                Pagar ahora
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
