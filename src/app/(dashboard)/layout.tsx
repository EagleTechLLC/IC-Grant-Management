import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login?error=no-profile");
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <span className="text-base font-semibold text-foreground">
            International Center
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {profile.full_name}
            </span>
            <Badge variant="secondary" className="capitalize">
              {profile.role}
            </Badge>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
