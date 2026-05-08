"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Package, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/events", label: "Eventos", icon: Package },
  { href: "/admin/subscriptions", label: "Suscripciones", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav
        className="sticky top-0 z-40 border-b border-border bg-white shadow-sm"
        style={{ backgroundColor: "#333333" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-nave.svg"
              alt="EntradasYA"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
            <span className="hidden font-display text-xl font-bold text-white sm:inline">
              EntradasYA Admin
            </span>
          </div>
          <div className="text-sm text-white/80">Panel de administración</div>
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
