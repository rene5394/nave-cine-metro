import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { CartProvider, useCart, type CartScreening } from "@/lib/cart-context";
import type { TicketEvent } from "@/lib/events";
import { makeEvent, makeCategory } from "@/tests/fixtures/factories";

const CART_STORAGE_KEY = "entradasya-cart-v2";

function makeTicketEvent(overrides: Partial<TicketEvent> = {}): TicketEvent {
  return {
    ...makeEvent(overrides),
    category: makeCategory(),
    screenings: [],
    ...overrides,
  };
}

function makeScreening(overrides: Partial<CartScreening> = {}): CartScreening {
  return {
    id: "screening-1",
    date: "2026-12-31",
    time: "20:00",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("useCart", () => {
  it("throws when used outside a CartProvider", () => {
    expect(() => renderHook(() => useCart())).toThrow("useCart must be used within a CartProvider");
  });

  it("starts with an empty items array when localStorage is empty", () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    expect(result.current.items).toEqual([]);
  });

  it("hydrates items from a pre-seeded localStorage value on mount", async () => {
    const event = makeTicketEvent();
    const screening = makeScreening();
    const seeded = [{ event, screening, quantity: 2 }];
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(seeded));

    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    // Values round-trip through JSON, so Date fields on the fixture come
    // back out as ISO strings rather than Date instances.
    const expected = JSON.parse(JSON.stringify(seeded));

    await waitFor(() => {
      expect(result.current.items).toEqual(expected);
    });
  });

  it("does not throw and keeps items empty when localStorage holds corrupt JSON", async () => {
    localStorage.setItem(CART_STORAGE_KEY, "{not-valid-json");

    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    await waitFor(() => {
      expect(result.current.items).toEqual([]);
    });
  });

  describe("addItem", () => {
    it("adds a new line and opens the cart", () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const event = makeTicketEvent();
      const screening = makeScreening();

      act(() => {
        result.current.addItem(event, screening);
      });

      expect(result.current.items).toEqual([{ event, screening, quantity: 1 }]);
      expect(result.current.isCartOpen).toBe(true);
    });

    it("increments quantity instead of duplicating when the same event/screening is added again", () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const event = makeTicketEvent();
      const screening = makeScreening();

      act(() => {
        result.current.addItem(event, screening);
      });
      act(() => {
        result.current.addItem(event, screening);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(2);
    });

    it("adds a separate line for a different screening of the same event", () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const event = makeTicketEvent();
      const screeningA = makeScreening({ id: "screening-a" });
      const screeningB = makeScreening({ id: "screening-b" });

      act(() => {
        result.current.addItem(event, screeningA);
      });
      act(() => {
        result.current.addItem(event, screeningB);
      });

      expect(result.current.items).toHaveLength(2);
    });
  });

  describe("removeItem", () => {
    it("removes only the matching line, leaving others intact", () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const eventA = makeTicketEvent({ id: "event-a" });
      const eventB = makeTicketEvent({ id: "event-b" });
      const screening = makeScreening();

      act(() => {
        result.current.addItem(eventA, screening);
      });
      act(() => {
        result.current.addItem(eventB, screening);
      });
      act(() => {
        result.current.removeItem("event-a", screening.id);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].event.id).toBe("event-b");
    });
  });

  describe("updateQuantity", () => {
    it("updates the matching line's quantity in place when quantity > 0", () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const event = makeTicketEvent();
      const screening = makeScreening();

      act(() => {
        result.current.addItem(event, screening);
      });
      act(() => {
        result.current.updateQuantity(event.id, screening.id, 5);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(5);
    });

    it("removes the line entirely when quantity is 0", () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const event = makeTicketEvent();
      const screening = makeScreening();

      act(() => {
        result.current.addItem(event, screening);
      });
      act(() => {
        result.current.updateQuantity(event.id, screening.id, 0);
      });

      expect(result.current.items).toEqual([]);
    });

    it("removes the line entirely when quantity is negative", () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const event = makeTicketEvent();
      const screening = makeScreening();

      act(() => {
        result.current.addItem(event, screening);
      });
      act(() => {
        result.current.updateQuantity(event.id, screening.id, -1);
      });

      expect(result.current.items).toEqual([]);
    });
  });

  describe("clearCart", () => {
    it("empties items in state", async () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const event = makeTicketEvent();
      const screening = makeScreening();

      act(() => {
        result.current.addItem(event, screening);
      });

      await waitFor(() => {
        expect(localStorage.getItem(CART_STORAGE_KEY)).not.toBeNull();
      });

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toEqual([]);
    });

    // clearCart() synchronously calls localStorage.removeItem(), but setting
    // items to [] also changes the `items` dependency of the separate
    // "persist to localStorage" effect, which re-runs afterwards and writes
    // "[]" back in. So the key ends up holding the empty-array string, not
    // removed outright.
    it("leaves the localStorage key holding a serialized empty array (persist effect re-writes after removeItem)", async () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const event = makeTicketEvent();
      const screening = makeScreening();

      act(() => {
        result.current.addItem(event, screening);
      });

      await waitFor(() => {
        expect(localStorage.getItem(CART_STORAGE_KEY)).not.toBeNull();
      });

      act(() => {
        result.current.clearCart();
      });

      expect(localStorage.getItem(CART_STORAGE_KEY)).toBe("[]");
    });
  });

  describe("totalItems and totalPriceInCents", () => {
    it("sums quantities and prices across multiple lines", () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const eventA = makeTicketEvent({ id: "event-a", priceInCents: 1000 });
      const eventB = makeTicketEvent({ id: "event-b", priceInCents: 2500 });
      const screeningA = makeScreening({ id: "screening-a" });
      const screeningB = makeScreening({ id: "screening-b" });

      act(() => {
        result.current.addItem(eventA, screeningA, 3);
      });
      act(() => {
        result.current.addItem(eventB, screeningB, 2);
      });

      expect(result.current.totalItems).toBe(5);
      expect(result.current.totalPriceInCents).toBe(1000 * 3 + 2500 * 2);
    });

    it("is zero when the cart is empty", () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPriceInCents).toBe(0);
    });
  });

  describe("persistence", () => {
    it("writes items to localStorage after addItem", async () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
      const event = makeTicketEvent();
      const screening = makeScreening();

      act(() => {
        result.current.addItem(event, screening);
      });

      const expected = JSON.parse(JSON.stringify([{ event, screening, quantity: 1 }]));

      await waitFor(() => {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        expect(stored).not.toBeNull();
        expect(JSON.parse(stored as string)).toEqual(expected);
      });
    });
  });
});
