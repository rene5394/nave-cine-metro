"use client"

import { ShoppingCart, Menu, X, Ticket } from "lucide-react"
import { useState } from "react"
import { useCart } from "@/lib/cart-context"

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Cartelera", href: "#eventos" },
  { label: "Tripulantes", href: "#" },
  { label: "Servicios", href: "#" },
  { label: "Nosotras", href: "#" },
  { label: "Contactanos", href: "#" },
]

export default function Header() {
  const { totalItems, setIsCartOpen } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false)
    if (href.startsWith("#")) {
      const el = document.getElementById(href.replace("#", ""))
      if (el) el.scrollIntoView({ behavior: "smooth" })
    } else {
      window.location.href = href
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-white/10 shadow-md" style={{ backgroundColor: "#333333" }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2"
        >
          <Ticket className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-white font-display">
            EntradasYa
          </span>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => handleNavClick(link.href)}
              className="text-sm font-medium text-white transition-colors hover:text-primary"
            >
              {link.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative text-white transition-all hover:text-primary"
            aria-label="Abrir carrito"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                {totalItems}
              </span>
            )}
          </button>
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Mobile Cart */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded text-white transition-all hover:text-accent md:hidden"
            aria-label="Abrir carrito"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                {totalItems}
              </span>
            )}
          </button>

          {/* Donar Button */}
          <button
            type="button"
            style={{ backgroundColor: "#9e5656" }}
            className="hidden sm:inline text-sm font-bold text-white px-5 py-2 rounded transition-all hover:shadow-lg"
          >
            Donar
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded text-white transition-colors hover:text-accent md:hidden"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <nav className="border-t border-white/10 px-4 py-2 md:hidden" style={{ backgroundColor: "#2a2a2a" }}>
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => handleNavClick(link.href)}
              className="block w-full text-left px-4 py-3 text-sm font-medium text-white transition-colors hover:text-primary"
            >
              {link.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  )
}
