import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNavLink from "@/components/admin-nav-link";

const adminNavItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/grants", label: "Grants" },
  { href: "/admin/activity-types", label: "Activity Types" },
  { href: "/admin/export", label: "Export" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex gap-6">
      <aside className="w-48 shrink-0">
        <nav className="flex flex-col gap-1">
          {adminNavItems.map((item) => (
            <AdminNavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
