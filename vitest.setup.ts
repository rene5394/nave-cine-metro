import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

process.env.JWT_SECRET ??= "vitest-test-secret";

// lib/s3.ts and lib/n1co.ts read these into module-level consts at import
// time, so tests that don't specifically vary this config can rely on a
// stable default being present before the module first loads, instead of
// reaching for vi.resetModules() + dynamic import().
process.env.AWS_ACCESS_KEY_ID ??= "test-access-key";
process.env.AWS_SECRET_ACCESS_KEY ??= "test-secret-key";
process.env.S3_BUCKET_NAME ??= "test-bucket";
process.env.S3_BASE_URL ??= "https://cdn.test.example.com";
process.env.N1CO_CLIENT_ID ??= "test-n1co-client-id";
process.env.N1CO_CLIENT_SECRET ??= "test-n1co-client-secret";
process.env.N1CO_PAY_SECRET ??= "test-n1co-pay-secret";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: vi.fn() };
});
