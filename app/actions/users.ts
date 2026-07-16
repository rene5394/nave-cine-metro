"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { UserStatus, Role } from "@/lib/generated/prisma/enums";
import { requireActiveAdmin } from "@/lib/authz";

type UserResult = { success: true } | { success: false; error: string };

function revalidateUserViews() {
  revalidatePath("/admin/usuarios");
}

export async function getUsers({ includeInactive }: { includeInactive?: boolean } = {}) {
  return prisma.user.findMany({
    where: {
      status: includeInactive
        ? { in: [UserStatus.ACTIVE, UserStatus.DEACTIVE] }
        : UserStatus.ACTIVE,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

const createUserSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  name: z.string().min(1, "El nombre es requerido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
  role: z.enum([Role.ADMIN, Role.CLIENT]),
});

export async function createUser(formData: FormData): Promise<UserResult> {
  const admin = await requireActiveAdmin();
  if (!admin) return { success: false, error: "No autorizado" };

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { success: false, error: "Ya existe un usuario con ese correo" };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      password: hashedPassword,
      role: parsed.data.role,
      status: UserStatus.ACTIVE,
    },
  });

  revalidateUserViews();
  return { success: true };
}

const setUserStatusSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.DEACTIVE]),
});

export async function setUserStatus(
  id: string,
  status: "ACTIVE" | "DEACTIVE",
): Promise<UserResult> {
  const admin = await requireActiveAdmin();
  if (!admin) return { success: false, error: "No autorizado" };

  const parsed = setUserStatusSchema.safeParse({ status });
  if (!parsed.success) return { success: false, error: "Estado inválido" };

  if (parsed.data.status === UserStatus.DEACTIVE && id === admin.id) {
    return { success: false, error: "No puedes desactivar tu propia cuenta" };
  }

  try {
    await prisma.user.update({ where: { id }, data: { status: parsed.data.status } });
  } catch {
    return { success: false, error: "No se pudo actualizar el estado del usuario" };
  }

  revalidateUserViews();
  return { success: true };
}
