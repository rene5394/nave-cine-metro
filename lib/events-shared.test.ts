import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  formatPrice,
  formatDate,
  formatShortDate,
  formatTime12h,
  isScreeningPast,
} from "@/lib/events-shared";

describe("formatPrice", () => {
  it("formats whole-dollar amounts as USD currency", () => {
    expect(formatPrice(5000)).toBe("$50.00");
  });

  it("formats fractional-cent amounts as USD currency", () => {
    expect(formatPrice(1999)).toBe("$19.99");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });
});

describe("formatDate", () => {
  it("formats a date string as long es-MX date, anchored to UTC", () => {
    expect(formatDate("2026-12-31")).toBe("Jueves, 31 de diciembre de 2026");
  });
});

describe("formatShortDate", () => {
  it("formats a date string as short es-MX date, anchored to UTC", () => {
    expect(formatShortDate("2026-12-31")).toBe("31 dic");
  });
});

describe("formatTime12h", () => {
  it("formats midnight as 12:00 AM", () => {
    expect(formatTime12h("00:00")).toBe("12:00 AM");
  });

  it("formats noon as 12:00 PM", () => {
    expect(formatTime12h("12:00")).toBe("12:00 PM");
  });

  it("formats an afternoon time with PM rollover", () => {
    expect(formatTime12h("13:05")).toBe("1:05 PM");
  });

  it("formats a late-night time", () => {
    expect(formatTime12h("23:59")).toBe("11:59 PM");
  });

  it("returns the input unchanged when it is not numeric", () => {
    expect(formatTime12h("not-a-time")).toBe("not-a-time");
  });
});

describe("isScreeningPast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Screening starts at 2026-01-01T13:30:00.
    vi.setSystemTime(new Date("2026-01-01T13:30:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is not past before the screening starts", () => {
    vi.setSystemTime(new Date("2026-01-01T13:00:00"));
    expect(isScreeningPast("2026-01-01", "13:30")).toBe(false);
  });

  it("is not past right when the screening starts", () => {
    vi.setSystemTime(new Date("2026-01-01T13:30:00"));
    expect(isScreeningPast("2026-01-01", "13:30")).toBe(false);
  });

  it("is not past within the 15-minute grace period after it starts", () => {
    vi.setSystemTime(new Date("2026-01-01T13:45:00"));
    expect(isScreeningPast("2026-01-01", "13:30")).toBe(false);
  });

  it("is past once the 15-minute grace period elapses", () => {
    vi.setSystemTime(new Date("2026-01-01T13:45:01"));
    expect(isScreeningPast("2026-01-01", "13:30")).toBe(true);
  });
});
