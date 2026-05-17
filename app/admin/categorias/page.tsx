"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Plus, Edit2, Trash2, Loader } from "lucide-react";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "@/app/actions/categories";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CATEGORY_COLOR_PRESETS,
  DEFAULT_CATEGORY_COLOR,
  categoryBadgeStyle,
} from "@/lib/category-color";

type Category = Awaited<ReturnType<typeof getCategories>>[number];

const EMPTY_FORM: { slug: string; name: string; color: string; description: string } = {
  slug: "",
  name: "",
  color: DEFAULT_CATEGORY_COLOR,
  description: "",
};

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCategories();
      setCategories(result);
    } catch {
      setError("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Data fetching effect: loads categories from backend on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormData({
      slug: cat.slug,
      name: cat.name,
      color: cat.color,
      description: cat.description ?? "",
    });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("slug", formData.slug);
    fd.set("name", formData.name);
    fd.set("color", formData.color);
    fd.set("description", formData.description);

    startTransition(async () => {
      const result = editingId ? await updateCategory(editingId, fd) : await createCategory(fd);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setShowForm(false);
      setFormData(EMPTY_FORM);
      setEditingId(null);
      await refresh();
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      await refresh();
    });
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Categorías</h2>
          <p className="text-muted-foreground">Administra las categorías de eventos</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Nueva Categoría
        </button>
      </div>

      {error && !showForm && (
        <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full">
          <thead className="bg-secondary/40">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Color
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Descripción
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  <Loader className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  No hay categorías. Crea una para empezar.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{cat.name}</td>
                  <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{cat.slug}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      style={categoryBadgeStyle(cat.color)}
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                    >
                      {cat.name}
                    </span>
                  </td>
                  <td className="max-w-xs px-6 py-4 text-sm text-muted-foreground">
                    {cat.description ? (
                      <span className="line-clamp-2">{cat.description}</span>
                    ) : (
                      <span className="text-xs italic opacity-60">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(cat)}
                      className="mr-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Edit2 className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      className="inline-flex items-center gap-1 text-sm text-destructive hover:underline"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <DialogDescription>
              El slug es el identificador URL-safe (minúsculas, números y guiones).
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                placeholder="Cine"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 font-mono text-sm"
                placeholder="cine"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Color</label>
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORY_COLOR_PRESETS.map((preset) => {
                  const selected = formData.color.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: preset.hex })}
                      title={preset.name}
                      aria-label={preset.name}
                      className={`h-7 w-7 rounded-full border transition-all ${
                        selected
                          ? "ring-2 ring-foreground ring-offset-2"
                          : "border-border hover:scale-110"
                      }`}
                      style={{ backgroundColor: preset.hex }}
                    />
                  );
                })}
                <label
                  className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-border transition-transform hover:scale-110"
                  style={{
                    background:
                      "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #10b981, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
                  }}
                  title="Color personalizado"
                  aria-label="Color personalizado"
                >
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              </div>
              {formData.color && (
                <span
                  style={categoryBadgeStyle(formData.color)}
                  className="mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                >
                  Vista previa
                </span>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Descripción <span className="text-muted-foreground">(opcional)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                rows={4}
                placeholder="Texto descriptivo de la categoría"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg disabled:opacity-50"
              >
                {isPending ? "Guardando..." : editingId ? "Guardar cambios" : "Crear categoría"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
