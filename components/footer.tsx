export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#333333" }} className="text-white">
      <div className="mx-auto max-w-7xl px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4 mb-12">
          {/* Logo & Description */}
          <div className="flex flex-col gap-4">
            <span className="text-xl font-bold text-white font-display">
              EntradasYa
            </span>
            <p className="text-sm text-gray-300 leading-relaxed max-w-xs">
              Tu plataforma para descubrir y comprar entradas a los mejores eventos.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Categorías
            </h4>
            <nav className="flex flex-col gap-3">
              {["Cine", "Teatro", "Conciertos", "Pop-up"].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-sm text-gray-300 font-normal transition-colors hover:text-accent"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Empresa
            </h4>
            <nav className="flex flex-col gap-3">
              {["Acerca de", "Contacto", "Blog"].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-sm text-gray-300 font-normal transition-colors hover:text-accent"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Legal
            </h4>
            <nav className="flex flex-col gap-3">
              {["Privacidad", "Términos", "Cookies"].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-sm text-gray-300 font-normal transition-colors hover:text-accent"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-600 pt-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-400 font-normal">
              © 2026 EntradasYA. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-6">
              {[
                { name: "Instagram", icon: "ig" },
                { name: "Facebook", icon: "fb" },
                { name: "Twitter", icon: "tw" },
              ].map((social) => (
                <a
                  key={social.name}
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded text-gray-300 transition-colors hover:text-accent hover:bg-accent/20"
                  title={social.name}
                >
                  {social.icon === "ig" && "📷"}
                  {social.icon === "fb" && "f"}
                  {social.icon === "tw" && "𝕏"}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
