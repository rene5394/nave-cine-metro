// Mock for @/lib/authz's requireActiveAdmin(), used by admin-gated action
// tests (categories, events, orders, users). lib/authz.test.ts covers its
// real implementation and does not use this mock.
vi.mock("@/lib/authz", () => ({
  requireActiveAdmin: vi.fn(),
}));

import { requireActiveAdmin } from "@/lib/authz";

export const requireActiveAdminMock = vi.mocked(requireActiveAdmin);
