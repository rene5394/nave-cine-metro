import { prismaMock } from "@/tests/mocks/prisma";
import { setSessionCookieMock, deleteSessionMock } from "@/tests/mocks/auth-session";

vi.mock("@/lib/tokens", () => ({
  generateRawToken: vi.fn(),
  hashToken: vi.fn(),
  findValidResetToken: vi.fn(),
  RESET_TOKEN_TTL_MS: 60 * 60 * 1000,
}));
vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: vi.fn(),
}));
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}));

import { login, logout, requestPasswordReset, resetPassword } from "@/app/actions/auth";
import { generateRawToken, hashToken, findValidResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { makeUser, makePasswordResetToken } from "@/tests/fixtures/factories";
import { Role, UserStatus } from "@/lib/generated/prisma/enums";

const generateRawTokenMock = vi.mocked(generateRawToken);
const hashTokenMock = vi.mocked(hashToken);
const findValidResetTokenMock = vi.mocked(findValidResetToken);
const sendPasswordResetEmailMock = vi.mocked(sendPasswordResetEmail);
const bcryptCompareMock = vi.mocked(bcrypt.compare);
const bcryptHashMock = vi.mocked(bcrypt.hash);

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("login", () => {
  it("returns a validation error for an invalid email and does not query the user", async () => {
    const fd = makeFormData({ email: "not-an-email", password: "secret123" });

    const result = await login(null, fd);

    expect(result).toEqual({ success: false, error: "Correo electrónico inválido" });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns a validation error for an empty password and does not query the user", async () => {
    const fd = makeFormData({ email: "user@example.com", password: "" });

    const result = await login(null, fd);

    expect(result).toEqual({ success: false, error: "La contraseña es requerida" });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns a generic error when no user is found for the email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const fd = makeFormData({ email: "nobody@example.com", password: "secret123" });

    const result = await login(null, fd);

    expect(result).toEqual({ success: false, error: "Credenciales inválidas" });
  });

  it("returns a generic error when the password does not match", async () => {
    const user = makeUser();
    prismaMock.user.findUnique.mockResolvedValue(user);
    bcryptCompareMock.mockResolvedValue(false as never);
    const fd = makeFormData({ email: user.email, password: "wrong-password" });

    const result = await login(null, fd);

    expect(result).toEqual({ success: false, error: "Credenciales inválidas" });
  });

  it("returns the exact same error message for a nonexistent user and a wrong password", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    const notFoundResult = await login(
      null,
      makeFormData({ email: "nobody@example.com", password: "secret123" }),
    );

    const user = makeUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user);
    bcryptCompareMock.mockResolvedValueOnce(false as never);
    const wrongPasswordResult = await login(
      null,
      makeFormData({ email: user.email, password: "wrong-password" }),
    );

    expect(notFoundResult).toEqual({ success: false, error: "Credenciales inválidas" });
    expect(wrongPasswordResult).toEqual({ success: false, error: "Credenciales inválidas" });
    expect((notFoundResult as { error: string }).error).toBe(
      (wrongPasswordResult as { error: string }).error,
    );
  });

  it("rejects login for a deactivated account", async () => {
    const user = makeUser({ status: UserStatus.DEACTIVE });
    prismaMock.user.findUnique.mockResolvedValue(user);
    bcryptCompareMock.mockResolvedValue(true as never);
    const fd = makeFormData({ email: user.email, password: "correct-password" });

    const result = await login(null, fd);

    expect(result).toEqual({
      success: false,
      error: "Tu cuenta ha sido desactivada. Contacta a un administrador.",
    });
  });

  it("sets the session cookie and returns success with the user's role on valid credentials", async () => {
    const user = makeUser({ role: Role.ADMIN });
    prismaMock.user.findUnique.mockResolvedValue(user);
    bcryptCompareMock.mockResolvedValue(true as never);
    const fd = makeFormData({ email: user.email, password: "correct-password" });

    const result = await login(null, fd);

    expect(setSessionCookieMock).toHaveBeenCalledWith({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    expect(result).toEqual({ success: true, role: user.role });
  });
});

describe("logout", () => {
  it("calls deleteSession exactly once", async () => {
    await logout();

    expect(deleteSessionMock).toHaveBeenCalledTimes(1);
  });
});

describe("requestPasswordReset", () => {
  it("returns a validation error for an invalid email and does not query the user", async () => {
    const fd = makeFormData({ email: "not-an-email" });

    const result = await requestPasswordReset(null, fd);

    expect(result).toEqual({ success: false, error: "Correo electrónico inválido" });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns success without creating a token when the user does not exist (anti-enumeration)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const fd = makeFormData({ email: "nobody@example.com" });

    const result = await requestPasswordReset(null, fd);

    expect(result).toEqual({ success: true });
    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("returns success without issuing a new token when a recent unused token exists (cooldown)", async () => {
    const user = makeUser();
    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.passwordResetToken.findFirst.mockResolvedValue(
      makePasswordResetToken({ userId: user.id }),
    );
    const fd = makeFormData({ email: user.email });

    const result = await requestPasswordReset(null, fd);

    expect(result).toEqual({ success: true });
    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it("invalidates prior tokens, creates a new one, and emails the reset link on the happy path", async () => {
    const user = makeUser();
    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.passwordResetToken.findFirst.mockResolvedValue(null);
    generateRawTokenMock.mockReturnValue("raw-token-value");
    hashTokenMock.mockReturnValue("hashed-token-value");
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.passwordResetToken.create.mockResolvedValue(makePasswordResetToken());
    sendPasswordResetEmailMock.mockResolvedValue({ ok: true });
    const fd = makeFormData({ email: user.email });

    const result = await requestPasswordReset(null, fd);

    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledWith({
      data: { userId: user.id, tokenHash: "hashed-token-value", expiresAt: expect.any(Date) },
    });
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      user,
      expect.stringContaining("raw-token-value"),
    );
    expect(result).toEqual({ success: true });
  });

  it("still reports success to the client when the reset email fails to send", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = makeUser();
    prismaMock.user.findUnique.mockResolvedValue(user);
    prismaMock.passwordResetToken.findFirst.mockResolvedValue(null);
    generateRawTokenMock.mockReturnValue("raw-token-value");
    hashTokenMock.mockReturnValue("hashed-token-value");
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.passwordResetToken.create.mockResolvedValue(makePasswordResetToken());
    sendPasswordResetEmailMock.mockResolvedValue({ ok: false, error: "smtp down" });
    const fd = makeFormData({ email: user.email });

    const result = await requestPasswordReset(null, fd);

    expect(result).toEqual({ success: true });

    consoleErrorSpy.mockRestore();
  });
});

describe("resetPassword", () => {
  it("returns a refine error on confirmPassword when the passwords do not match", async () => {
    const fd = makeFormData({
      token: "raw-token",
      password: "password123",
      confirmPassword: "different123",
    });

    const result = await resetPassword(null, fd);

    expect(result).toEqual({ success: false, error: "Las contraseñas no coinciden" });
  });

  it("returns a validation error when the password is shorter than 8 characters", async () => {
    const fd = makeFormData({
      token: "raw-token",
      password: "short1",
      confirmPassword: "short1",
    });

    const result = await resetPassword(null, fd);

    expect(result).toEqual({
      success: false,
      error: "La contraseña debe tener al menos 8 caracteres",
    });
  });

  it("returns invalid_token when the token is not found or has expired", async () => {
    findValidResetTokenMock.mockResolvedValue(null);
    const fd = makeFormData({
      token: "bad-token",
      password: "password123",
      confirmPassword: "password123",
    });

    const result = await resetPassword(null, fd);

    expect(result).toEqual({
      success: false,
      code: "invalid_token",
      error: "Este enlace ya no es válido o ha expirado. Solicita uno nuevo.",
    });
  });

  it("returns invalid_token and does not update the user when a concurrent reset already claimed the token", async () => {
    const record = makePasswordResetToken();
    findValidResetTokenMock.mockResolvedValue(record);
    bcryptHashMock.mockResolvedValue("hashed-new-password" as never);
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    const fd = makeFormData({
      token: "raw-token",
      password: "password123",
      confirmPassword: "password123",
    });

    const result = await resetPassword(null, fd);

    expect(result).toEqual({
      success: false,
      code: "invalid_token",
      error: "Este enlace ya no es válido o ha expirado. Solicita uno nuevo.",
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("hashes the new password, updates the user, invalidates other tokens, and returns success", async () => {
    const record = makePasswordResetToken();
    findValidResetTokenMock.mockResolvedValue(record);
    bcryptHashMock.mockResolvedValue("hashed-new-password" as never);
    prismaMock.passwordResetToken.updateMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.user.update.mockResolvedValue(makeUser({ id: record.userId }));
    prismaMock.passwordResetToken.updateMany.mockResolvedValueOnce({ count: 2 });
    const fd = makeFormData({
      token: "raw-token",
      password: "password123",
      confirmPassword: "password123",
    });

    const result = await resetPassword(null, fd);

    expect(bcryptHashMock).toHaveBeenCalledWith("password123", 10);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: record.userId },
      data: { password: "hashed-new-password" },
    });
    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: record.id, usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenNthCalledWith(2, {
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(result).toEqual({ success: true });
  });
});
