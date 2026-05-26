"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CategoryStatus, EventStatus } from "@/lib/generated/prisma/enums";
import { syncCollections, type N1COCollection } from "@/lib/n1co";
import { CATEGORY_COLOR_REGEX } from "@/lib/category-color";

const slugSchema = z
  .string()
  .min(1, "El slug es requerido")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug debe ser minúsculas, números y guiones");

const categoryInputSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1, "El nombre es requerido"),
  color: z.string().regex(CATEGORY_COLOR_REGEX, "Color inválido"),
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

function revalidateCategoryViews() {
  revalidatePath("/");
  revalidatePath("/admin/categorias");
  revalidatePath("/admin/eventos");
  revalidatePath("/admin/panel-de-control");
}

async function pushCollectionsToN1CO() {
  try {
    const all = await prisma.category.findMany({
      where: { status: { in: [CategoryStatus.ACTIVE, CategoryStatus.DEACTIVE] } },
    });
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

export async function getCategories({ includeInactive }: { includeInactive?: boolean } = {}) {
  return prisma.category.findMany({
    where: {
      status: includeInactive
        ? { in: [CategoryStatus.ACTIVE, CategoryStatus.DEACTIVE] }
        : CategoryStatus.ACTIVE,
    },
    orderBy: { name: "asc" },
  });
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
  revalidateCategoryViews();
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
  revalidateCategoryViews();
  return { success: true };
}

export async function deleteCategory(id: string): Promise<CategoryResult> {
  const activeEvents = await prisma.event.count({
    where: { categoryId: id, status: EventStatus.ACTIVE },
  });
  if (activeEvents > 0) {
    return {
      success: false,
      error: "No puedes eliminar una categoría con eventos activos",
    };
  }

  await prisma.category.update({
    where: { id },
    data: { status: CategoryStatus.DELETED },
  });
  await pushCollectionsToN1CO();
  revalidateCategoryViews();
  return { success: true };
}

const setCategoryStatusSchema = z.object({
  status: z.enum([CategoryStatus.ACTIVE, CategoryStatus.DEACTIVE]),
});

export async function setCategoryStatus(
  id: string,
  status: "ACTIVE" | "DEACTIVE",
): Promise<CategoryResult> {
  const parsed = setCategoryStatusSchema.safeParse({ status });
  if (!parsed.success) return { success: false, error: "Estado inválido" };

  if (parsed.data.status === CategoryStatus.DEACTIVE) {
    const activeEvents = await prisma.event.count({
      where: { categoryId: id, status: EventStatus.ACTIVE },
    });
    if (activeEvents > 0) {
      return {
        success: false,
        error: "No puedes desactivar una categoría con eventos activos",
      };
    }
  }

  try {
    await prisma.category.update({
      where: { id },
      data: { status: parsed.data.status },
    });
  } catch {
    return { success: false, error: "No se pudo actualizar el estado de la categoría" };
  }

  await pushCollectionsToN1CO();
  revalidateCategoryViews();
  return { success: true };
}
