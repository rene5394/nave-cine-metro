"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, deleteSession } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/enums";
import { generateRawToken, hashToken, findValidResetToken, RESET_TOKEN_TTL_MS } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export type LoginState = { success: false; error: string } | { success: true; role: Role };

export async function login(
  _prevState: LoginState | null,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { success: false, error: "Credenciales inválidas" };
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    return { success: false, error: "Credenciales inválidas" };
  }

  if (user.status !== "ACTIVE") {
    return {
      success: false,
      error: "Tu cuenta ha sido desactivada. Contacta a un administrador.",
    };
  }

  await setSessionCookie({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return { success: true, role: user.role };
}

export async function logout() {
  await deleteSession();
}

const requestResetSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
});

export type RequestResetState = { success: true } | { success: false; error: string };

const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

export async function requestPasswordReset(
  _prevState: RequestResetState | null,
  formData: FormData,
): Promise<RequestResetState> {
  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { success: true };
  }

  const recentToken = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
    },
  });

  if (recentToken) {
    return { success: true };
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${rawToken}`;
  const result = await sendPasswordResetEmail(user, resetUrl);

  if (!result.ok) {
    console.error("[auth] password reset email failed:", result.error);
  }

  return { success: true };
}

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Enlace inválido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type ResetPasswordState =
  | { success: true }
  | { success: false; error: string; code?: "invalid_token" };

export async function resetPassword(
  _prevState: ResetPasswordState | null,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { token, password } = parsed.data;

  const record = await findValidResetToken(token);
  if (!record) {
    return {
      success: false,
      code: "invalid_token",
      error: "Este enlace ya no es válido o ha expirado. Solicita uno nuevo.",
    };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (claimed.count === 0) {
    return {
      success: false,
      code: "invalid_token",
      error: "Este enlace ya no es válido o ha expirado. Solicita uno nuevo.",
    };
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { password: hashedPassword },
  });

  await prisma.passwordResetToken.updateMany({
    where: { userId: record.userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  return { success: true };
}
