import { Users } from 'lucide-react'

export default function SubscriptionsPage() {
  return (
    <div>
      <div>
        <h2 className="text-2xl font-bold text-foreground font-display">Suscripciones</h2>
        <p className="text-muted-foreground">Gestiona las suscripciones de usuarios</p>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">No hay suscripciones registradas aún</p>
      </div>
    </div>
  )
}
