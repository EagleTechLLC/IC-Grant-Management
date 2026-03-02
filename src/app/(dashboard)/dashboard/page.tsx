import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TimeGrid from "@/components/time-grid";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, org_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login?error=no-profile");

  const [{ data: clients }, { data: grants }, { data: org }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, first_name, last_name")
        .order("last_name"),
      supabase.from("grants").select("id, name, grant_code").order("name"),
      supabase
        .from("organizations")
        .select("work_day_start, work_day_end")
        .eq("id", profile.org_id)
        .single(),
    ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Time Log</h1>
        <p className="text-sm text-gray-500">
          Click and drag on the calendar to log time
        </p>
      </div>
      <TimeGrid
        clients={clients ?? []}
        grants={grants ?? []}
        workDayStart={org?.work_day_start ?? "08:00:00"}
        workDayEnd={org?.work_day_end ?? "16:30:00"}
        userId={user.id}
        orgId={profile.org_id}
      />
    </div>
  );
}
