import React from "react";
import type { Metadata } from "next";
import { Inter, Chivo } from "next/font/google";
import { CartProvider } from "@/lib/cart-context";
import { EventModalProvider } from "@/lib/event-modal-context";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

const chivo = Chivo({
  subsets: ["latin"],
  variable: "--font-chivo",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "EntradasYA - Cine, Teatro, Conciertos y Eventos",
  description:
    "Compra entradas para los mejores eventos de cine, teatro, conciertos y pop-ups en tu ciudad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${chivo.variable}`}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <CartProvider>
          <EventModalProvider>{children}</EventModalProvider>
        </CartProvider>
      </body>
    </html>
  );
}
