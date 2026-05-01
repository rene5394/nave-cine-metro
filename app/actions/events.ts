'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  createProducts,
  updateProducts,
  getLatestProduct,
  type N1COProductSync,
} from '@/lib/n1co'
import { uploadImage, deleteImage } from '@/lib/s3'
import path from 'path'

type EventCategory = 'cine' | 'teatro' | 'concierto' | 'popup'

export async function getEvents({
  page = 1,
  pageSize = 10,
  name,
  category,
  featured,
}: {
  page?: number
  pageSize?: number
  name?: string
  category?: EventCategory
  featured?: boolean
} = {}) {
  const safePage = Math.max(1, Math.floor(page))
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)))
  const skip = (safePage - 1) * safePageSize

  const where = {
    ...(name && name.trim()
      ? { name: { contains: name.trim(), mode: 'insensitive' as const } }
      : {}),
    ...(category ? { category } : {}),
    ...(featured ? { featured: true } : {}),
  }

  const [events, totalCount] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: safePageSize,
    }),
    prisma.event.count({ where }),
  ])

  return {
    events,
    totalCount,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / safePageSize)),
  }
}

export async function getEventsCount() {
  return prisma.event.count()
}

export async function deleteEvent(id: string) {
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) return { error: 'Event not found' }

  await deleteImage(event.image)
  await prisma.event.delete({ where: { id } })

  return { success: true }
}

const stringBoolean = z.preprocess(
  (v) => v === 'true' || v === true,
  z.boolean(),
)

const eventFieldsSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  longDescription: z.string().min(1),
  category: z.enum(['cine', 'teatro', 'concierto', 'popup']),
  date: z.string().min(1),
  time: z.string().min(1),
  venue: z.string().min(1),
  city: z.string().min(1),
  priceInCents: z.coerce.number().int().positive(),
  availableTickets: z.coerce.number().int().nonnegative(),
  featured: stringBoolean.default(false),
  syncN1co: stringBoolean.default(false),
  n1coProductId: z.string().optional().default(''),
})

function toN1COProduct(
  event: Omit<
    z.infer<typeof eventFieldsSchema>,
    'syncN1co' | 'n1coProductId'
  > & { image: string },
): N1COProductSync {
  return {
    sku: event.sku,
    name: event.name,
    description: event.description,
    stock: event.availableTickets,
    price: event.priceInCents / 100,
    collections: [event.category],
    image: event.image,
    enable: true,
    salesChannel: ['PaymentLink'],
    locations: [{ locationCode: event.venue, isAvailable: true }],
    modifiers: [],
    images: [event.image],
  }
}

const FIELD_LABELS: Record<string, string> = {
  sku: 'SKU',
  n1coProductId: 'ID de N1co',
}

function extractConflictFields(target: unknown): string[] {
  if (Array.isArray(target)) return target as string[]
  if (typeof target === 'string') {
    return Object.keys(FIELD_LABELS).filter((f) =>
      target.toLowerCase().includes(f.toLowerCase()),
    )
  }
  return []
}

function formatPrismaError(error: unknown): Record<string, string[]> {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (code === 'P2002') {
      const target = (error as { meta?: { target?: unknown } }).meta?.target
      const fields = extractConflictFields(target)
      const field = fields[0]
      if (field) {
        const label = FIELD_LABELS[field] ?? field
        return { [field]: [`Ya existe un evento con este ${label}`] }
      }
      return { form: ['Ya existe un evento con uno de los datos ingresados'] }
    }
    if (code === 'P2025') {
      return { form: ['El evento no existe o fue eliminado'] }
    }
  }
  console.error('Unexpected Prisma error:', error)
  return { form: ['Ocurrió un error al guardar el evento. Intenta de nuevo.'] }
}

async function uploadEventImage(file: File, sku: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = path.extname(file.name) || '.jpg'
  const key = `events/${sku}-${Date.now()}${ext}`
  return uploadImage(buffer, key, file.type || 'image/jpeg')
}

export async function createEvent(formData: FormData) {
  const fields = Object.fromEntries(formData.entries())
  const imageFile = formData.get('image') as File | null

  if (!imageFile || imageFile.size === 0) {
    return { error: { image: ['Image file is required'] } }
  }

  const parsed = eventFieldsSchema.safeParse(fields)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const imageUrl = await uploadEventImage(imageFile, parsed.data.sku)
  const { syncN1co, n1coProductId, ...eventFields } = parsed.data
  const eventData = {
    ...eventFields,
    image: imageUrl,
    n1coProductId: syncN1co && n1coProductId ? n1coProductId : null,
  }

  let event
  try {
    event = await prisma.event.create({ data: eventData })
  } catch (error) {
    await deleteImage(imageUrl).catch(() => {})
    return { error: formatPrismaError(error) }
  }

  try {
    await createProducts([toN1COProduct({ ...eventFields, image: imageUrl })])

    if (!event.n1coProductId) {
      const latest = await getLatestProduct()
      if (latest) {
        await prisma.event.update({
          where: { id: event.id },
          data: { n1coProductId: String(latest.productId) },
        })
      }
    }
  } catch (error) {
    console.warn(
      'N1CO sync failed on create:',
      error instanceof Error ? error.message : error,
    )
  }

  return { event }
}

export async function updateEvent(id: string, formData: FormData) {
  const fields = Object.fromEntries(formData.entries())
  const imageFile = formData.get('image') as File | null

  const parsed = eventFieldsSchema.safeParse(fields)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const existing = await prisma.event.findUniqueOrThrow({ where: { id } })

  let imageUrl: string
  if (imageFile && imageFile.size > 0) {
    await deleteImage(existing.image)
    imageUrl = await uploadEventImage(imageFile, parsed.data.sku)
  } else {
    imageUrl = existing.image
  }

  const { syncN1co, n1coProductId, ...eventFields } = parsed.data
  const eventData = {
    ...eventFields,
    image: imageUrl,
    n1coProductId: syncN1co && n1coProductId ? n1coProductId : null,
  }
  let event
  try {
    event = await prisma.event.update({ where: { id }, data: eventData })
  } catch (error) {
    if (imageFile && imageFile.size > 0 && imageUrl !== existing.image) {
      await deleteImage(imageUrl).catch(() => {})
    }
    return { error: formatPrismaError(error) }
  }

  const n1coProduct = toN1COProduct({ ...eventFields, image: imageUrl })
  try {
    if (event.n1coProductId) {
      await updateProducts([n1coProduct])
    } else {
      await createProducts([n1coProduct])
    }
  } catch (error) {
    console.warn(
      'N1CO sync failed on update:',
      error instanceof Error ? error.message : error,
    )
  }

  return { event }
}
