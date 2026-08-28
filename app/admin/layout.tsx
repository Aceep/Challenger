import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/dal";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  return <AdminShell who={`${admin.name ?? "admin"} · admin`}>{children}</AdminShell>;
}
