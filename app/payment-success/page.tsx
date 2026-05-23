"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Mail,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { verifyPayment, resendTicketsEmail, type IssuedTicket } from "@/app/actions/checkout";
import { formatTime12h } from "@/lib/events-shared";

const ACCENT = "#9e5656";

type Status = "loading" | "success" | "pending" | "error";

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<Status>("loading");
  const [orderCode, setOrderCode] = useState("");
  const [tickets, setTickets] = useState<IssuedTicket[]>([]);
  const [emailSent, setEmailSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  async function verify() {
    const code = searchParams.get("order_code") ?? searchParams.get("orderCode");
    if (!code || code === "PLACEHOLDER") {
      setStatus("error");
      return;
    }

    setOrderCode(code);
    setStatus("loading");

    try {
      const result = await verifyPayment(code);

      if (result.status === "PAID" || result.status === "FINALIZED") {
        setStatus("success");
        setTickets("tickets" in result && result.tickets ? result.tickets : []);
        setEmailSent("emailSent" in result ? !!result.emailSent : false);
        clearCart();
      } else if (result.status === "PENDING") {
        setStatus("pending");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    // Data fetching effect: verifies payment status with backend on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleResend() {
    if (!orderCode || resending) return;
    setResending(true);
    setResendMsg(null);
    try {
      const r = await resendTicketsEmail(orderCode);
      if (r.ok) {
        setEmailSent(true);
        setResendMsg(null);
      } else {
        setResendMsg(r.error);
      }
    } catch {
      setResendMsg("No pudimos reintentar ahora. Intenta más tarde.");
    } finally {
      setResending(false);
    }
  }

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
              <h1 className="text-2xl font-bold text-gray-900">Verificando tu pago...</h1>
              <p className="mt-2 text-gray-500">
                Por favor espera mientras confirmamos tu transacción.
              </p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
            <div style={{ backgroundColor: ACCENT }} className="h-2 w-full" />
            <div className="flex flex-col items-center gap-5 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pago Exitoso</h1>
                <p className="mt-2 text-gray-500">
                  Tu transacción ha sido procesada correctamente.
                </p>
              </div>
              <div className="w-full rounded-xl bg-gray-50 px-4 py-3 text-left">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">
                  Código de Orden
                </p>
                <p className="break-all font-mono text-sm text-gray-700">{orderCode}</p>
              </div>

              {tickets.length > 0 && (
                <div className="flex w-full flex-col gap-4">
                  <p className="text-sm font-semibold text-gray-700">
                    {tickets.length === 1 ? "Tu entrada" : `Tus ${tickets.length} entradas`}
                  </p>
                  {tickets.map((t, idx) => (
                    <div
                      key={t.token}
                      className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex w-full items-center justify-between text-left">
                        <div>
                          <p className="text-base font-bold text-gray-900">{t.eventName}</p>
                          {(t.date || t.time) && (
                            <p className="text-xs text-gray-500">
                              {t.date}
                              {t.time ? ` · ${formatTime12h(t.time)}` : ""}
                            </p>
                          )}
                        </div>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                          {idx + 1}/{tickets.length}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white p-2">
                        <QRCodeSVG value={t.token} size={200} level="M" />
                      </div>
                      <p className="break-all font-mono text-[10px] text-gray-400">{t.token}</p>
                    </div>
                  ))}
                </div>
              )}

              {emailSent ? (
                <div className="flex w-full items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left">
                  <Mail className="h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-xs text-emerald-800">
                    Te enviamos los códigos QR a tu correo como respaldo.
                  </p>
                </div>
              ) : (
                <div className="flex w-full flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                  <div className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-xs text-amber-800">
                      No pudimos enviarte el correo con los QR. Por ahora, guarda esta página o toma
                      una captura.
                    </p>
                  </div>
                  {resendMsg && <p className="text-xs text-red-700">{resendMsg}</p>}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                  >
                    {resending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Reintentar envío
                  </button>
                </div>
              )}

              <p className="text-sm text-gray-500">
                Presenta este código QR en la entrada del evento.
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
          <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
            <div className="h-2 w-full bg-amber-400" />
            <div className="flex flex-col items-center gap-5 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pago en Proceso</h1>
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
          <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
            <div className="h-2 w-full bg-red-500" />
            <div className="flex flex-col items-center gap-5 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Error en el Pago</h1>
                <p className="mt-2 text-gray-500">
                  Algo salió mal durante el procesamiento. Por favor intenta de nuevo.
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
  );
}
