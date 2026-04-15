"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Ticket,
} from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { verifyPayment } from "@/app/actions/checkout"

const ACCENT = "#9e5656"

type Status = "loading" | "success" | "pending" | "error"

export default function PaymentSuccess() {
  const searchParams = useSearchParams()
  const { clearCart } = useCart()
  const [status, setStatus] = useState<Status>("loading")
  const [orderCode, setOrderCode] = useState("")

  async function verify() {
    const code = searchParams.get("orderCode")
    if (!code) {
      setStatus("error")
      return
    }

    setOrderCode(code)
    setStatus("loading")

    try {
      const result = await verifyPayment(code)

      if (result.status === "PAID" || result.status === "FINALIZED") {
        setStatus("success")
        clearCart()
      } else if (result.status === "PENDING") {
        setStatus("pending")
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
  }

  useEffect(() => {
    verify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header style={{ backgroundColor: "#333333" }} className="shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Ticket className="h-6 w-6" style={{ color: ACCENT }} />
            <span className="text-xl font-bold tracking-tight text-white">
              EntradasYa
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-lg flex-col items-center justify-center px-4 py-16">
        {status === "loading" && (
          <div className="flex w-full flex-col items-center gap-6 text-center">
            <div
              className="h-16 w-16 animate-spin rounded-full border-4 border-gray-200"
              style={{ borderTopColor: ACCENT }}
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Verificando tu pago...
              </h1>
              <p className="mt-2 text-gray-500">
                Por favor espera mientras confirmamos tu transacción.
              </p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="w-full overflow-hidden rounded-2xl bg-white shadow-lg border border-gray-200">
            <div style={{ backgroundColor: ACCENT }} className="h-2 w-full" />
            <div className="flex flex-col items-center gap-5 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Pago Exitoso
                </h1>
                <p className="mt-2 text-gray-500">
                  Tu transacción ha sido procesada correctamente.
                </p>
              </div>
              <div className="w-full rounded-xl bg-gray-50 px-4 py-3 text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Código de Orden
                </p>
                <p className="break-all font-mono text-sm text-gray-700">
                  {orderCode}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                Recibirás un correo con tus entradas en los próximos minutos.
              </p>
              <Link
                href="/"
                style={{ backgroundColor: ACCENT }}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all hover:shadow-lg"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a eventos
              </Link>
            </div>
          </div>
        )}

        {status === "pending" && (
          <div className="w-full overflow-hidden rounded-2xl bg-white shadow-lg border border-gray-200">
            <div className="h-2 w-full bg-amber-400" />
            <div className="flex flex-col items-center gap-5 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
                <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Pago en Proceso
                </h1>
                <p className="mt-2 text-gray-500">
                  Tu pago está siendo procesado. Esto puede tomar unos momentos.
                </p>
              </div>
              <button
                onClick={verify}
                style={{ backgroundColor: ACCENT }}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all hover:shadow-lg"
              >
                <RefreshCw className="h-4 w-4" />
                Verificar de nuevo
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="w-full overflow-hidden rounded-2xl bg-white shadow-lg border border-gray-200">
            <div className="h-2 w-full bg-red-500" />
            <div className="flex flex-col items-center gap-5 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Error en el Pago
                </h1>
                <p className="mt-2 text-gray-500">
                  Algo salió mal durante el procesamiento. Por favor intenta de
                  nuevo.
                </p>
              </div>
              <Link
                href="/"
                style={{ backgroundColor: ACCENT }}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all hover:shadow-lg"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
