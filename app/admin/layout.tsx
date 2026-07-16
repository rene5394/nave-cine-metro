import { redirect } from "next/navigation";
import { requireActiveAdmin } from "@/lib/authz";
import { AdminShell } from "./admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireActiveAdmin();

  if (!session) {
    redirect("/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
