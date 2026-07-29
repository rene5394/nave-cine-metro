"use server";

import { z } from "zod";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveAdmin } from "@/lib/authz";

const filtersSchema = z.object({
  eventId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dateField: z.enum(["createdAt", "redeemedAt"]).default("createdAt"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type OrderFilters = z.input<typeof filtersSchema>;

export async function getOrders(input: OrderFilters = {}) {
  const admin = await requireActiveAdmin();
  if (!admin) return { ok: false as const, error: "No autorizado" };

  const parsed = filtersSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Filtros inválidos" };
  }
  const { eventId, startDate, endDate, dateField, page, pageSize } = parsed.data;

  const dateRange = {
    ...(startDate ? { gte: new Date(`${startDate}T00:00:00Z`) } : {}),
    ...(endDate ? { lte: new Date(`${endDate}T23:59:59Z`) } : {}),
  };
  const hasDateRange = startDate || endDate;

  // eventId and a redemption-date range both narrow down which OrderItem
  // qualifies, so they're merged into a single items.some(...) rather than
  // two separate `items` keys (the second would just overwrite the first).
  const itemsSomeFilter: Prisma.OrderItemWhereInput = {
    ...(eventId ? { eventId } : {}),
    ...(dateField === "redeemedAt" && hasDateRange
      ? { tickets: { some: { redeemedAt: dateRange } } }
      : {}),
  };

  const where: Prisma.OrderWhereInput = {
    ...(Object.keys(itemsSomeFilter).length > 0 ? { items: { some: itemsSomeFilter } } : {}),
    ...(dateField === "createdAt" && hasDateRange ? { createdAt: dateRange } : {}),
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
            tickets: { select: { redeemedAt: true } },
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
