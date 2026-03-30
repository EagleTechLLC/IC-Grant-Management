import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminNavLink from "@/components/admin-nav-link";

const adminNavItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/team", label: "Team View" },
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
        <div className="mb-4 border-b border-border pb-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <span>←</span>
            <span>My Dashboard</span>
          </Link>
        </div>
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
