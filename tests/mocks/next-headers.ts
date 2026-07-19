// Mock for next/headers' cookies(), used only by lib/auth.test.ts — every
// action/lib consumer of sessions goes through lib/auth.ts instead of
// touching next/headers directly.
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
  draftMode: vi.fn(),
}));

import { cookies } from "next/headers";

export const cookiesMock = vi.mocked(cookies);

/**
 * Installs a fake cookie jar as the resolved value of cookies(), seeded with
 * an optional initial cookie. Returns the spied get/set/delete jar and the
 * backing store for assertions.
 */
export function mockCookieJar(initial?: { name: string; value: string }) {
  const store = new Map<string, string>();
  if (initial) store.set(initial.name, initial.value);

  const jar = {
    get: vi.fn((name: string) => (store.has(name) ? { name, value: store.get(name)! } : undefined)),
    set: vi.fn<(name: string, value: string, options?: Record<string, unknown>) => void>(
      (name, value) => {
        store.set(name, value);
      },
    ),
    delete: vi.fn((name: string) => {
      store.delete(name);
    }),
  };

  cookiesMock.mockResolvedValue(jar as unknown as Awaited<ReturnType<typeof cookies>>);

  return { jar, store };
}
