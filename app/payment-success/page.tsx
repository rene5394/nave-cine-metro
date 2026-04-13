"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, AlertCircle, Loader, Ticket, ArrowLeft } from "lucide-react"

const ACCENT = "#9e5656"

export default function PaymentSuccess() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [transactionId, setTransactionId] = useState<string>("")

  useEffect(() => {
    const transId = searchParams.get("transaction_id")
    if (transId) {
      setTransactionId(transId)
      setStatus("success")
    } else {
      setStatus("error")
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header style={{ backgroundColor: "#333333" }} className="shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Ticket className="h-6 w-6" style={{ color: ACCENT }} />
            <span className="text-xl font-bold tracking-tight text-white">EntradasYa</span>
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
              <h1 className="text-2xl font-bold text-gray-900">Procesando tu pago...</h1>
              <p className="mt-2 text-gray-500">
                Por favor espera mientras confirmamos tu transaccion.
              </p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="w-full overflow-hidden rounded-2xl bg-white shadow-lg border border-gray-200">
            {/* Top accent bar */}
            <div style={{ backgroundColor: ACCENT }} className="h-2 w-full" />

            <div className="flex flex-col items-center gap-5 p-8 text-center">
              {/* Icon */}
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pago Exitoso</h1>
                <p className="mt-2 text-gray-500">
                  Tu transaccion ha sido procesada correctamente.
                </p>
              </div>

              {/* Transaction ID */}
              <div className="w-full rounded-xl bg-gray-50 px-4 py-3 text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  ID de Transaccion
                </p>
                <p className="break-all font-mono text-sm text-gray-700">{transactionId}</p>
              </div>

              <p className="text-sm text-gray-500">
                Recibirás un correo con tus entradas en los proximos minutos.
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

        {status === "error" && (
          <div className="w-full overflow-hidden rounded-2xl bg-white shadow-lg border border-gray-200">
            <div className="h-2 w-full bg-red-500" />

            <div className="flex flex-col items-center gap-5 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">Error en el Pago</h1>
                <p className="mt-2 text-gray-500">
                  Algo salio mal durante el procesamiento. Por favor intenta de nuevo.
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
