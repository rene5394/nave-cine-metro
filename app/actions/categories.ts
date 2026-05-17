"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { syncCollections, type N1COCollection } from "@/lib/n1co";

const slugSchema = z
  .string()
  .min(1, "El slug es requerido")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug debe ser minúsculas, números y guiones");

const categoryInputSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1, "El nombre es requerido"),
  color: z.string().min(1, "El color es requerido"),
  description: z
    .string()
    .transform((v) => v.trim())
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
});

type CategoryResult = { success: true } | { success: false; error: string };

function readCategoryForm(formData: FormData) {
  return categoryInputSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    color: formData.get("color"),
    description: formData.get("description") ?? "",
  });
}

async function pushCollectionsToN1CO() {
  try {
    const all = await prisma.category.findMany();
    const collections: N1COCollection[] = all.map((c) => ({
      code: c.slug,
      name: c.name,
      description: c.description ?? "",
      image: "",
    }));
    await syncCollections(collections);
  } catch (e) {
    // Non-blocking: local DB is the source of truth.
    console.warn("N1CO collection sync failed:", e instanceof Error ? e.message : e);
  }
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function createCategory(formData: FormData): Promise<CategoryResult> {
  const parsed = readCategoryForm(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const existing = await prisma.category.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return { success: false, error: "Ya existe una categoría con ese slug" };
  }

  await prisma.category.create({
    data: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      color: parsed.data.color,
      description: parsed.data.description ?? null,
    },
  });
  await pushCollectionsToN1CO();
  return { success: true };
}

export async function updateCategory(id: string, formData: FormData): Promise<CategoryResult> {
  const parsed = readCategoryForm(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const conflict = await prisma.category.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
  });
  if (conflict) {
    return { success: false, error: "Otra categoría ya usa ese slug" };
  }

  await prisma.category.update({
    where: { id },
    data: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      color: parsed.data.color,
      description: parsed.data.description ?? null,
    },
  });
  await pushCollectionsToN1CO();
  return { success: true };
}

export async function deleteCategory(id: string): Promise<CategoryResult> {
  try {
    await prisma.category.delete({ where: { id } });
    await pushCollectionsToN1CO();
    return { success: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return {
        success: false,
        error: "No puedes eliminar una categoría que tiene eventos asociados",
      };
    }
    throw e;
  }
}
