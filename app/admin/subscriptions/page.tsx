import { Users } from "lucide-react";

export default function SubscriptionsPage() {
  return (
    <div>
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Suscripciones</h2>
        <p className="text-muted-foreground">Gestiona las suscripciones de usuarios</p>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">No hay suscripciones registradas aún</p>
      </div>
    </div>
  );
}
