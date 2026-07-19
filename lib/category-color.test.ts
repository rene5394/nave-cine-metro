import { describe, it, expect } from "vitest";
import {
  categoryBadgeStyle,
  CATEGORY_COLOR_PRESETS,
  DEFAULT_CATEGORY_COLOR,
  CATEGORY_COLOR_REGEX,
} from "@/lib/category-color";

describe("categoryBadgeStyle", () => {
  it("returns the hex as text color and a 20%-alpha background", () => {
    expect(categoryBadgeStyle("#f59e0b")).toEqual({
      color: "#f59e0b",
      backgroundColor: "#f59e0b33",
    });
  });
});

describe("CATEGORY_COLOR_REGEX", () => {
  it("accepts 6-digit hex colors, case-insensitively", () => {
    expect(CATEGORY_COLOR_REGEX.test("#f59e0b")).toBe(true);
    expect(CATEGORY_COLOR_REGEX.test("#F59E0B")).toBe(true);
  });

  it("rejects 3-digit shorthand, missing #, invalid chars, and wrong length", () => {
    expect(CATEGORY_COLOR_REGEX.test("#fff")).toBe(false);
    expect(CATEGORY_COLOR_REGEX.test("f59e0b")).toBe(false);
    expect(CATEGORY_COLOR_REGEX.test("#gggggg")).toBe(false);
    expect(CATEGORY_COLOR_REGEX.test("#f59e0b1")).toBe(false);
  });
});

describe("DEFAULT_CATEGORY_COLOR", () => {
  it("matches the first preset", () => {
    expect(DEFAULT_CATEGORY_COLOR).toBe(CATEGORY_COLOR_PRESETS[0].hex);
  });
});

describe("CATEGORY_COLOR_PRESETS", () => {
  it("every preset hex matches the color regex", () => {
    for (const preset of CATEGORY_COLOR_PRESETS) {
      expect(CATEGORY_COLOR_REGEX.test(preset.hex)).toBe(true);
    }
  });
});
