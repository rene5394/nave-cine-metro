"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const redeemSchema = z.object({ token: z.string().min(8).max(64) });

export type RedeemResult =
  | {
      ok: true;
      ticket: {
        eventName: string;
        date: string | null;
        time: string | null;
        redeemedAt: Date;
      };
    }
  | {
      ok: false;
      code: "UNAUTHORIZED" | "INVALID_INPUT" | "NOT_FOUND" | "ORDER_CANCELLED";
      message: string;
    }
  | {
      ok: false;
      code: "ALREADY_REDEEMED";
      message: string;
      eventName: string;
      redeemedAt: Date | null;
    };

export async function redeemTicket(input: { token: string }): Promise<RedeemResult> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { ok: false, code: "UNAUTHORIZED", message: "No autorizado" };
  }

  const parsed = redeemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_INPUT", message: "Token inválido" };
  }

  return prisma.$transaction(
    async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { token: parsed.data.token },
        include: {
          orderItem: {
            include: {
              event: { select: { name: true } },
              screening: { select: { date: true, time: true } },
              order: { select: { id: true, status: true } },
            },
          },
        },
      });

      if (!ticket) {
        return { ok: false, code: "NOT_FOUND", message: "Ticket no encontrado" } as const;
      }

      if (ticket.orderItem.order.status === "CANCELLED") {
        return { ok: false, code: "ORDER_CANCELLED", message: "Orden cancelada" } as const;
      }

      if (ticket.status === "REDEEMED") {
        return {
          ok: false,
          code: "ALREADY_REDEEMED",
          message: "Este ticket ya fue canjeado",
          eventName: ticket.orderItem.event.name,
          redeemedAt: ticket.redeemedAt,
        } as const;
      }

      const updated = await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: "REDEEMED", redeemedAt: new Date() },
      });

      const remaining = await tx.ticket.count({
        where: {
          orderItem: { orderId: ticket.orderItem.order.id },
          status: "ISSUED",
        },
      });

      if (remaining === 0) {
        await tx.order.update({
          where: { id: ticket.orderItem.order.id },
          data: { status: "REDEEMED" },
        });
      }

      return {
        ok: true,
        ticket: {
          eventName: ticket.orderItem.event.name,
          date: ticket.orderItem.screening?.date ?? null,
          time: ticket.orderItem.screening?.time ?? null,
          redeemedAt: updated.redeemedAt!,
        },
      } as const;
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}
