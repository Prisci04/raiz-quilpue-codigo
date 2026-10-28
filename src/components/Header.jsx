"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/contenido", label: "Contenidos" },
  { href: "/actividades", label: "Actividades" },
  { href: "/museo", label: "Museo Digital" },
];

function isActive(pathname, item) {
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPathname, setMenuPathname] = useState(pathname);

  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setMenuOpen(false);
  }

  return (
    <header
      className="fixed top-0 right-0 left-0 z-50"
      style={{
        background: "rgba(231, 220, 210, 0.96)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
        <div className="flex flex-1 items-center">
          <Link href="/" className="group flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center"
              style={{
                borderRadius: "2px",
              }}
            >
              {/* CAMBIAR IMAGEN AQUÍ: sube el logo oficial con este nombre. */}
              <Image
                src="/images/logo/LogoRaizQuilpue.png"
                alt="Logo de Raíz Quilpué"
                width={32}
                height={32}
                className="h-auto w-8 object-contain"
              />
            </div>
            <div className="leading-tight">
              <div
                className="font-serif text-base font-bold"
                style={{ color: "var(--primary)", letterSpacing: "0.01em" }}
              >
                Raíz
              </div>
              <div
                className="font-mono text-[9px] tracking-[0.18em] uppercase"
                style={{ color: "var(--active-indicator)", marginTop: "-3px" }}
              >
                Quilpué
              </div>
            </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Principal">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive(pathname, item) ? "page" : undefined}
              className={`nav-link ${isActive(pathname, item) ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-3">
          <Link
            href="/admin/login"
            className="btn-outline hidden px-4 py-2 text-xs lg:inline-flex"
          >
            Acceder
          </Link>

          <button
            type="button"
            className="p-2 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="menu-movil"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">{menuOpen ? "Cerrar menú" : "Abrir menú"}</span>
            {menuOpen ? (
              <X size={22} strokeWidth={1.8} color="var(--primary)" aria-hidden="true" />
            ) : (
              <Menu size={22} strokeWidth={1.8} color="var(--primary)" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id="menu-movil"
          className="animate-fade-in lg:hidden"
          style={{
            background: "var(--background)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <nav className="flex flex-col gap-1 px-6 py-4" aria-label="Móvil">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive(pathname, item) ? "page" : undefined}
                className="border-b py-2.5 text-left text-sm font-medium"
                style={{
                  borderColor: "var(--border)",
                  color: isActive(pathname, item)
                    ? "var(--primary)"
                    : "var(--foreground)",
                }}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/admin/login"
              className="btn-outline mt-3 w-full py-2 text-center"
              onClick={() => setMenuOpen(false)}
            >
              Acceder
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
