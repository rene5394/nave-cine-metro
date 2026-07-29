"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader } from "lucide-react";
import { getOrders } from "@/app/actions/orders";
import { getEvents } from "@/app/actions/events";
import { formatPrice, formatTime12h } from "@/lib/events-shared";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type OrdersResult = Extract<Awaited<ReturnType<typeof getOrders>>, { ok: true }>;
type OrderRow = OrdersResult["orders"][number];
type EventOption = { id: string; name: string };

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  REDEEMED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  REDEEMED: "Redimida",
  CANCELLED: "Cancelada",
};

function formatDateTime(d: Date | string) {
  const date = new Date(d);
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Latest redemption among the order's tickets, or null if none have been redeemed yet. */
function getLatestRedemption(order: OrderRow): Date | null {
  const dates = order.items
    .flatMap((it) => it.tickets)
    .map((t) => t.redeemedAt)
    .filter((d): d is Date => d !== null);
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => new Date(d).getTime())));
}

// The "Desde"/"Hasta" values are matched against order.createdAt as UTC day
// boundaries (see app/actions/orders.ts), so the default range is computed
// from the current UTC date rather than the browser's local date.
function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Defaults the orders filter to today and the 6 days before it (a 7-day window). */
function getDefaultDateRange() {
  const today = new Date();
  const sixDaysAgo = new Date(today);
  sixDaysAgo.setUTCDate(today.getUTCDate() - 6);
  return { startDate: toDateInputValue(sixDaysAgo), endDate: toDateInputValue(today) };
}

export default function OrdersPage() {
  const defaultDateRange = getDefaultDateRange();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [eventId, setEventId] = useState("");
  const [dateField, setDateField] = useState<"createdAt" | "redeemedAt">("createdAt");
  const [startDate, setStartDate] = useState(defaultDateRange.startDate);
  const [endDate, setEndDate] = useState(defaultDateRange.endDate);
  const [debouncedDates, setDebouncedDates] = useState(defaultDateRange);

  useEffect(() => {
    getEvents({ page: 1, pageSize: 100 })
      .then((r) => setEvents(r.events.map((e) => ({ id: e.id, name: e.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedDates({ startDate, endDate }), 300);
    return () => clearTimeout(t);
  }, [startDate, endDate]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOrders({
        page,
        pageSize: PAGE_SIZE,
        eventId: eventId || undefined,
        dateField,
        startDate: debouncedDates.startDate || undefined,
        endDate: debouncedDates.endDate || undefined,
      });
      if (result.ok) {
        setOrders(result.orders);
        setTotalPages(result.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, eventId, dateField, debouncedDates]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold text-foreground">Órdenes</h2>
        <p className="text-muted-foreground">Historial de compras realizadas</p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <select
          value={eventId}
          onChange={(e) => {
            setEventId(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-border bg-input px-3 text-sm"
        >
          <option value="">Todas las películas</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          value={dateField}
          onChange={(e) => {
            setDateField(e.target.value as "createdAt" | "redeemedAt");
            setPage(1);
          }}
          className="h-10 rounded-lg border border-border bg-input px-3 text-sm"
        >
          <option value="createdAt">Fecha de compra</option>
          <option value="redeemedAt">Fecha de redención</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Desde</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-border bg-input px-3 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-border bg-input px-3 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-foreground">
                  Fecha de compra
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-foreground">
                  Fecha de redención
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-foreground">Cliente</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-foreground">Películas</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-foreground">Tickets</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-foreground">Total</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-foreground">Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    No hay órdenes que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const tickets = order.items.reduce((n, it) => n + it.quantity, 0);
                  const latestRedemption = getLatestRedemption(order);
                  return (
                    <tr key={order.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-6 py-4 text-sm text-foreground">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {latestRedemption ? (
                          formatDateTime(latestRedemption)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {(() => {
                          const name = order.buyerName ?? order.user?.name;
                          const email = order.buyerEmail ?? order.user?.email;
                          if (!name && !email) return "Invitado";
                          return (
                            <>
                              {name && <p className="font-medium">{name}</p>}
                              {email && (
                                <p className={name ? "text-xs text-muted-foreground" : undefined}>
                                  {email}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        <ul className="space-y-0.5">
                          {order.items.map((it) => (
                            <li key={it.id}>
                              <span className="font-medium">{it.event.name}</span>
                              {it.screening && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {it.screening.date} {formatTime12h(it.screening.time)}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{tickets}</td>
                      <td className="px-6 py-4 text-sm font-bold text-primary">
                        {formatPrice(order.totalInCents)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            STATUS_STYLES[order.status] ?? "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page === 1}
                className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
              />
            </PaginationItem>
            {getPageNumbers(page, totalPages).map((p, idx) =>
              p === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      if (p !== page) setPage(p);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page === totalPages}
                className={page === totalPages ? "pointer-events-none opacity-50" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) setPage(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

function getPageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}
