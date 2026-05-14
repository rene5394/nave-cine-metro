"use client";

import { LayoutGrid, Tag } from "lucide-react";

interface EventFiltersProps {
  selected: string;
  onSelect: (slug: string) => void;
  categories: { slug: string; name: string }[];
}

export default function EventFilters({ selected, onSelect, categories }: EventFiltersProps) {
  const options = [{ slug: "all", name: "Todos" }, ...categories];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((cat) => {
        const isActive = selected === cat.slug;
        const Icon = cat.slug === "all" ? LayoutGrid : Tag;
        return (
          <button
            key={cat.slug}
            type="button"
            onClick={() => onSelect(cat.slug)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
