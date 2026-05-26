"use client";

import { useState } from "react";

type TimePicker12hProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
};

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function parse(value: string): { hour12: string; minute: string; period: "AM" | "PM" | "" } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return { hour12: "", minute: "", period: "" };
  const h24 = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h24) || !Number.isFinite(m)) return { hour12: "", minute: "", period: "" };
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12: String(hour12), minute: String(m).padStart(2, "0"), period };
}

function serialize(hour12: string, minute: string, period: "AM" | "PM" | ""): string {
  if (!hour12 || !minute || !period) return "";
  const h12 = Number(hour12);
  const m = Number(minute);
  if (!Number.isFinite(h12) || !Number.isFinite(m)) return "";
  let h24 = h12 % 12;
  if (period === "PM") h24 += 12;
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function TimePicker12h({ value, onChange, required, className }: TimePicker12hProps) {
  const [hour12, setHour12] = useState(() => parse(value).hour12);
  const [minute, setMinute] = useState(() => parse(value).minute);
  const [period, setPeriod] = useState<"AM" | "PM" | "">(() => parse(value).period);
  const [lastValue, setLastValue] = useState(value);

  // Adopt a new external value only if it doesn't already match our current
  // serialization. Without this guard, partial selections (which serialize to
  // "") would get clobbered back to empty on the next parent render.
  if (value !== lastValue && value !== serialize(hour12, minute, period)) {
    const parsed = parse(value);
    setHour12(parsed.hour12);
    setMinute(parsed.minute);
    setPeriod(parsed.period);
    setLastValue(value);
  }

  const baseClass = className ?? "rounded-lg border border-border bg-input px-2 py-2 text-sm";

  const emit = (next: { hour12?: string; minute?: string; period?: "AM" | "PM" | "" }) => {
    const h = next.hour12 ?? hour12;
    const m = next.minute ?? minute;
    const p = next.period ?? period;
    if (next.hour12 !== undefined) setHour12(next.hour12);
    if (next.minute !== undefined) setMinute(next.minute);
    if (next.period !== undefined) setPeriod(next.period);
    onChange(serialize(h, m, p));
  };

  return (
    <div className="flex items-center gap-1">
      <select
        value={hour12}
        onChange={(e) => emit({ hour12: e.target.value })}
        required={required}
        className={baseClass}
        aria-label="Hora"
      >
        <option value="" disabled>
          HH
        </option>
        {HOURS_12.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-sm text-muted-foreground">:</span>
      <select
        value={minute}
        onChange={(e) => emit({ minute: e.target.value })}
        required={required}
        className={baseClass}
        aria-label="Minutos"
      >
        <option value="" disabled>
          MM
        </option>
        {MINUTES.map((m) => {
          const mm = String(m).padStart(2, "0");
          return (
            <option key={mm} value={mm}>
              {mm}
            </option>
          );
        })}
      </select>
      <select
        value={period}
        onChange={(e) => emit({ period: e.target.value as "AM" | "PM" })}
        required={required}
        className={baseClass}
        aria-label="AM o PM"
      >
        <option value="" disabled>
          --
        </option>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
