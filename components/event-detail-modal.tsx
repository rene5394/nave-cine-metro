"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useEventModal } from "@/lib/event-modal-context";
import UnifiedDetail from "./detail/unified-detail";

export default function EventDetailModal() {
  const { selectedEvent, closeEvent } = useEventModal();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEvent();
    };
    if (selectedEvent) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEsc);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [selectedEvent, closeEvent]);

  if (!selectedEvent) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeEvent}
        onKeyDown={() => {}}
        role="presentation"
      />

      {/* Modal content - scrolls with page */}
      <div className="relative flex min-h-screen items-start justify-center p-4 md:p-8">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle del evento: ${selectedEvent.name}`}
          className="relative z-10 my-8 w-full max-w-5xl"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeEvent}
            className="absolute -right-4 -top-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-700 shadow-xl transition-all hover:bg-gray-100"
            aria-label="Cerrar detalle del evento"
          >
            <X className="h-6 w-6" />
          </button>

          <UnifiedDetail event={selectedEvent} />
        </div>
      </div>
    </div>
  );
}
