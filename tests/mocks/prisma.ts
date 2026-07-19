// Prisma singleton mock, following Prisma's documented testing pattern
// (https://www.prisma.io/docs/orm/prisma-client/testing/unit-testing) adapted
// for vitest-mock-extended.
//
// Consumers MUST import `prismaMock` from this file BEFORE importing the
// module under test, so this mock registration wins the module-resolution
// race for "@/lib/prisma":
//
//   import { prismaMock } from "@/tests/mocks/prisma";
//   import { redeemTicket } from "@/app/actions/tickets";
import { beforeEach } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@/lib/generated/prisma/client";

vi.mock("@/lib/prisma", () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

import { prisma } from "@/lib/prisma";

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

/**
 * Installs a $transaction implementation supporting both call shapes used in
 * this codebase: the callback form (app/actions/tickets.ts) and the array
 * form (app/actions/checkout.ts). Call this in a test file's own beforeEach,
 * after the shared mockReset above has run.
 */
export function mockTransaction() {
  prismaMock.$transaction.mockImplementation(((arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return (arg as (tx: DeepMockProxy<PrismaClient>) => unknown)(prismaMock);
  }) as unknown as PrismaClient["$transaction"]);
}
