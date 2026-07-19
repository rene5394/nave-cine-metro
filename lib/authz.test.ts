import { describe, it, expect } from "vitest";
import { prismaMock } from "@/tests/mocks/prisma";
import { getSessionMock } from "@/tests/mocks/auth-session";
import { requireActiveAdmin } from "@/lib/authz";
import { makeSession, makeUser } from "@/tests/fixtures/factories";
import { Role, UserStatus } from "@/lib/generated/prisma/enums";

describe("requireActiveAdmin", () => {
  it("returns null when there is no session", async () => {
    getSessionMock.mockResolvedValue(null);
    expect(await requireActiveAdmin()).toBeNull();
  });

  it("returns null when the session role is not ADMIN, without querying the database", async () => {
    getSessionMock.mockResolvedValue(makeSession({ role: Role.CLIENT }));
    expect(await requireActiveAdmin()).toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the user no longer exists in the database", async () => {
    getSessionMock.mockResolvedValue(makeSession());
    prismaMock.user.findUnique.mockResolvedValue(null);
    expect(await requireActiveAdmin()).toBeNull();
  });

  it("returns null when the user has been demoted since the JWT was issued", async () => {
    getSessionMock.mockResolvedValue(makeSession());
    prismaMock.user.findUnique.mockResolvedValue(
      makeUser({ role: Role.CLIENT, status: UserStatus.ACTIVE }),
    );
    expect(await requireActiveAdmin()).toBeNull();
  });

  it("returns null when the user has been deactivated since the JWT was issued", async () => {
    getSessionMock.mockResolvedValue(makeSession());
    prismaMock.user.findUnique.mockResolvedValue(
      makeUser({ role: Role.ADMIN, status: UserStatus.DEACTIVE }),
    );
    expect(await requireActiveAdmin()).toBeNull();
  });

  it("returns the original session for an active admin, querying by session id", async () => {
    const session = makeSession();
    getSessionMock.mockResolvedValue(session);
    prismaMock.user.findUnique.mockResolvedValue(
      makeUser({ id: session.id, role: Role.ADMIN, status: UserStatus.ACTIVE }),
    );

    expect(await requireActiveAdmin()).toBe(session);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: session.id },
      select: { status: true, role: true },
    });
  });
});
