'use client'

import React, { useState, useEffect, useTransition } from "react"
import { Plus, Trash2, Edit2, Loader, BarChart3, Package, Users } from 'lucide-react'
import { createEvent, updateEvent, getEvents, deleteEvent } from "@/app/actions/events"

type AdminTab = 'dashboard' | 'events' | 'subscriptions'

type Event = {
  id: string
  sku: string
  name: string
  description: string
  longDescription: string
  category: string
  image: string
  date: string
  time: string
  venue: string
  city: string
  priceInCents: number
  availableTickets: number
  featured: boolean
}

const EMPTY_FORM = {
  sku: '',
  name: '',
  description: '',
  longDescription: '',
  category: 'cine',
  date: '',
  time: '',
  venue: '',
  city: '',
  priceInCents: 0,
  availableTickets: 0,
  featured: false,
  image: null as File | null,
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(() => setError("Error al cargar eventos"))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const fd = new FormData()
    fd.set("sku", formData.sku)
    fd.set("name", formData.name)
    fd.set("description", formData.description)
    fd.set("longDescription", formData.longDescription)
    fd.set("category", formData.category)
    fd.set("date", formData.date)
    fd.set("time", formData.time)
    fd.set("venue", formData.venue)
    fd.set("city", formData.city)
    fd.set("priceInCents", String(formData.priceInCents))
    fd.set("availableTickets", String(formData.availableTickets))
    fd.set("featured", String(formData.featured))
    if (formData.image) {
      fd.set("image", formData.image)
    }

    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = editingId
        ? await updateEvent(editingId, fd)
        : await createEvent(fd)

      if (result.error) {
        const err = result.error
        const messages = typeof err === 'string'
          ? err
          : Object.values(err as Record<string, string[]>).flat().join(', ')
        setError(messages)
        return
      }

      const refreshed = await getEvents()
      setEvents(refreshed)
      setFormData(EMPTY_FORM)
      setEditingId(null)
      setShowForm(false)
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este evento?')) return

    startTransition(async () => {
      const result = await deleteEvent(id)
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      setEvents(events.filter((ev) => ev.id !== id))
    })
  }

  const handleEdit = (event: Event) => {
    setFormData({
      sku: event.sku,
      name: event.name,
      description: event.description,
      longDescription: event.longDescription,
      category: event.category,
      date: event.date,
      time: event.time,
      venue: event.venue,
      city: event.city,
      priceInCents: event.priceInCents,
      availableTickets: event.availableTickets,
      featured: event.featured,
      image: null,
    })
    setEditingId(event.id)
    setShowForm(true)
  }

  const set = (field: string, value: string | number | boolean | File | null) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-border bg-white shadow-sm" style={{ backgroundColor: "#333333" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo-nave.svg" alt="EntradasYA" className="h-10 w-auto" />
            <span className="text-xl font-bold text-white font-display hidden sm:inline">
              EntradasYA Admin
            </span>
          </div>
          <div className="text-sm text-white/80">Panel de administración</div>
        </div>
      </nav>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
        {/* Sidebar */}
        <aside className="w-48 space-y-1">
          {([
            { key: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
            { key: 'events' as const, label: 'Eventos', icon: Package },
            { key: 'subscriptions' as const, label: 'Suscripciones', icon: Users },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-primary text-white shadow-md'
                  : 'text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-foreground font-display">Panel de Control</h1>
                <p className="text-muted-foreground">Bienvenido al panel administrativo de EntradasYA</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Eventos</p>
                      <p className="text-2xl font-bold text-foreground">{events.length}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                      <Users className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Suscriptores</p>
                      <p className="text-2xl font-bold text-foreground">0</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
                      <BarChart3 className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Ingresos</p>
                      <p className="text-2xl font-bold text-foreground">$0</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div>
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground font-display">Eventos</h2>
                  <p className="text-muted-foreground">Gestiona tus eventos (se sincronizan con N1CO)</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setFormData(EMPTY_FORM)
                    setShowForm(!showForm)
                  }}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Evento
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              {showForm && (
                <form
                  onSubmit={handleSubmit}
                  className="mb-8 rounded-lg border border-border bg-card p-6 shadow-sm"
                >
                  <h3 className="mb-4 text-lg font-bold text-foreground font-display">
                    {editingId ? 'Editar Evento' : 'Crear Evento'}
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      type="text"
                      placeholder="SKU"
                      value={formData.sku}
                      onChange={(e) => set('sku', e.target.value)}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={formData.name}
                      onChange={(e) => set('name', e.target.value)}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Descripción"
                      value={formData.description}
                      onChange={(e) => set('description', e.target.value)}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                      required
                    />
                    <textarea
                      placeholder="Descripción larga"
                      value={formData.longDescription}
                      onChange={(e) => set('longDescription', e.target.value)}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm md:col-span-2"
                      rows={3}
                      required
                    />
                    <select
                      value={formData.category}
                      onChange={(e) => set('category', e.target.value)}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                      required
                    >
                      <option value="cine">Cine</option>
                      <option value="teatro">Teatro</option>
                      <option value="concierto">Concierto</option>
                      <option value="popup">Pop Up</option>
                    </select>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Imagen</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => set('image', e.target.files?.[0] ?? null)}
                        className="rounded-lg border border-border bg-input px-3 py-2 text-sm w-full"
                        required={!editingId}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Fecha</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => set('date', e.target.value)}
                        className="rounded-lg border border-border bg-input px-3 py-2 text-sm w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Hora</label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => set('time', e.target.value)}
                        className="rounded-lg border border-border bg-input px-3 py-2 text-sm w-full"
                        required
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Venue"
                      value={formData.venue}
                      onChange={(e) => set('venue', e.target.value)}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Ciudad"
                      value={formData.city}
                      onChange={(e) => set('city', e.target.value)}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                      required
                    />
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Precio (centavos)</label>
                      <input
                        type="number"
                        placeholder="Precio en centavos"
                        value={formData.priceInCents || ''}
                        onChange={(e) => set('priceInCents', parseInt(e.target.value) || 0)}
                        className="rounded-lg border border-border bg-input px-3 py-2 text-sm w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Tickets disponibles</label>
                      <input
                        type="number"
                        placeholder="Tickets"
                        value={formData.availableTickets || ''}
                        onChange={(e) => set('availableTickets', parseInt(e.target.value) || 0)}
                        className="rounded-lg border border-border bg-input px-3 py-2 text-sm w-full"
                        required
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm md:col-span-2">
                      <input
                        type="checkbox"
                        checked={formData.featured}
                        onChange={(e) => set('featured', e.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                      Evento destacado
                    </label>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      {isPending && <Loader className="h-4 w-4 animate-spin" />}
                      {editingId ? 'Actualizar' : 'Crear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition-all hover:bg-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

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
                        <th className="px-6 py-3 text-left text-sm font-bold text-foreground">Fecha</th>
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
                              <img
                                src={event.image}
                                alt={event.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-foreground">{event.name}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className="inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary capitalize">
                                {event.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground">{event.date} {event.time}</td>
                            <td className="px-6 py-4 text-sm font-bold text-primary">
                              ${(event.priceInCents / 100).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground">{event.availableTickets}</td>
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
            </div>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <div>
              <div>
                <h2 className="text-2xl font-bold text-foreground font-display">Suscripciones</h2>
                <p className="text-muted-foreground">Gestiona las suscripciones de usuarios</p>
              </div>

              <div className="mt-6 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No hay suscripciones registradas aún</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
