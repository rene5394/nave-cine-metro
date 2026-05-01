'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import { Plus, Trash2, Edit2, Loader } from 'lucide-react'
import {
  createEvent,
  updateEvent,
  getEvents,
  deleteEvent,
} from '@/app/actions/events'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

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
  n1coProductId: string | null
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
  syncN1co: false,
  n1coProductId: '',
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()
  const dialogContentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (error && dialogContentRef.current) {
      dialogContentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [error])

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(() => setError('Error al cargar eventos'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const fd = new FormData()
    fd.set('sku', formData.sku)
    fd.set('name', formData.name)
    fd.set('description', formData.description)
    fd.set('longDescription', formData.longDescription)
    fd.set('category', formData.category)
    fd.set('date', formData.date)
    fd.set('time', formData.time)
    fd.set('venue', formData.venue)
    fd.set('city', formData.city)
    fd.set('priceInCents', String(formData.priceInCents))
    fd.set('availableTickets', String(formData.availableTickets))
    fd.set('featured', String(formData.featured))
    fd.set('syncN1co', String(formData.syncN1co))
    fd.set('n1coProductId', formData.n1coProductId)
    if (formData.image) {
      fd.set('image', formData.image)
    }

    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = editingId
        ? await updateEvent(editingId, fd)
        : await createEvent(fd)

      if (result.error) {
        const err = result.error
        const messages =
          typeof err === 'string'
            ? err
            : Object.values(err as Record<string, string[]>)
                .flat()
                .join(', ')
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
      syncN1co: !!event.n1coProductId,
      n1coProductId: event.n1coProductId ?? '',
    })
    setEditingId(event.id)
    setError(null)
    setShowForm(true)
  }

  const set = (field: string, value: string | number | boolean | File | null) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  return (
    <div>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-foreground font-display'>
            Eventos
          </h2>
          <p className='text-muted-foreground'>
            Gestiona tus eventos (se sincronizan con N1CO)
          </p>
        </div>
        <button
          type='button'
          onClick={() => {
            setEditingId(null)
            setFormData(EMPTY_FORM)
            setError(null)
            setShowForm(!showForm)
          }}
          className='flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg'
        >
          <Plus className='h-4 w-4' />
          Nuevo Evento
        </button>
      </div>

      {error && !showForm && (
        <div className='mb-4 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive'>
          {error}
        </div>
      )}

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false)
            setEditingId(null)
            setFormData(EMPTY_FORM)
            setError(null)
          }
        }}
      >
        <DialogContent
          ref={dialogContentRef}
          className='max-w-2xl max-h-[85vh] overflow-y-auto'
        >
          <DialogHeader>
            <DialogTitle className='font-display'>
              {editingId ? 'Editar Evento' : 'Crear Evento'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Modifica los datos del evento.'
                : 'Completa los datos para crear un nuevo evento.'}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className='mb-4 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive'>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <label className='mb-1 block text-xs text-muted-foreground'>
                  SKU
                </label>
                <input
                  type='text'
                  placeholder='SKU'
                  value={formData.sku}
                  onChange={(e) => set('sku', e.target.value)}
                  className='rounded-lg border border-border bg-input px-3 py-2 text-sm w-full'
                  disabled={!!editingId}
                  required={!editingId}
                />
              </div>
              <div>
                <label className='mb-1 block text-xs text-muted-foreground'>
                  Nombre
                </label>
                <input
                  type='text'
                  placeholder='Nombre'
                  value={formData.name}
                  onChange={(e) => set('name', e.target.value)}
                  className='rounded-lg border border-border bg-input px-3 py-2 text-sm w-full'
                  required
                />
              </div>
              <div>
                <label className='mb-1 block text-xs text-muted-foreground'>
                  Descripción
                </label>
                <input
                  type='text'
                  placeholder='Descripción'
                  value={formData.description}
                  onChange={(e) => set('description', e.target.value)}
                  className='rounded-lg border border-border bg-input px-3 py-2 text-sm w-full'
                  required
                />
              </div>
              <div className='md:col-span-2'>
                <label className='mb-1 block text-xs text-muted-foreground'>
                  Descripción larga
                </label>
                <textarea
                  placeholder='Descripción larga'
                  value={formData.longDescription}
                  onChange={(e) => set('longDescription', e.target.value)}
                  className='rounded-lg border border-border bg-input px-3 py-2 text-sm w-full'
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className='mb-1 block text-xs text-muted-foreground'>
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => set('category', e.target.value)}
                  className='h-10 rounded-lg border border-border bg-input px-3 py-2 text-sm w-full'
                  required
                >
                  <option value='cine'>Cine</option>
                  <option value='teatro'>Teatro</option>
                  <option value='concierto'>Concierto</option>
                  <option value='popup'>Pop Up</option>
                </select>
              </div>
              <div>
                <label className='mb-1 block text-xs text-muted-foreground'>
                  Imagen
                </label>
                <input
                  type='file'
                  accept='image/*'
                  onChange={(e) => set('image', e.target.files?.[0] ?? null)}
                  className='rounded-lg border border-border bg-input px-3 py-2 text-sm w-full'
                  required={!editingId}
                  disabled={!!editingId}
                />
              </div>
              <div>
                <label className='mb-1 block text-xs text-muted-foreground'>
                  Fecha
                </label>
                <input
                  type='date'
                  value={formData.date}
                  onChange={(e) => set('date', e.target.value)}
                  className='rounded-lg border border-border bg-input px-3 py-2 text-sm w-full'
                  required
                />
              </div>
              <div>
                <label className='mb-1 block text-xs text-muted-foreground'>
                  Hora
                </label>
                <input
                  type='time'
                  value={formData.time}
                  onChange={(e) => set('time', e.target.value)}
                  className='rounded-lg border border-border bg-input px-3 py-2 text-sm w-full'
                  required
                />
              </div>
              <div>
                <label className='mb-1 block text-xs text-muted-foreground'>
                  Venue
                </label>
                <input
                  type='text'
                  placeholder='Venue'
                  value={formData.venue}
                  onChange={(e) => set('venue', e.target.value)}
                  className='rounded-lg border border-border bg-input px-3 py-2 text-sm w-full'
                  required
                />
              </div>
              <div>
                <label className='mb-1 block text-xs text-muted-foreground'>
                  Ciudad
                </label>
                <input
                  type='text'
                  placeholder='Ciudad'
                  value={formData.city}
                  onChange={(e) => set('city', e.target.value)}
                  className='rounded-lg border border-border bg-input px-3 py-2 text-sm w-full'
                  required
                />
              </div>
              <div>
                <label className='mb-1 block text-xs text-muted-foreground'>
                  Precio (centavos)
                </label>
                <input
                  type='number'
                  placeholder='Precio en centavos'
                  value={formData.priceInCents || ''}
                  onChange={(e) =>
                    set('priceInCents', parseInt(e.target.value) || 0)
                  }
                  className='rounded-lg border border-border bg-input px-3 py-2 text-sm w-full'
                  required
                />
              </div>
              <div>
                <label className='mb-1 block text-xs text-muted-foreground'>
                  Tickets disponibles
                </label>
                <input
                  type='number'
                  placeholder='Tickets'
                  value={formData.availableTickets || ''}
                  onChange={(e) =>
                    set('availableTickets', parseInt(e.target.value) || 0)
                  }
                  className='rounded-lg border border-border bg-input px-3 py-2 text-sm w-full'
                  required
                />
              </div>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={formData.featured}
                  onChange={(e) => set('featured', e.target.checked)}
                  className='h-4 w-4 rounded border-border'
                />
                Evento destacado
              </label>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={formData.syncN1co}
                  disabled={!!editingId}
                  onChange={(e) => {
                    set('syncN1co', e.target.checked)
                    if (!e.target.checked) set('n1coProductId', '')
                  }}
                  className='h-4 w-4 rounded border-border'
                />
                Ya existe en N1co
              </label>
              {formData.syncN1co && (
                <input
                  type='text'
                  placeholder='N1co product id'
                  value={formData.n1coProductId}
                  onChange={(e) => set('n1coProductId', e.target.value)}
                  className='rounded-lg border border-border bg-input px-3 py-2 text-sm md:col-span-2'
                  required
                  disabled={!!editingId}
                />
              )}
            </div>

            <div className='mt-4 flex gap-2'>
              <button
                type='submit'
                disabled={isPending}
                className='flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg disabled:opacity-50'
              >
                {isPending && <Loader className='h-4 w-4 animate-spin' />}
                {editingId ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type='button'
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                  setFormData(EMPTY_FORM)
                  setError(null)
                }}
                className='rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition-all hover:bg-secondary'
              >
                Cancelar
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <Loader className='h-6 w-6 animate-spin text-primary' />
        </div>
      ) : (
        <div className='overflow-x-auto rounded-lg border border-border shadow-sm'>
          <table className='w-full'>
            <thead className='bg-secondary/50'>
              <tr>
                <th className='px-6 py-3 text-left text-sm font-bold text-foreground'>
                  Imagen
                </th>
                <th className='px-6 py-3 text-left text-sm font-bold text-foreground'>
                  Nombre
                </th>
                <th className='px-6 py-3 text-left text-sm font-bold text-foreground'>
                  Categoría
                </th>
                <th className='px-6 py-3 text-left text-sm font-bold text-foreground'>
                  Fecha
                </th>
                <th className='px-6 py-3 text-left text-sm font-bold text-foreground'>
                  Precio
                </th>
                <th className='px-6 py-3 text-left text-sm font-bold text-foreground'>
                  Tickets
                </th>
                <th className='px-6 py-3 text-left text-sm font-bold text-foreground'>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className='px-6 py-8 text-center text-muted-foreground'
                  >
                    No hay eventos. Crea uno para empezar.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className='border-t border-border hover:bg-secondary/30'
                  >
                    <td className='px-6 py-4 text-sm'>
                      <img
                        src={event.image}
                        alt={event.name}
                        className='h-10 w-10 rounded object-cover'
                      />
                    </td>
                    <td className='px-6 py-4 text-sm font-medium text-foreground'>
                      {event.name}
                    </td>
                    <td className='px-6 py-4 text-sm'>
                      <span className='inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary capitalize'>
                        {event.category}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-sm text-foreground'>
                      {event.date} {event.time}
                    </td>
                    <td className='px-6 py-4 text-sm font-bold text-primary'>
                      ${(event.priceInCents / 100).toFixed(2)}
                    </td>
                    <td className='px-6 py-4 text-sm text-foreground'>
                      {event.availableTickets}
                    </td>
                    <td className='px-6 py-4 text-sm'>
                      <div className='flex gap-2'>
                        <button
                          type='button'
                          onClick={() => handleEdit(event)}
                          className='flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10'
                        >
                          <Edit2 className='h-3 w-3' />
                          Editar
                        </button>
                        <button
                          type='button'
                          onClick={() => handleDelete(event.id)}
                          className='flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10'
                        >
                          <Trash2 className='h-3 w-3' />
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
  )
}
