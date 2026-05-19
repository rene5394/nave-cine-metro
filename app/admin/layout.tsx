"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, LogOut, Package, Receipt, Tag, Ticket, User, Users } from "lucide-react";
import { logout } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { href: "/admin/panel-de-control", label: "Panel de Control", icon: BarChart3 },
  { href: "/admin/eventos", label: "Eventos", icon: Package },
  { href: "/admin/ordenes", label: "Órdenes", icon: Receipt },
  { href: "/admin/categorias", label: "Categorías", icon: Tag },
  // { href: "/admin/suscripciones", label: "Suscripciones", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav
        className="sticky top-0 z-40 border-b border-border bg-white shadow-sm"
        style={{ backgroundColor: "#333333" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/admin/panel-de-control" className="flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold tracking-tight text-white">
              EntradasYa Admin
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Abrir menú de usuario"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <User className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
        {/* Sidebar */}
        <aside className="w-48 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-md"
                    : "text-foreground hover:bg-secondary hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </aside>

        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
