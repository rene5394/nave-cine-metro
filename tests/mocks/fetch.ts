// Global fetch stub, used only by lib/n1co.test.ts (the single module that
// calls fetch() directly). Every other consumer mocks @/lib/n1co itself at
// the import boundary instead of touching fetch.
import { afterEach } from "vitest";

export function mockFetch() {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});
