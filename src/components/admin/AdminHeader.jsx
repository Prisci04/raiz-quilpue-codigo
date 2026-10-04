"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, Search, SquareArrowOutUpRight, UserRound } from "lucide-react";
import { searchAdminNav } from "@/lib/admin-nav";

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "RQ";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function AdminHeader({
  displayName,
  email,
  menuOpen,
  isAdministrador,
  onOpenMenu,
}) {
  const router = useRouter();
  const searchId = useId();
  const menuId = useId();
  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const results = searchAdminNav(query, isAdministrador);

  useEffect(() => {
    function onPointerDown(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setProfileOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function goToResult(href) {
    setQuery("");
    setSearchOpen(false);
    router.push(href);
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    setLogoutError("");

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
      // La sesión sigue activa si la solicitud no se completa.
    }

    setLogoutError("No fue posible cerrar la sesión.");
    setLoggingOut(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#2c1810]/6 bg-white/85 backdrop-blur-xl">
      <div className="flex h-[4.25rem] items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-[#2c1810] hover:bg-[#f6f1eb] lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="admin-sidebar"
          onClick={onOpenMenu}
        >
          <span className="sr-only">Abrir menú</span>
          <Menu size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>

        <div ref={searchRef} className="relative w-full max-w-md">
          <label htmlFor={searchId} className="sr-only">
            Buscar en el panel
          </label>
          <Search
            size={16}
            strokeWidth={1.8}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#a4846c]"
            aria-hidden="true"
          />
          <input
            id={searchId}
            type="search"
            value={query}
            placeholder="Buscar en el panel"
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) {
                event.preventDefault();
                goToResult(results[0].href);
              }
            }}
            className="h-11 w-full rounded-sm border border-transparent bg-[#f4efe9] pr-4 pl-10 text-sm text-[#2c1810] outline-none transition placeholder:text-[#a4846c] focus:border-[#eadfd4] focus:bg-white focus:ring-4 focus:ring-[#feca2b]/30"
          />
          {searchOpen && query.trim() ? (
            <div className="absolute top-[calc(100%+8px)] right-0 left-0 z-40 overflow-hidden rounded-sm border border-[#2c1810]/6 bg-white p-1.5 shadow-[0_16px_40px_rgba(44,24,16,0.12)]">
              {results.length === 0 ? (
                <p className="px-3 py-3 text-sm text-[#7c5c47]">Sin resultados en el panel.</p>
              ) : (
                <ul>
                  {results.map((item) => {
                    const Icon = item.icon;

                    return (
                      <li key={item.href}>
                        <button
                          type="button"
                          onClick={() => goToResult(item.href)}
                          className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm text-[#2c1810] hover:bg-[#f6f1eb]"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#f6f1eb] text-[#704a31]">
                            <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{item.label}</span>
                            <span className="block text-[12px] text-[#7c5c47]">{item.group}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div ref={profileRef} className="relative ml-auto shrink-0">
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2.5 rounded-sm py-1 pr-2 pl-1 text-[#2c1810] transition hover:bg-[#f6f1eb]"
            aria-expanded={profileOpen}
            aria-controls={menuId}
            onClick={() => setProfileOpen((current) => !current)}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#2c1810] text-[12px] font-semibold text-[#feca2b]">
              {initials(displayName)}
            </span>
            <span className="hidden max-w-40 truncate text-left sm:block">
              <span className="block text-[13px] leading-tight font-medium">{displayName}</span>
              <span className="block text-[11px] leading-tight text-[#7c5c47]">Cuenta</span>
            </span>
            <ChevronDown size={15} strokeWidth={1.8} className="text-[#a4846c]" aria-hidden="true" />
            <span className="sr-only">Abrir menú de cuenta</span>
          </button>

          {profileOpen ? (
            <div
              id={menuId}
              role="menu"
              className="absolute top-[calc(100%+8px)] right-0 z-40 w-64 overflow-hidden rounded-sm border border-[#2c1810]/6 bg-white p-1.5 shadow-[0_16px_40px_rgba(44,24,16,0.12)]"
            >
              <div className="px-3 py-3">
                <p className="truncate text-sm font-semibold text-[#2c1810]">{displayName}</p>
                <p className="truncate text-[12px] text-[#7c5c47]">{email}</p>
              </div>
              <div className="space-y-0.5 border-t border-[#2c1810]/6 pt-1.5">
                <Link
                  href="/admin/perfil"
                  role="menuitem"
                  className="flex min-h-10 items-center gap-2.5 rounded-sm px-2.5 text-[13px] text-[#2c1810] hover:bg-[#f6f1eb]"
                  onClick={() => setProfileOpen(false)}
                >
                  <UserRound size={15} strokeWidth={1.8} aria-hidden="true" />
                  Perfil
                </Link>
                <Link
                  href="/"
                  role="menuitem"
                  className="flex min-h-10 items-center gap-2.5 rounded-sm px-2.5 text-[13px] text-[#2c1810] hover:bg-[#f6f1eb]"
                  onClick={() => setProfileOpen(false)}
                >
                  <SquareArrowOutUpRight size={15} strokeWidth={1.8} aria-hidden="true" />
                  Ir a portal público
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="flex min-h-10 w-full items-center gap-2.5 rounded-sm px-2.5 text-left text-[13px] text-[#8d3b28] hover:bg-[#f6e4dc] disabled:opacity-60"
                  disabled={loggingOut}
                  onClick={handleLogout}
                >
                  <LogOut size={15} strokeWidth={1.8} aria-hidden="true" />
                  {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
                </button>
                {logoutError ? (
                  <p className="px-2.5 py-1 text-[12px] text-[#8d3b28]" role="alert">
                    {logoutError}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
