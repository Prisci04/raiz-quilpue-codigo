"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { adminNavForRole } from "@/lib/admin-nav";

function isActive(pathname, href) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar({ open, onClose, isAdministrador }) {
  const pathname = usePathname();
  const navigation = adminNavForRole(isAdministrador);

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#2c1810]/45 backdrop-blur-[2px] lg:hidden"
          aria-label="Cerrar menú"
          onClick={onClose}
        />
      ) : null}

      <aside
        id="admin-sidebar"
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#2c1810] text-[#f4ebe3] transition-transform duration-200 ${
          open ? "is-open" : ""
        }`}
      >
        <div className="flex h-[4.25rem] items-center justify-between px-4">
          <Link href="/admin" className="flex items-center gap-3" onClick={onClose}>
            <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#feca2b] text-sm font-bold text-[#2c1810]">
              R
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight">Raíz Quilpué</span>
              <span className="block text-[11px] text-[#f4ebe3]/55">Panel administrativo</span>
            </span>
          </Link>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm lg:hidden"
            onClick={onClose}
          >
            <span className="sr-only">Cerrar menú</span>
            <X size={20} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2" aria-label="Administración">
          {navigation.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-medium tracking-[0.16em] text-[#f4ebe3]/65 uppercase">
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
                      onClick={onClose}
                      className={`flex min-h-11 items-center gap-3 rounded-sm px-3 text-[13.5px] transition-colors ${
                        active
                          ? "bg-[#f4ebe3]/16 font-medium text-[#ffdf90]"
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
      </aside>
    </>
  );
}
