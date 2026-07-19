// Import order matters: the prisma mock must be registered before
// "@/app/actions/categories" is imported, so the "@/lib/prisma" mock wins
// the module-resolution race. See tests/mocks/prisma.ts for details.
import { prismaMock } from "@/tests/mocks/prisma";
import { requireActiveAdminMock } from "@/tests/mocks/authz";

vi.mock("@/lib/n1co", () => ({
  syncCollections: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { syncCollections } from "@/lib/n1co";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  setCategoryStatus,
} from "@/app/actions/categories";
import { makeSession, makeCategory } from "@/tests/fixtures/factories";

const syncCollectionsMock = vi.mocked(syncCollections);
const revalidatePathMock = vi.mocked(revalidatePath);
const afterMock = vi.mocked(after);

const CATEGORY_ID = "22222222-2222-2222-2222-222222222222";

// tests/mocks/prisma.ts resets prismaMock itself, but requireActiveAdmin,
// after(), revalidatePath and syncCollections are plain vi.fn()s with no
// shared reset, so each test would otherwise see call counts/history
// accumulated from prior tests.
beforeEach(() => {
  requireActiveAdminMock.mockReset();
  afterMock.mockClear();
  revalidatePathMock.mockClear();
  syncCollectionsMock.mockReset();
});

function makeCategoryForm(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("slug", overrides.slug ?? "conciertos");
  fd.set("name", overrides.name ?? "Conciertos");
  fd.set("color", overrides.color ?? "#f59e0b");
  fd.set("description", overrides.description ?? "Category description");
  return fd;
}

describe("getCategories", () => {
  it("widens where.status to include DEACTIVE when includeInactive is true and the caller is an active admin", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));
    prismaMock.category.findMany.mockResolvedValue([]);

    await getCategories({ includeInactive: true });

    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      where: { status: { in: ["ACTIVE", "DEACTIVE"] } },
      orderBy: { name: "asc" },
    });
  });

  it("keeps where.status as ACTIVE only when includeInactive is true but the caller is not an admin", async () => {
    requireActiveAdminMock.mockResolvedValue(null);
    prismaMock.category.findMany.mockResolvedValue([]);

    await getCategories({ includeInactive: true });

    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  });

  it("does not call requireActiveAdmin and returns only ACTIVE categories when includeInactive is omitted", async () => {
    prismaMock.category.findMany.mockResolvedValue([]);

    await getCategories();

    expect(requireActiveAdminMock).not.toHaveBeenCalled();
    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  });

  it("does not call requireActiveAdmin when includeInactive is explicitly false", async () => {
    prismaMock.category.findMany.mockResolvedValue([]);

    await getCategories({ includeInactive: false });

    expect(requireActiveAdminMock).not.toHaveBeenCalled();
    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  });
});

describe("createCategory", () => {
  it("returns 'No autorizado' when the caller is not an active admin", async () => {
    requireActiveAdminMock.mockResolvedValue(null);

    const result = await createCategory(makeCategoryForm());

    expect(result).toEqual({ success: false, error: "No autorizado" });
    expect(prismaMock.category.create).not.toHaveBeenCalled();
  });

  it("returns the zod error message for an invalid slug", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));

    const result = await createCategory(makeCategoryForm({ slug: "Not A Slug" }));

    expect(result).toEqual({
      success: false,
      error: "El slug debe ser minúsculas, números y guiones",
    });
    expect(prismaMock.category.create).not.toHaveBeenCalled();
  });

  it("returns the zod error message for an invalid color", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));

    const result = await createCategory(makeCategoryForm({ color: "not-a-color" }));

    expect(result).toEqual({ success: false, error: "Color inválido" });
    expect(prismaMock.category.create).not.toHaveBeenCalled();
  });

  it("returns a duplicate-slug error when a category with that slug already exists", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));
    prismaMock.category.findUnique.mockResolvedValue(makeCategory());

    const result = await createCategory(makeCategoryForm());

    expect(result).toEqual({
      success: false,
      error: "Ya existe una categoría con ese slug",
    });
    expect(prismaMock.category.create).not.toHaveBeenCalled();
  });

  it("creates the category, converting a blank description to null, fires after() and revalidates 4 paths", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));
    prismaMock.category.findUnique.mockResolvedValue(null);
    prismaMock.category.create.mockResolvedValue(makeCategory());

    const result = await createCategory(makeCategoryForm({ description: "   " }));

    expect(prismaMock.category.create).toHaveBeenCalledWith({
      data: {
        slug: "conciertos",
        name: "Conciertos",
        color: "#f59e0b",
        description: null,
      },
    });
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledTimes(4);
    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/admin/categorias");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(3, "/admin/eventos");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(4, "/admin/panel-de-control");
    expect(result).toEqual({ success: true });
  });
});

describe("updateCategory", () => {
  it("returns 'No autorizado' when the caller is not an active admin", async () => {
    requireActiveAdminMock.mockResolvedValue(null);

    const result = await updateCategory(CATEGORY_ID, makeCategoryForm());

    expect(result).toEqual({ success: false, error: "No autorizado" });
    expect(prismaMock.category.update).not.toHaveBeenCalled();
  });

  it("returns the zod error message for invalid input", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));

    const result = await updateCategory(CATEGORY_ID, makeCategoryForm({ slug: "Not A Slug" }));

    expect(result).toEqual({
      success: false,
      error: "El slug debe ser minúsculas, números y guiones",
    });
    expect(prismaMock.category.update).not.toHaveBeenCalled();
  });

  it("checks for a slug conflict excluding the category's own id", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));
    prismaMock.category.findFirst.mockResolvedValue(null);
    prismaMock.category.update.mockResolvedValue(makeCategory());

    await updateCategory(CATEGORY_ID, makeCategoryForm());

    expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
      where: { slug: "conciertos", NOT: { id: CATEGORY_ID } },
    });
  });

  it("returns a slug-conflict error when another category already uses that slug", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));
    prismaMock.category.findFirst.mockResolvedValue(
      makeCategory({ id: "99999999-9999-9999-9999-999999999999" }),
    );

    const result = await updateCategory(CATEGORY_ID, makeCategoryForm());

    expect(result).toEqual({ success: false, error: "Otra categoría ya usa ese slug" });
    expect(prismaMock.category.update).not.toHaveBeenCalled();
  });

  it("updates the category, fires after() and revalidates 4 paths", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));
    prismaMock.category.findFirst.mockResolvedValue(null);
    prismaMock.category.update.mockResolvedValue(makeCategory());

    const result = await updateCategory(CATEGORY_ID, makeCategoryForm());

    expect(prismaMock.category.update).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID },
      data: {
        slug: "conciertos",
        name: "Conciertos",
        color: "#f59e0b",
        description: "Category description",
      },
    });
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledTimes(4);
    expect(result).toEqual({ success: true });
  });
});

describe("deleteCategory", () => {
  it("returns 'No autorizado' when the caller is not an active admin", async () => {
    requireActiveAdminMock.mockResolvedValue(null);

    const result = await deleteCategory(CATEGORY_ID);

    expect(result).toEqual({ success: false, error: "No autorizado" });
    expect(prismaMock.category.update).not.toHaveBeenCalled();
  });

  it("blocks deletion when the category has active events", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));
    prismaMock.event.count.mockResolvedValue(1);

    const result = await deleteCategory(CATEGORY_ID);

    expect(result).toEqual({
      success: false,
      error: "No puedes eliminar una categoría con eventos activos",
    });
    expect(prismaMock.category.update).not.toHaveBeenCalled();
  });

  it("soft-deletes the category when it has no active events", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));
    prismaMock.event.count.mockResolvedValue(0);
    prismaMock.category.update.mockResolvedValue(makeCategory({ status: "DELETED" }));

    const result = await deleteCategory(CATEGORY_ID);

    expect(prismaMock.event.count).toHaveBeenCalledWith({
      where: { categoryId: CATEGORY_ID, status: "ACTIVE" },
    });
    expect(prismaMock.category.update).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID },
      data: { status: "DELETED" },
    });
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledTimes(4);
    expect(result).toEqual({ success: true });
  });
});

describe("setCategoryStatus", () => {
  it("returns 'No autorizado' when the caller is not an active admin", async () => {
    requireActiveAdminMock.mockResolvedValue(null);

    const result = await setCategoryStatus(CATEGORY_ID, "ACTIVE");

    expect(result).toEqual({ success: false, error: "No autorizado" });
    expect(prismaMock.category.update).not.toHaveBeenCalled();
  });

  it("returns 'Estado inválido' for a status outside the ACTIVE/DEACTIVE enum", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));

    const result = await setCategoryStatus(CATEGORY_ID, "DELETED" as "ACTIVE" | "DEACTIVE");

    expect(result).toEqual({ success: false, error: "Estado inválido" });
    expect(prismaMock.category.update).not.toHaveBeenCalled();
  });

  it("blocks deactivation when the category has active events", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));
    prismaMock.event.count.mockResolvedValue(1);

    const result = await setCategoryStatus(CATEGORY_ID, "DEACTIVE");

    expect(prismaMock.event.count).toHaveBeenCalledWith({
      where: { categoryId: CATEGORY_ID, status: "ACTIVE" },
    });
    expect(result).toEqual({
      success: false,
      error: "No puedes desactivar una categoría con eventos activos",
    });
    expect(prismaMock.category.update).not.toHaveBeenCalled();
  });

  it("deactivates the category when it has no active events", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));
    prismaMock.event.count.mockResolvedValue(0);
    prismaMock.category.update.mockResolvedValue(makeCategory({ status: "DEACTIVE" }));

    const result = await setCategoryStatus(CATEGORY_ID, "DEACTIVE");

    expect(prismaMock.category.update).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID },
      data: { status: "DEACTIVE" },
    });
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledTimes(4);
    expect(result).toEqual({ success: true });
  });

  it("never checks active-event count when setting status to ACTIVE", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));
    prismaMock.category.update.mockResolvedValue(makeCategory({ status: "ACTIVE" }));

    const result = await setCategoryStatus(CATEGORY_ID, "ACTIVE");

    expect(prismaMock.event.count).not.toHaveBeenCalled();
    expect(prismaMock.category.update).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID },
      data: { status: "ACTIVE" },
    });
    expect(result).toEqual({ success: true });
  });

  it("returns a generic error instead of throwing when prisma.category.update rejects", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));
    prismaMock.category.update.mockRejectedValue(new Error("db connection lost"));

    const result = await setCategoryStatus(CATEGORY_ID, "ACTIVE");

    expect(result).toEqual({
      success: false,
      error: "No se pudo actualizar el estado de la categoría",
    });
    expect(afterMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("pushCollectionsToN1CO (the after() callback)", () => {
  it("maps categories to N1CO collections and calls syncCollections", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));
    prismaMock.category.findUnique.mockResolvedValue(null);
    prismaMock.category.create.mockResolvedValue(makeCategory());

    await createCategory(makeCategoryForm());

    const afterCallback = afterMock.mock.calls.at(-1)?.[0] as (() => Promise<void>) | undefined;
    expect(afterCallback).toBeDefined();

    prismaMock.category.findMany.mockResolvedValue([
      makeCategory({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        slug: "conciertos",
        name: "Conciertos",
        description: "Live music",
        status: "ACTIVE",
      }),
      makeCategory({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        slug: "teatro",
        name: "Teatro",
        description: null,
        status: "DEACTIVE",
      }),
    ]);
    syncCollectionsMock.mockResolvedValue(undefined);

    await afterCallback?.();

    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      where: { status: { in: ["ACTIVE", "DEACTIVE"] } },
    });
    expect(syncCollectionsMock).toHaveBeenCalledWith([
      { code: "conciertos", name: "Conciertos", description: "Live music", image: "" },
      { code: "teatro", name: "Teatro", description: "", image: "" },
    ]);
  });

  it("swallows errors from syncCollections without throwing or rejecting", async () => {
    requireActiveAdminMock.mockResolvedValue(makeSession({ role: "ADMIN" }));
    prismaMock.category.findUnique.mockResolvedValue(null);
    prismaMock.category.create.mockResolvedValue(makeCategory());

    await createCategory(makeCategoryForm());

    const afterCallback = afterMock.mock.calls.at(-1)?.[0] as (() => Promise<void>) | undefined;
    expect(afterCallback).toBeDefined();

    prismaMock.category.findMany.mockResolvedValue([makeCategory()]);
    syncCollectionsMock.mockRejectedValue(new Error("network"));

    await expect(afterCallback?.()).resolves.not.toThrow();
  });
});
