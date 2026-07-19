// @vitest-environment node
//
// jose resolves to its WebCrypto ("webapi") build under the jsdom test
// environment, which fails signing with "payload must be an instance of
// Uint8Array" against jsdom's incomplete WebCrypto polyfill. Force the node
// environment for this file so jose uses its Node build instead.
import { describe, it, expect } from "vitest";
import { mockCookieJar } from "@/tests/mocks/next-headers";
import { createToken, verifyToken, setSessionCookie, getSession, deleteSession } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/enums";

const payload = { id: "user-1", email: "admin@example.com", name: "Admin", role: Role.ADMIN };

describe("createToken / verifyToken", () => {
  it("round-trips a payload through sign and verify", async () => {
    const token = await createToken(payload);
    expect(await verifyToken(token)).toMatchObject(payload);
  });

  it("returns null for a malformed token", async () => {
    expect(await verifyToken("not-a-jwt")).toBeNull();
  });

  it("returns null for a token with a tampered signature", async () => {
    const token = await createToken(payload);
    const [header, body] = token.split(".");
    const tampered = `${header}.${body}.tampered-signature`;
    expect(await verifyToken(tampered)).toBeNull();
  });
});

describe("setSessionCookie", () => {
  it("sets the session cookie with the expected options", async () => {
    const { jar } = mockCookieJar();
    await setSessionCookie(payload);

    expect(jar.set).toHaveBeenCalledTimes(1);
    const [name, token, options] = jar.set.mock.calls[0];
    expect(name).toBe("session");
    expect(typeof token).toBe("string");
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  });
});

describe("getSession", () => {
  it("returns null when there is no session cookie", async () => {
    mockCookieJar();
    expect(await getSession()).toBeNull();
  });

  it("returns the decoded payload for a valid session cookie", async () => {
    const token = await createToken(payload);
    mockCookieJar({ name: "session", value: token });
    expect(await getSession()).toMatchObject(payload);
  });

  it("returns null for a corrupt session cookie", async () => {
    mockCookieJar({ name: "session", value: "corrupt-token" });
    expect(await getSession()).toBeNull();
  });
});

describe("deleteSession", () => {
  it("deletes the session cookie", async () => {
    const { jar } = mockCookieJar({ name: "session", value: "token" });
    await deleteSession();
    expect(jar.delete).toHaveBeenCalledWith("session");
  });
});
