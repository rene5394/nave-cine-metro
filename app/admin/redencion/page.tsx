"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle2, AlertTriangle, XCircle, Camera, RefreshCw } from "lucide-react";
import { redeemTicket, type RedeemResult } from "@/app/actions/tickets";
import { formatTime12h } from "@/lib/events-shared";

const READER_ID = "qr-reader";

type UIResult =
  | { kind: "idle" }
  | { kind: "verifying" }
  | { kind: "result"; result: RedeemResult }
  | { kind: "error"; message: string };

function mapCameraError(err: unknown): { title: string; hint: string; denied: boolean } {
  const e = err as { name?: string; message?: string };
  const name = e?.name ?? "";
  const message = e?.message ?? "";

  if (name === "NotAllowedError" || /Permission|denied/i.test(message)) {
    return {
      title: "Necesitamos acceso a la cámara",
      hint: "Toca el ícono de cámara en la barra de direcciones del navegador, permite el acceso, y luego presiona Reintentar.",
      denied: true,
    };
  }
  if (name === "NotFoundError" || /no camera/i.test(message)) {
    return {
      title: "No se detectó ninguna cámara",
      hint: "Asegúrate de que el dispositivo tenga una cámara conectada y funcional.",
      denied: false,
    };
  }
  if (name === "NotReadableError") {
    return {
      title: "La cámara está en uso",
      hint: "Cierra otras apps o pestañas que estén usando la cámara y reintenta.",
      denied: false,
    };
  }
  return {
    title: "No se pudo iniciar la cámara",
    hint: message || "Intenta recargar la página.",
    denied: false,
  };
}

async function safeStop(inst: Html5Qrcode | null): Promise<void> {
  if (!inst) return;
  try {
    const maybePromise = inst.stop();
    if (maybePromise && typeof maybePromise.then === "function") {
      await maybePromise.catch(() => {});
    }
  } catch {
    // html5-qrcode throws synchronously when called on a non-running scanner.
  }
  try {
    inst.clear();
  } catch {}
}

export default function RedencionPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [startError, setStartError] = useState<{
    title: string;
    hint: string;
    denied: boolean;
  } | null>(null);
  const [ui, setUi] = useState<UIResult>({ kind: "idle" });

  async function startScanner() {
    setStartError(null);
    setCameraStarted(false);
    const instance = new Html5Qrcode(READER_ID, { verbose: false });
    try {
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          if (busyRef.current) return;
          busyRef.current = true;
          setUi({ kind: "verifying" });
          try {
            await instance.pause(true);
          } catch {}
          try {
            const result = await redeemTicket({ token: decodedText });
            setUi({ kind: "result", result });
          } catch {
            setUi({ kind: "error", message: "Error al verificar el ticket" });
          }
        },
        () => {},
      );
      if (!mountedRef.current) {
        // Component unmounted while start() was in flight — clean up.
        await safeStop(instance);
        return;
      }
      scannerRef.current = instance;
      setCameraStarted(true);
    } catch (err) {
      if (!mountedRef.current) return;
      setStartError(mapCameraError(err));
    }
  }

  async function rearm() {
    busyRef.current = false;
    setUi({ kind: "idle" });
    const inst = scannerRef.current;
    if (!inst) {
      await startScanner();
      return;
    }
    try {
      await inst.resume();
    } catch {
      await startScanner();
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    // Defer startup one tick so React Strict Mode's double-mount in dev
    // can cancel before we inject a <video> into the DOM. Without this,
    // both mounts call start() and we end up with two stacked video elements.
    const handle = setTimeout(() => {
      startScanner();
    }, 100);
    return () => {
      mountedRef.current = false;
      clearTimeout(handle);
      const inst = scannerRef.current;
      scannerRef.current = null;
      void safeStop(inst);
    };
  }, []);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Redención de Tickets</h1>
        <p className="text-sm text-muted-foreground">
          Apunta la cámara al código QR del asistente.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-black shadow-md">
        <div id={READER_ID} className="aspect-square w-full" />
      </div>

      {!cameraStarted && startError && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            startError.denied
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-gray-200 bg-gray-50 text-gray-800"
          }`}
        >
          <Camera
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              startError.denied ? "text-amber-600" : "text-gray-500"
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{startError.title}</p>
            <p className="mt-1 text-xs opacity-90">{startError.hint}</p>
            <button
              type="button"
              onClick={startScanner}
              className={`mt-3 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white ${
                startError.denied
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-gray-700 hover:bg-gray-800"
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {startError.denied ? "Permitir cámara y reintentar" : "Reintentar"}
            </button>
          </div>
        </div>
      )}

      {ui.kind === "verifying" && (
        <div className="rounded-xl border border-border bg-white p-4 text-center text-sm text-muted-foreground">
          Verificando ticket...
        </div>
      )}

      {ui.kind === "error" && (
        <ResultCard
          tone="red"
          icon={<XCircle className="h-6 w-6 text-red-600" />}
          title="Error"
          message={ui.message}
          onAgain={rearm}
        />
      )}

      {ui.kind === "result" && <ResultView result={ui.result} onAgain={rearm} />}
    </div>
  );
}

function ResultView({ result, onAgain }: { result: RedeemResult; onAgain: () => void }) {
  if (result.ok) {
    const t = result.ticket;
    return (
      <ResultCard
        tone="green"
        icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
        title="Ticket canjeado"
        message={t.eventName}
        meta={
          t.date || t.time
            ? `${t.date ?? ""}${t.time ? ` · ${formatTime12h(t.time)}` : ""}`
            : undefined
        }
        onAgain={onAgain}
      />
    );
  }

  if (result.code === "ALREADY_REDEEMED") {
    return (
      <ResultCard
        tone="amber"
        icon={<AlertTriangle className="h-6 w-6 text-amber-600" />}
        title={result.message}
        message={result.eventName}
        meta={
          result.redeemedAt
            ? `Canjeado el ${new Date(result.redeemedAt).toLocaleString("es-MX", {
                day: "2-digit",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}`
            : undefined
        }
        onAgain={onAgain}
      />
    );
  }

  return (
    <ResultCard
      tone="red"
      icon={<XCircle className="h-6 w-6 text-red-600" />}
      title={result.message}
      onAgain={onAgain}
    />
  );
}

function ResultCard({
  tone,
  icon,
  title,
  message,
  meta,
  onAgain,
}: {
  tone: "green" | "amber" | "red";
  icon: React.ReactNode;
  title: string;
  message?: string;
  meta?: string;
  onAgain: () => void;
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50"
        : "border-red-200 bg-red-50";
  const btnClass =
    tone === "green"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : tone === "amber"
        ? "bg-amber-600 hover:bg-amber-700"
        : "bg-red-600 hover:bg-red-700";

  return (
    <div className={`flex flex-col gap-3 rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{title}</p>
          {message && <p className="mt-0.5 text-sm text-gray-700">{message}</p>}
          {meta && <p className="mt-1 text-xs text-gray-500">{meta}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onAgain}
        className={`mt-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white ${btnClass}`}
      >
        <Camera className="h-4 w-4" />
        Escanear siguiente
      </button>
    </div>
  );
}
