"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type TicketEvent } from "@/lib/events-shared";
import EventCard from "./event-card";
import EventFilters from "./event-filters";

const ITEMS_PER_PAGE = 12;

interface EventGridProps {
  events: TicketEvent[];
  categories: { slug: string; name: string }[];
}

export default function EventGrid({ events, categories }: EventGridProps) {
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.category.slug === filter);
  }, [filter, events]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleFilterChange = (cat: string) => {
    setFilter(cat);
    setPage(1);
  };

  return (
    <section id="eventos" className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Todos los Eventos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} evento{filtered.length !== 1 ? "s" : ""} disponible
            {filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <EventFilters selected={filter} onSelect={handleFilterChange} categories={categories} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {paginated.map((event, i) => (
          <EventCard key={event.id} event={event} index={i} />
        ))}
      </div>

      {paginated.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg text-muted-foreground">No hay eventos en esta categoria.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Pagina anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Siguiente pagina"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
