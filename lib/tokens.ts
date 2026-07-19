import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function findValidResetToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;
  return record;
}
