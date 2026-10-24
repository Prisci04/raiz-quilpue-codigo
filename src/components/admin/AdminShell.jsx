"use client";

import "./admin-ui.css";
import { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminShell({ displayName, email, isAdministrador, children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="admin-shell min-h-screen">
      <AdminSidebar
        open={menuOpen}
        isAdministrador={isAdministrador}
        onClose={() => setMenuOpen(false)}
      />
      <div className="min-w-0 lg:pl-64">
        <AdminHeader
          displayName={displayName}
          email={email}
          menuOpen={menuOpen}
          isAdministrador={isAdministrador}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <div className="print-dashboard mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
