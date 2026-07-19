import { describe, it, expect } from "vitest";
import { reducer } from "@/hooks/use-toast";

type ToasterToast = Parameters<typeof reducer>[0]["toasts"][number];

function makeToast(overrides: Partial<ToasterToast> = {}): ToasterToast {
  return { id: "1", open: true, ...overrides };
}

describe("reducer", () => {
  it("ADD_TOAST prepends a toast", () => {
    const state = { toasts: [] };
    const next = reducer(state, { type: "ADD_TOAST", toast: makeToast({ id: "1" }) });
    expect(next.toasts.map((t) => t.id)).toEqual(["1"]);
  });

  it("ADD_TOAST truncates to TOAST_LIMIT (1)", () => {
    const state = { toasts: [makeToast({ id: "1" })] };
    const next = reducer(state, { type: "ADD_TOAST", toast: makeToast({ id: "2" }) });
    expect(next.toasts.map((t) => t.id)).toEqual(["2"]);
  });

  it("UPDATE_TOAST merges a partial update by id, leaving other toasts untouched", () => {
    const state = { toasts: [makeToast({ id: "1", title: "old" })] };
    const next = reducer(state, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "new" },
    });
    expect(next.toasts[0].title).toBe("new");
    expect(next.toasts[0].open).toBe(true);
  });

  it("DISMISS_TOAST with an id closes only that toast", () => {
    const state = { toasts: [makeToast({ id: "1" }), makeToast({ id: "2" })] };
    const next = reducer(state, { type: "DISMISS_TOAST", toastId: "1" });
    expect(next.toasts.find((t) => t.id === "1")?.open).toBe(false);
    expect(next.toasts.find((t) => t.id === "2")?.open).toBe(true);
  });

  it("DISMISS_TOAST without an id closes all toasts", () => {
    const state = { toasts: [makeToast({ id: "1" }), makeToast({ id: "2" })] };
    const next = reducer(state, { type: "DISMISS_TOAST" });
    expect(next.toasts.every((t) => t.open === false)).toBe(true);
  });

  it("REMOVE_TOAST with an id filters out only that toast", () => {
    const state = { toasts: [makeToast({ id: "1" }), makeToast({ id: "2" })] };
    const next = reducer(state, { type: "REMOVE_TOAST", toastId: "1" });
    expect(next.toasts.map((t) => t.id)).toEqual(["2"]);
  });

  it("REMOVE_TOAST without an id clears all toasts", () => {
    const state = { toasts: [makeToast({ id: "1" }), makeToast({ id: "2" })] };
    const next = reducer(state, { type: "REMOVE_TOAST" });
    expect(next.toasts).toEqual([]);
  });
});
