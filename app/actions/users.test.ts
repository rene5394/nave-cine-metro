// Import order matters: the prisma mock must be registered before
// "@/app/actions/users" is imported, so the "@/lib/prisma" mock wins the
// module-resolution race. See tests/mocks/prisma.ts for details.
import { prismaMock } from "@/tests/mocks/prisma";
import { requireActiveAdminMock } from "@/tests/mocks/authz";

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn() },
}));

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getUsers, createUser, setUserStatus } from "@/app/actions/users";
import { makeSession, makeUser } from "@/tests/fixtures/factories";
import { Role, UserStatus } from "@/lib/generated/prisma/enums";

const revalidatePathMock = vi.mocked(revalidatePath);
const bcryptHashMock = vi.mocked(bcrypt.hash);

const ADMIN_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_USER_ID = "99999999-9999-9999-9999-999999999999";

function makeUserForm(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("email", overrides.email ?? "new.user@example.com");
  fd.set("name", overrides.name ?? "New User");
  fd.set("password", overrides.password ?? "password123");
  fd.set("role", overrides.role ?? Role.CLIENT);
  return fd;
}

describe("getUsers", () => {
  describe("authorization", () => {
    it("throws 'No autorizado' when there is no active admin session (deliberately inconsistent with the rest of this file/codebase, which returns { success: false } instead of throwing — not to be 'fixed')", async () => {
      requireActiveAdminMock.mockResolvedValue(null);

      await expect(getUsers()).rejects.toThrow("No autorizado");
      expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe("with a valid admin session", () => {
    beforeEach(() => {
      requireActiveAdminMock.mockResolvedValue(makeSession());
      prismaMock.user.findMany.mockResolvedValue([]);
    });

    it("queries only ACTIVE users with the expected select/orderBy shape when includeInactive is omitted", async () => {
      await getUsers();

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { status: UserStatus.ACTIVE },
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
    });

    it("queries only ACTIVE users when includeInactive is explicitly false", async () => {
      await getUsers({ includeInactive: false });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: UserStatus.ACTIVE } }),
      );
    });

    it("widens where.status to ACTIVE and DEACTIVE when includeInactive is true", async () => {
      await getUsers({ includeInactive: true });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: [UserStatus.ACTIVE, UserStatus.DEACTIVE] } },
        }),
      );
    });

    it("returns the users resolved by prisma verbatim", async () => {
      const users = [makeUser()];
      prismaMock.user.findMany.mockResolvedValue(users as never);

      const result = await getUsers();

      expect(result).toBe(users);
    });
  });
});

describe("createUser", () => {
  describe("authorization", () => {
    it("returns { success: false, error: 'No autorizado' } when there is no active admin session", async () => {
      requireActiveAdminMock.mockResolvedValue(null);

      const result = await createUser(makeUserForm());

      expect(result).toEqual({ success: false, error: "No autorizado" });
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe("input validation", () => {
    beforeEach(() => {
      requireActiveAdminMock.mockResolvedValue(makeSession());
    });

    it("rejects a password shorter than 8 characters", async () => {
      const result = await createUser(makeUserForm({ password: "short1" }));

      expect(result).toEqual({
        success: false,
        error: "La contraseña debe tener al menos 8 caracteres",
      });
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("rejects an invalid email format", async () => {
      const result = await createUser(makeUserForm({ email: "not-an-email" }));

      expect(result).toEqual({ success: false, error: "Correo electrónico inválido" });
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("rejects a missing/empty name", async () => {
      const result = await createUser(makeUserForm({ name: "" }));

      expect(result).toEqual({ success: false, error: "El nombre es requerido" });
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("rejects a role value outside the ADMIN/CLIENT enum", async () => {
      const result = await createUser(makeUserForm({ role: "SUPERADMIN" }));

      expect(result.success).toBe(false);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe("with a valid admin session and valid input", () => {
    beforeEach(() => {
      requireActiveAdminMock.mockResolvedValue(makeSession());
      bcryptHashMock.mockResolvedValue("hashed-password" as never);
    });

    it("returns 'Ya existe un usuario con ese correo' when the email is already taken", async () => {
      prismaMock.user.findUnique.mockResolvedValue(makeUser());

      const result = await createUser(makeUserForm());

      expect(result).toEqual({ success: false, error: "Ya existe un usuario con ese correo" });
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("hashes the password with cost 10, forces status to ACTIVE, revalidates, and returns success", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(makeUser());

      const result = await createUser(
        makeUserForm({
          email: "new.user@example.com",
          name: "New User",
          password: "password123",
          role: Role.ADMIN,
        }),
      );

      expect(bcryptHashMock).toHaveBeenCalledWith("password123", 10);
      // status is forced to ACTIVE unconditionally — there is no "status"
      // field on the create-user form at all.
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: "new.user@example.com",
          name: "New User",
          password: "hashed-password",
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });
      expect(revalidatePathMock).toHaveBeenCalledWith("/admin/usuarios");
      expect(result).toEqual({ success: true });
    });
  });
});

describe("setUserStatus", () => {
  describe("authorization", () => {
    it("returns { success: false, error: 'No autorizado' } when there is no active admin session", async () => {
      requireActiveAdminMock.mockResolvedValue(null);

      const result = await setUserStatus(OTHER_USER_ID, "DEACTIVE");

      expect(result).toEqual({ success: false, error: "No autorizado" });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });

  describe("with a valid admin session", () => {
    beforeEach(() => {
      requireActiveAdminMock.mockResolvedValue(makeSession({ id: ADMIN_ID }));
    });

    it("returns 'Estado inválido' for a status value outside the ACTIVE/DEACTIVE enum", async () => {
      const result = await setUserStatus(OTHER_USER_ID, "BANNED" as never);

      expect(result).toEqual({ success: false, error: "Estado inválido" });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("blocks an admin from deactivating their own account", async () => {
      const result = await setUserStatus(ADMIN_ID, "DEACTIVE");

      expect(result).toEqual({
        success: false,
        error: "No puedes desactivar tu propia cuenta",
      });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("allows an admin to reactivate their own account — the self-guard only blocks DEACTIVE, not ACTIVE", async () => {
      prismaMock.user.update.mockResolvedValue(
        makeUser({ id: ADMIN_ID, status: UserStatus.ACTIVE }),
      );

      const result = await setUserStatus(ADMIN_ID, "ACTIVE");

      expect(result).toEqual({ success: true });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: ADMIN_ID },
        data: { status: UserStatus.ACTIVE },
      });
    });

    it("deactivates a different user's account successfully", async () => {
      prismaMock.user.update.mockResolvedValue(
        makeUser({ id: OTHER_USER_ID, status: UserStatus.DEACTIVE }),
      );

      const result = await setUserStatus(OTHER_USER_ID, "DEACTIVE");

      expect(result).toEqual({ success: true });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: OTHER_USER_ID },
        data: { status: UserStatus.DEACTIVE },
      });
      expect(revalidatePathMock).toHaveBeenCalledWith("/admin/usuarios");
    });

    it("catches a prisma.user.update failure and returns a generic error instead of throwing", async () => {
      prismaMock.user.update.mockRejectedValue(new Error("DB down"));

      const result = await setUserStatus(OTHER_USER_ID, "DEACTIVE");

      expect(result).toEqual({
        success: false,
        error: "No se pudo actualizar el estado del usuario",
      });
    });
  });
});
