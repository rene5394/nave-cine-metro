"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { TicketEvent } from "./events";

interface EventModalContextType {
  selectedEvent: TicketEvent | null;
  openEvent: (event: TicketEvent) => void;
  closeEvent: () => void;
}

const EventModalContext = createContext<EventModalContextType | undefined>(undefined);

export function EventModalProvider({ children }: { children: ReactNode }) {
  const [selectedEvent, setSelectedEvent] = useState<TicketEvent | null>(null);

  const openEvent = useCallback((event: TicketEvent) => {
    setSelectedEvent(event);
    document.body.style.overflow = "hidden";
  }, []);

  const closeEvent = useCallback(() => {
    setSelectedEvent(null);
    document.body.style.overflow = "";
  }, []);

  return (
    <EventModalContext.Provider value={{ selectedEvent, openEvent, closeEvent }}>
      {children}
    </EventModalContext.Provider>
  );
}

export function useEventModal() {
  const context = useContext(EventModalContext);
  if (!context) {
    throw new Error("useEventModal must be used within an EventModalProvider");
  }
  return context;
}
