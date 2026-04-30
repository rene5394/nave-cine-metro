"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { syncProducts, getLatestProduct, type N1COProductSync } from "@/lib/n1co"
import { uploadImage, deleteImage } from "@/lib/s3"
import path from "path"

export async function getEvents() {
  return prisma.event.findMany({ orderBy: { createdAt: "desc" } })
}

export async function deleteEvent(id: string) {
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) return { error: "Event not found" }

  await deleteImage(event.image)
  await prisma.event.delete({ where: { id } })

  return { success: true }
}

const eventFieldsSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  longDescription: z.string().min(1),
  category: z.enum(["cine", "teatro", "concierto", "popup"]),
  date: z.string().min(1),
  time: z.string().min(1),
  venue: z.string().min(1),
  city: z.string().min(1),
  priceInCents: z.coerce.number().int().positive(),
  availableTickets: z.coerce.number().int().nonnegative(),
  featured: z.coerce.boolean().default(false),
  syncN1co: z.coerce.boolean().default(false),
  n1coProductId: z.string().optional().default(""),
})

function toN1COProduct(
  event: Omit<z.infer<typeof eventFieldsSchema>, "syncN1co" | "n1coProductId"> & { image: string },
): N1COProductSync {
  return {
    sku: event.sku,
    name: event.name,
    description: event.description,
    extraDescription: event.longDescription,
    stock: event.availableTickets,
    price: event.priceInCents / 100,
    collections: [event.category],
    image: event.image,
    enable: true,
    salesChannel: ["PaymentLink"],
    locations: [{ locationCode: event.venue, isAvailable: true }],
    modifiers: [],
    images: [event.image],
  }
}

async function uploadEventImage(file: File, sku: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = path.extname(file.name) || ".jpg"
  const key = `events/${sku}-${Date.now()}${ext}`
  return uploadImage(buffer, key, file.type || "image/jpeg")
}

export async function createEvent(formData: FormData) {
  const fields = Object.fromEntries(formData.entries())
  const imageFile = formData.get("image") as File | null

  if (!imageFile || imageFile.size === 0) {
    return { error: { image: ["Image file is required"] } }
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

  const event = await prisma.event.create({ data: eventData })

  try {
    await syncProducts([toN1COProduct({ ...eventFields, image: imageUrl })])

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
      "N1CO sync failed on create:",
      error instanceof Error ? error.message : error,
    )
  }

  return { event }
}

export async function updateEvent(id: string, formData: FormData) {
  const fields = Object.fromEntries(formData.entries())
  const imageFile = formData.get("image") as File | null

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
  const event = await prisma.event.update({ where: { id }, data: eventData })

  try {
    await syncProducts([toN1COProduct({ ...eventFields, image: imageUrl })])
  } catch (error) {
    console.warn(
      "N1CO sync failed on update:",
      error instanceof Error ? error.message : error,
    )
  }

  return { event }
}
