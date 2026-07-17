"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  LogOut,
  Menu,
  Package,
  QrCode,
  Receipt,
  Tag,
  Ticket,
  User,
  Users,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/admin/panel-de-control", label: "Panel de Control", icon: BarChart3 },
  { href: "/admin/eventos", label: "Eventos", icon: Package },
  { href: "/admin/ordenes", label: "Órdenes", icon: Receipt },
  { href: "/admin/redencion", label: "Redención", icon: QrCode },
  { href: "/admin/categorias", label: "Categorías", icon: Tag },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  // { href: "/admin/suscripciones", label: "Suscripciones", icon: Users },
];

function renderNavLinks(pathname: string, closeOnClick: boolean) {
  return NAV_ITEMS.map(({ href, label, icon: Icon }) => {
    const isActive = pathname === href;
    const className = `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
      isActive
        ? "bg-primary text-white shadow-md"
        : "text-foreground hover:bg-secondary hover:text-white"
    }`;

    if (closeOnClick) {
      return (
        <SheetClose asChild key={href}>
          <Link href={href} className={className}>
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        </SheetClose>
      );
    }

    return (
      <Link key={href} href={href} className={className}>
        <Icon className="h-5 w-5" />
        {label}
      </Link>
    );
  });
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <div className="min-h-screen bg-background">
        {/* Navbar */}
        <nav
          className="sticky top-0 z-40 border-b border-border bg-white shadow-sm"
          style={{ backgroundColor: "#333333" }}
        >
          <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Abrir menú de navegación"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <Link href="/admin/panel-de-control" className="hidden items-center gap-2 md:flex">
                <Ticket className="h-6 w-6 text-primary" />
                <span className="font-display text-xl font-bold tracking-tight text-white">
                  EntradasYa Admin
                </span>
              </Link>
            </div>
            <Link
              href="/admin/panel-de-control"
              className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap md:hidden"
            >
              <Ticket className="h-5 w-5 text-primary" />
              <span className="font-display text-base font-bold tracking-tight text-white">
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
          {/* Sidebar (desktop) */}
          <aside className="hidden w-48 space-y-1 md:block">
            {renderNavLinks(pathname, false)}
          </aside>

          {/* Sidebar (mobile drawer) */}
          <SheetContent side="left" className="flex flex-col gap-1 bg-white p-4 pt-14">
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            {renderNavLinks(pathname, true)}
          </SheetContent>

          {/* Main Content */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </Sheet>
  );
}
