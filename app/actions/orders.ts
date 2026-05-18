"use server";

import { z } from "zod";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const filtersSchema = z.object({
  eventId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type OrderFilters = z.input<typeof filtersSchema>;

export async function getOrders(input: OrderFilters = {}) {
  const parsed = filtersSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Filtros inválidos" };
  }
  const { eventId, startDate, endDate, page, pageSize } = parsed.data;

  const where: Prisma.OrderWhereInput = {
    ...(eventId ? { items: { some: { eventId } } } : {}),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate ? { gte: new Date(`${startDate}T00:00:00Z`) } : {}),
            ...(endDate ? { lte: new Date(`${endDate}T23:59:59Z`) } : {}),
          },
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { email: true, name: true } },
        items: {
          include: {
            event: { select: { id: true, name: true, sku: true } },
            screening: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    ok: true as const,
    orders,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
