import { prisma } from "@/lib/prisma";
import { getSession, type JWTPayload } from "@/lib/auth";

export async function requireActiveAdmin(): Promise<JWTPayload | null> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { status: true, role: true },
  });

  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") return null;

  return session;
}
