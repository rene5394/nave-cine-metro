export const CATEGORY_COLOR_PRESETS = [
  { name: "Amber", hex: "#f59e0b" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Sky", hex: "#0ea5e9" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Slate", hex: "#64748b" },
] as const;

export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLOR_PRESETS[0].hex;

export const CATEGORY_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function categoryBadgeStyle(hex: string): { color: string; backgroundColor: string } {
  return { color: hex, backgroundColor: `${hex}33` };
}
