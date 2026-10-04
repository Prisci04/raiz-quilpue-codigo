"use client";

import { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminShell({ displayName, email, isAdministrador, children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="admin-shell min-h-full">
      <AdminSidebar
        open={menuOpen}
        isAdministrador={isAdministrador}
        onClose={() => setMenuOpen(false)}
      />
      <div className="lg:pl-64">
        <AdminHeader
          displayName={displayName}
          email={email}
          menuOpen={menuOpen}
          isAdministrador={isAdministrador}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <div className="print-dashboard mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
