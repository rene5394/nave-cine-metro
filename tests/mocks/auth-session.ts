// Mock for @/lib/auth, used by app/actions/tickets.ts (calls getSession()
// directly) and app/actions/auth.ts (calls setSessionCookie/deleteSession).
// lib/auth.test.ts covers the real implementation and does not use this mock.
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
  setSessionCookie: vi.fn(),
  deleteSession: vi.fn(),
  createToken: vi.fn(),
  verifyToken: vi.fn(),
}));

import { getSession, setSessionCookie, deleteSession, createToken, verifyToken } from "@/lib/auth";

export const getSessionMock = vi.mocked(getSession);
export const setSessionCookieMock = vi.mocked(setSessionCookie);
export const deleteSessionMock = vi.mocked(deleteSession);
export const createTokenMock = vi.mocked(createToken);
export const verifyTokenMock = vi.mocked(verifyToken);
