import { describe, it, expect } from "vitest";
import { prismaMock } from "@/tests/mocks/prisma";
import { generateRawToken, hashToken, findValidResetToken, RESET_TOKEN_TTL_MS } from "@/lib/tokens";
import { makePasswordResetToken } from "@/tests/fixtures/factories";

describe("generateRawToken", () => {
  it("returns a 64-character hex string", () => {
    const token = generateRawToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a different value on each call", () => {
    expect(generateRawToken()).not.toBe(generateRawToken());
  });
});

describe("hashToken", () => {
  it("is deterministic for the same input", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("differs across different inputs", () => {
    expect(hashToken("abc")).not.toBe(hashToken("def"));
  });

  it("returns a 64-character sha256 hex digest", () => {
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("RESET_TOKEN_TTL_MS", () => {
  it("is one hour", () => {
    expect(RESET_TOKEN_TTL_MS).toBe(60 * 60 * 1000);
  });
});

describe("findValidResetToken", () => {
  it("returns null when no record is found", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);
    expect(await findValidResetToken("raw-token")).toBeNull();
  });

  it("returns null when the record was already used", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(
      makePasswordResetToken({ usedAt: new Date() }),
    );
    expect(await findValidResetToken("raw-token")).toBeNull();
  });

  it("returns null when the record has expired", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(
      makePasswordResetToken({ expiresAt: new Date(Date.now() - 1000) }),
    );
    expect(await findValidResetToken("raw-token")).toBeNull();
  });

  it("returns the record when it is unused and not expired", async () => {
    const record = makePasswordResetToken({
      usedAt: null,
      expiresAt: new Date(Date.now() + 1000),
    });
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(record);
    expect(await findValidResetToken("raw-token")).toEqual(record);
  });

  it("looks up the record by the hash of the raw token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);
    await findValidResetToken("raw-token");
    expect(prismaMock.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken("raw-token") },
    });
  });
});
