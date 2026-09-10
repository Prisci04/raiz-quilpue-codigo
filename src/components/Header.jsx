"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/actividades", label: "Actividades" },
  { href: "/calendario", label: "Calendario" },
  { href: "/patrimonio", label: "Patrimonio" },
  { href: "/noticias", label: "Noticias" },
];

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#3d2f24]/12 bg-[#f6f1e8]/95 text-[#3d2f24] backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4 sm:px-8">
        <Link href="/" className="min-w-0 leading-tight">
          <span className="block text-[0.65rem] font-medium uppercase tracking-[0.28em] text-[#8a6f5c]">
            Corporación cultural
          </span>
          <span className="font-serif text-xl tracking-tight sm:text-2xl">
            Raíz Quilpué
          </span>
        </Link>

        <nav className="hidden md:block" aria-label="Principal">
          <ul className="flex items-center gap-7">
            {links.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href} active={isActive(pathname, link.href)}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#3d2f24]/15 md:hidden"
          aria-expanded={open}
          aria-controls="menu-movil"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
          <span className="flex flex-col gap-1.5" aria-hidden="true">
            <span className="block h-px w-4 bg-current" />
            <span className="block h-px w-4 bg-current" />
            <span className="block h-px w-4 bg-current" />
          </span>
        </button>
      </div>

      {open ? (
        <nav
          id="menu-movil"
          className="border-t border-[#3d2f24]/10 md:hidden"
          aria-label="Móvil"
        >
          <ul className="mx-auto flex max-w-6xl flex-col px-6 py-3 sm:px-8">
            {links.map((link) => (
              <li key={link.href}>
                <NavLink
                  href={link.href}
                  active={isActive(pathname, link.href)}
                  className="block py-2.5"
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

function NavLink({ href, active, className = "", children }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`text-sm tracking-wide transition-colors ${
        active
          ? "font-medium text-[#b45a3c]"
          : "text-[#3d2f24]/80 hover:text-[#b45a3c]"
      } ${className}`}
    >
      {children}
    </Link>
  );
}
