import { CalendarDays, FileText, Landmark, LayoutDashboard, Users } from "lucide-react";

export const ADMIN_NAV = [
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
      // Rehabilitar esta opción cuando se vuelva a implementar Market.
      // { href: "/admin/market", label: "Market", icon: ShoppingBag },
    ],
  },
  {
    label: "Configuración",
    items: [
      {
        href: "/admin/configuracion",
        label: "Usuarios",
        icon: Users,
        adminOnly: true,
      },
    ],
  },
];

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function adminNavForRole(isAdministrador) {
  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => isAdministrador || !item.adminOnly),
  })).filter((group) => group.items.length > 0);
}

export function searchAdminNav(query, isAdministrador = false) {
  const term = normalize(query.trim());

  if (!term) {
    return [];
  }

  return adminNavForRole(isAdministrador).flatMap((group) =>
    group.items
      .filter((item) => {
        const haystack = normalize(`${item.label} ${group.label}`);
        return haystack.includes(term);
      })
      .map((item) => ({ ...item, group: group.label })),
  );
}
