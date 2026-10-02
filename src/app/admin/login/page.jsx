import { redirect, unstable_rethrow } from "next/navigation";

import { logInternalError } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth/session";
import LoginView from "./login-view";

export const metadata = {
  title: "Iniciar sesión — Raíz Quilpué",
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  try {
    const user = await getCurrentUser();

    if (user) {
      redirect("/admin");
    }
  } catch (error) {
    unstable_rethrow(error);
    logInternalError("GET /admin/login");
  }

  return <LoginView />;
}
