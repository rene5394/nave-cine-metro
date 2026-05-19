"use client";

import React, { useCallback, useState, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import { Plus, Trash2, Edit2, Loader, Star, Search } from "lucide-react";
import { createEvent, updateEvent, getEvents, deleteEvent } from "@/app/actions/events";
import { getCategories } from "@/app/actions/categories";
import { categoryBadgeStyle } from "@/lib/category-color";
import { formatPrice } from "@/lib/events-shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type Category = Awaited<ReturnType<typeof getCategories>>[number];

type ScreeningRow = {
  id: string;
  date: string;
  time: string;
  availableTickets: number;
};

type Event = {
  id: string;
  sku: string;
  name: string;
  description: string;
  longDescription: string;
  categoryId: string;
  category: Category;
  image: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  priceInCents: number;
  featured: boolean;
  n1coProductId: string | null;
  screenings: ScreeningRow[];
};

type ScreeningFormRow = {
  id?: string;
  date: string;
  time: string;
  availableTickets: number | "";
};

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  sku: "",
  name: "",
  description: "",
  longDescription: "",
  categoryId: "",
  date: "",
  time: "",
  venue: "",
  city: "",
  priceInCents: 0,
  featured: false,
  image: null as File | null,
  syncN1co: false,
  n1coProductId: "",
  screenings: [] as ScreeningFormRow[],
};

export default function EventsPage() {
  const today = new Date().toLocaleDateString("en-CA");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [priceInput, setPriceInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [nameFilter, setNameFilter] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Load categories for the filter and form selects (setState happens
    // inside an async callback, not in the effect body).
    getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(nameFilter), 300);
    return () => clearTimeout(t);
  }, [nameFilter]);

  useEffect(() => {
    if (error && dialogContentRef.current) {
      dialogContentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [error]);

  const refresh = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      try {
        const result = await getEvents({
          page: targetPage,
          pageSize: PAGE_SIZE,
          name: debouncedName || undefined,
          categoryId: categoryFilter || undefined,
          featured: featuredOnly || undefined,
        });
        setEvents(result.events);
        setTotalPages(result.totalPages);
        if (result.page !== targetPage) {
          setPage(result.page);
        }
      } catch {
        setError("Error al cargar eventos");
      } finally {
        setLoading(false);
      }
    },
    [page, debouncedName, categoryFilter, featuredOnly],
  );

  useEffect(() => {
    // Data fetching effect: syncs UI with backend on filter/page change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedName, categoryFilter, featuredOnly]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("sku", formData.sku);
    fd.set("name", formData.name);
    fd.set("description", formData.description);
    fd.set("longDescription", formData.longDescription);
    fd.set("categoryId", formData.categoryId);
    fd.set("date", formData.date);
    fd.set("time", formData.time);
    fd.set("venue", formData.venue);
    fd.set("city", formData.city);
    fd.set("priceInCents", String(formData.priceInCents));
    fd.set(
      "screenings",
      JSON.stringify(
        formData.screenings.map((s) => ({
          ...(s.id ? { id: s.id } : {}),
          date: s.date,
          time: s.time,
          availableTickets: s.availableTickets === "" ? 0 : s.availableTickets,
        })),
      ),
    );
    fd.set("featured", String(formData.featured));
    fd.set("syncN1co", String(formData.syncN1co));
    fd.set("n1coProductId", formData.n1coProductId);
    if (formData.image) {
      fd.set("image", formData.image);
    }

    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = editingId ? await updateEvent(editingId, fd) : await createEvent(fd);

      if (result.error) {
        const err = result.error;
        const messages =
          typeof err === "string"
            ? err
            : Object.values(err as Record<string, string[]>)
                .flat()
                .join(", ");
        setError(messages);
        return;
      }

      if (editingId) {
        await refresh(page);
      } else if (page === 1) {
        await refresh(1);
      } else {
        setPage(1);
      }
      setFormData(EMPTY_FORM);
      setPriceInput("");
      setEditingId(null);
      setShowForm(false);
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este evento?")) return;

    startTransition(async () => {
      const result = await deleteEvent(id);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (events.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await refresh(page);
      }
    });
  };

  const handleEdit = (event: Event) => {
    setFormData({
      sku: event.sku,
      name: event.name,
      description: event.description,
      longDescription: event.longDescription,
      categoryId: event.categoryId,
      date: event.date,
      time: event.time,
      venue: event.venue,
      city: event.city,
      priceInCents: event.priceInCents,
      featured: event.featured,
      image: null,
      syncN1co: !!event.n1coProductId,
      n1coProductId: event.n1coProductId ?? "",
      screenings: event.screenings.map((s) => ({
        id: s.id,
        date: s.date,
        time: s.time,
        availableTickets: s.availableTickets,
      })),
    });
    setPriceInput((event.priceInCents / 100).toFixed(2));
    setEditingId(event.id);
    setError(null);
    setShowForm(true);
  };

  const set = (field: string, value: string | number | boolean | File | null) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Eventos</h2>
          <p className="text-muted-foreground">Gestiona tus eventos (se sincronizan con N1CO)</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setFormData(EMPTY_FORM);
            setPriceInput("");
            setError(null);
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Nuevo Evento
        </button>
      </div>

      {error && !showForm && (
        <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre…"
            value={nameFilter}
            onChange={(e) => {
              setNameFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-border bg-input py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-border bg-input px-3 text-sm md:w-48"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={featuredOnly}
            onChange={(e) => {
              setFeaturedOnly(e.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 rounded border-border"
          />
          Solo destacados
        </label>
      </div>

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditingId(null);
            setFormData(EMPTY_FORM);
            setPriceInput("");
            setError(null);
          }
        }}
      >
        <DialogContent ref={dialogContentRef} className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingId ? "Editar Evento" : "Crear Evento"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Modifica los datos del evento."
                : "Completa los datos para crear un nuevo evento."}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">SKU</label>
                <input
                  type="text"
                  placeholder="SKU"
                  value={formData.sku}
                  onChange={(e) => set("sku", e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                  disabled={!!editingId}
                  required={!editingId}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Nombre</label>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={formData.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Descripción</label>
                <input
                  type="text"
                  placeholder="Descripción"
                  value={formData.description}
                  onChange={(e) => set("description", e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Descripción larga
                </label>
                <textarea
                  placeholder="Descripción larga"
                  value={formData.longDescription}
                  onChange={(e) => set("longDescription", e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Categoría</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                  required
                >
                  <option value="" disabled>
                    Selecciona una categoría
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Imagen</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => set("image", e.target.files?.[0] ?? null)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                  required={!editingId}
                  disabled={!!editingId}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Fecha</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => set("date", e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Hora</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => set("time", e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Venue</label>
                <input
                  type="text"
                  placeholder="Venue"
                  value={formData.venue}
                  onChange={(e) => set("venue", e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Ciudad</label>
                <input
                  type="text"
                  placeholder="Ciudad"
                  value={formData.city}
                  onChange={(e) => set("city", e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Precio (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={priceInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setPriceInput(raw);
                    const parsed = parseFloat(raw);
                    set("priceInCents", Number.isFinite(parsed) ? Math.round(parsed * 100) : 0);
                  }}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Evento destacado
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.syncN1co}
                  disabled={!!editingId}
                  onChange={(e) => {
                    set("syncN1co", e.target.checked);
                    if (!e.target.checked) set("n1coProductId", "");
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                Ya existe en N1co
              </label>
              {formData.syncN1co && (
                <div className="flex flex-col gap-1 md:col-span-2">
                  <input
                    type="text"
                    placeholder="N1co product id"
                    value={formData.n1coProductId}
                    onChange={(e) => set("n1coProductId", e.target.value)}
                    className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                    required
                    disabled={!!editingId}
                  />
                  <p className="text-xs text-muted-foreground">
                    El N1co product id es el último segmento numérico en la URL del producto en
                    N1co.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Funciones</h3>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      screenings: [
                        ...prev.screenings,
                        { date: "", time: "", availableTickets: "" },
                      ],
                    }))
                  }
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  <Plus className="h-3 w-3" />
                  Agregar función
                </button>
              </div>

              {formData.screenings.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  Agrega al menos una función con fecha, hora y cupo de tickets.
                </p>
              ) : (
                <div className="space-y-2">
                  {formData.screenings.map((s, idx) => (
                    <div
                      key={s.id ?? `new-${idx}`}
                      className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                    >
                      <input
                        type="date"
                        value={s.date}
                        min={today}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            screenings: prev.screenings.map((row, i) =>
                              i === idx ? { ...row, date: e.target.value } : row,
                            ),
                          }))
                        }
                        className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                        required
                      />
                      <input
                        type="time"
                        value={s.time}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            screenings: prev.screenings.map((row, i) =>
                              i === idx ? { ...row, time: e.target.value } : row,
                            ),
                          }))
                        }
                        className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                        required
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Tickets"
                        value={s.availableTickets}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            screenings: prev.screenings.map((row, i) =>
                              i === idx
                                ? {
                                    ...row,
                                    availableTickets:
                                      e.target.value === "" ? "" : parseInt(e.target.value) || 0,
                                  }
                                : row,
                            ),
                          }))
                        }
                        className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            screenings: prev.screenings.filter((_, i) => i !== idx),
                          }))
                        }
                        className="flex items-center justify-center rounded-lg px-2 py-2 text-destructive transition-colors hover:bg-destructive/10"
                        aria-label="Eliminar función"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg disabled:opacity-50"
              >
                {isPending && <Loader className="h-4 w-4 animate-spin" />}
                {editingId ? "Actualizar" : "Crear"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData(EMPTY_FORM);
                  setPriceInput("");
                  setError(null);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition-all hover:bg-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-foreground">Imagen</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-foreground">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-foreground">Categoría</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-foreground">Funciones</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-foreground">Precio</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-foreground">Tickets</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    No hay eventos. Crea uno para empezar.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-6 py-4 text-sm">
                      <Image
                        src={event.image}
                        alt={event.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded object-cover"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {event.featured && (
                          <Star
                            className="h-4 w-4 fill-amber-400 text-amber-400"
                            aria-label="Evento destacado"
                          />
                        )}
                        {event.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        style={categoryBadgeStyle(event.category.color)}
                        className="inline-block rounded-full px-3 py-1 text-xs font-medium"
                      >
                        {event.category.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {event.screenings.length === 0
                        ? "—"
                        : event.screenings.length === 1
                          ? `${event.screenings[0].date} ${event.screenings[0].time}`
                          : `${event.screenings.length} funciones`}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">
                      {formatPrice(event.priceInCents)}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {event.screenings.reduce((n, s) => n + s.availableTickets, 0)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(event)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                        >
                          <Edit2 className="h-3 w-3" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(event.id)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
