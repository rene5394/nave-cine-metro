import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { EventModalProvider, useEventModal } from "@/lib/event-modal-context";
import type { TicketEvent } from "@/lib/events";
import { makeEvent, makeCategory } from "@/tests/fixtures/factories";

function makeTicketEvent(overrides: Partial<TicketEvent> = {}): TicketEvent {
  return {
    ...makeEvent(overrides),
    category: makeCategory(),
    screenings: [],
    ...overrides,
  };
}

beforeEach(() => {
  document.body.style.overflow = "";
});

afterEach(() => {
  document.body.style.overflow = "";
});

describe("useEventModal", () => {
  it("throws when used outside an EventModalProvider", () => {
    expect(() => renderHook(() => useEventModal())).toThrow(
      "useEventModal must be used within an EventModalProvider",
    );
  });

  it("starts with selectedEvent as null", () => {
    const { result } = renderHook(() => useEventModal(), { wrapper: EventModalProvider });
    expect(result.current.selectedEvent).toBeNull();
  });

  describe("openEvent", () => {
    it("sets selectedEvent and locks body scroll", () => {
      const { result } = renderHook(() => useEventModal(), { wrapper: EventModalProvider });
      const event = makeTicketEvent();

      act(() => {
        result.current.openEvent(event);
      });

      expect(result.current.selectedEvent).toEqual(event);
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("replaces the selected event when called again with a different event", () => {
      const { result } = renderHook(() => useEventModal(), { wrapper: EventModalProvider });
      const eventA = makeTicketEvent({ id: "event-a" });
      const eventB = makeTicketEvent({ id: "event-b" });

      act(() => {
        result.current.openEvent(eventA);
      });
      act(() => {
        result.current.openEvent(eventB);
      });

      expect(result.current.selectedEvent).toEqual(eventB);
    });
  });

  describe("closeEvent", () => {
    it("resets selectedEvent to null and restores body scroll", () => {
      const { result } = renderHook(() => useEventModal(), { wrapper: EventModalProvider });
      const event = makeTicketEvent();

      act(() => {
        result.current.openEvent(event);
      });
      act(() => {
        result.current.closeEvent();
      });

      expect(result.current.selectedEvent).toBeNull();
      expect(document.body.style.overflow).toBe("");
    });
  });
});
