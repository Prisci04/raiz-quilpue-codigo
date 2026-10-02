"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  ShoppingBag,
  SquareArrowOutUpRight,
  Users,
  X,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Resumen",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Gestión",
    items: [
      { href: "/admin/contenidos", label: "Contenidos", icon: FileText },
      { href: "/admin/actividades", label: "Actividades", icon: CalendarDays },
      { href: "/admin/museo", label: "Museo Digital", icon: Landmark },
      { href: "/admin/participantes", label: "Participantes", icon: Users },
      { href: "/admin/comentarios", label: "Comentarios", icon: MessageCircle },
      { href: "/admin/market", label: "Market", icon: ShoppingBag },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3 },
      { href: "/admin/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

function isActive(pathname, href) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar({ displayName = "Equipo interno" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (response.ok) {
        router.push("/admin/login");
        router.refresh();
        return;
      }
    } catch {
      // El mensaje queda en el panel; la sesión no se da por cerrada.
    }

    setLoggingOut(false);
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#2c1810]/8 bg-[#f1ebe4]/90 px-4 backdrop-blur-md lg:hidden">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[#2c1810]"
          aria-expanded={open}
          aria-controls="admin-sidebar"
          onClick={() => setOpen(true)}
        >
          <span className="sr-only">Abrir menú</span>
          <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <p className="text-sm font-semibold tracking-tight text-[#2c1810]">Raíz Quilpué</p>
        <span className="rounded-full bg-[#feca2b]/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#2c1810]">
          Admin
        </span>
      </header>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#2c1810]/45 backdrop-blur-[2px] lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="admin-sidebar"
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#2c1810] text-[#f4ebe3] transition-transform duration-200 ${
          open ? "is-open" : ""
        }`}
      >
        <div className="flex h-[4.25rem] items-center justify-between px-4">
          <Link href="/admin" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#feca2b] text-sm font-bold text-[#2c1810]">
              R
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight">Raíz Quilpué</span>
              <span className="block text-[11px] text-[#f4ebe3]/55">Panel administrativo</span>
            </span>
          </Link>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl lg:hidden"
            onClick={() => setOpen(false)}
          >
            <span className="sr-only">Cerrar menú</span>
            <X size={20} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2" aria-label="Administración">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-medium tracking-[0.16em] text-[#f4ebe3]/40 uppercase">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] transition-colors ${
                        active
                          ? "bg-[#feca2b] font-medium text-[#2c1810]"
                          : "text-[#f4ebe3]/78 hover:bg-white/8 hover:text-[#f4ebe3]"
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/8 p-3">
          <Link
            href="/"
            className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] text-[#f4ebe3]/75 hover:bg-white/8 hover:text-[#f4ebe3]"
            onClick={() => setOpen(false)}
          >
            <SquareArrowOutUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
            Portal público
          </Link>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#feca2b]/20 text-[11px] font-semibold text-[#feca2b]">
              RQ
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{displayName}</span>
              <span className="block truncate text-[11px] text-[#f4ebe3]/45">Raíz Quilpué</span>
            </span>
            <button
              type="button"
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[#f4ebe3]/55 hover:bg-white/8 hover:text-[#f4ebe3] disabled:opacity-50"
              aria-label="Cerrar sesión"
              disabled={loggingOut}
              onClick={handleLogout}
            >
              <LogOut size={15} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
