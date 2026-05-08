"use client";

import React from "react";

import { CATEGORY_LABELS, type EventCategory } from "@/lib/events-shared";
import { Film, Theater, Music, Sparkles, LayoutGrid } from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <LayoutGrid className="h-4 w-4" />,
  cine: <Film className="h-4 w-4" />,
  teatro: <Theater className="h-4 w-4" />,
  concierto: <Music className="h-4 w-4" />,
  popup: <Sparkles className="h-4 w-4" />,
};

interface EventFiltersProps {
  selected: EventCategory | "all";
  onSelect: (category: EventCategory | "all") => void;
}

export default function EventFilters({ selected, onSelect }: EventFiltersProps) {
  const options: (EventCategory | "all")[] = ["all", "cine", "teatro", "concierto", "popup"];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((cat) => {
        const isActive = selected === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelect(cat)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            {CATEGORY_ICONS[cat]}
            {cat === "all" ? "Todos" : CATEGORY_LABELS[cat]}
          </button>
        );
      })}
    </div>
  );
}
