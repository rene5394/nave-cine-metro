"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Plus, Loader, Eye, EyeOff } from "lucide-react";
import { createUser, getUsers, setUserStatus } from "@/app/actions/users";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type UserRow = Awaited<ReturnType<typeof getUsers>>[number];

const EMPTY_FORM: { email: string; name: string; password: string; role: "ADMIN" | "CLIENT" } = {
  email: "",
  name: "",
  password: "",
  role: "CLIENT",
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUsers({ includeInactive: includeInactive || undefined });
      setUsers(result);
    } catch {
      setError("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    // Data fetching effect: loads users from backend on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("email", formData.email);
    fd.set("name", formData.name);
    fd.set("password", formData.password);
    fd.set("role", formData.role);

    startTransition(async () => {
      const result = await createUser(fd);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setShowForm(false);
      setFormData(EMPTY_FORM);
      await refresh();
    });
  };

  const handleSetStatus = (id: string, status: "ACTIVE" | "DEACTIVE") => {
    startTransition(async () => {
      const result = await setUserStatus(id, status);
      if (!result.success) {
        setError(result.error);
        return;
      }
      await refresh();
    });
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Usuarios</h2>
          <p className="text-muted-foreground">Administra las cuentas de usuarios</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Ver inactivos
          </label>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Nuevo Usuario
          </button>
        </div>
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
                Correo
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Estado
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  No hay usuarios. Crea uno para empezar.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className={`border-t border-border hover:bg-secondary/30 ${
                    u.status === "DEACTIVE" ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      {u.name}
                      {u.status === "DEACTIVE" && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Inactivo
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                      {u.role === "ADMIN" ? "Administrador" : "Cliente"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {u.status === "ACTIVE" ? "Activo" : "Inactivo"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {u.status === "ACTIVE" ? (
                        <button
                          type="button"
                          onClick={() => handleSetStatus(u.id, "DEACTIVE")}
                          disabled={isPending}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                        >
                          <EyeOff className="h-3 w-3" />
                          Desactivar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetStatus(u.id, "ACTIVE")}
                          disabled={isPending}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
                        >
                          <Eye className="h-3 w-3" />
                          Activar
                        </button>
                      )}
                    </div>
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
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>Crea una cuenta con acceso al sistema.</DialogDescription>
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
                placeholder="Nombre completo"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Correo</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                placeholder="correo@ejemplo.com"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Contraseña</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Rol</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as "ADMIN" | "CLIENT" })
                }
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              >
                <option value="CLIENT">Cliente</option>
                <option value="ADMIN">Administrador</option>
              </select>
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
                {isPending ? "Guardando..." : "Crear usuario"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
