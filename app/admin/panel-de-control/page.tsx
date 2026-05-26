import Link from "next/link";
import { BarChart3, Package, Users } from "lucide-react";
import { getEventsStatusCounts } from "@/app/actions/events";

export default async function DashboardPage() {
  const { active, inactive } = await getEventsStatusCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 font-display text-3xl font-bold text-foreground">Panel de Control</h1>
        <p className="text-muted-foreground">Bienvenido al panel administrativo de EntradasYA</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/eventos"
          className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Eventos Activos
              </p>
              <p className="text-2xl font-bold text-foreground">{active}</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/eventos?inactivos=1"
          className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Eventos Inactivos
              </p>
              <p className="text-2xl font-bold text-foreground">{inactive}</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/suscripciones"
          className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Suscriptores</p>
              <p className="text-2xl font-bold text-foreground">0</p>
            </div>
          </div>
        </Link>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
              <BarChart3 className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Ingresos</p>
              <p className="text-2xl font-bold text-foreground">$0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
