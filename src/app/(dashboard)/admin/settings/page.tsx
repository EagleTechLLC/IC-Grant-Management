import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { updateWorkDaySettings, updateTimeTrackingSettings, updateAuditRetentionSettings } from "./actions";

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("name, work_day_start, work_day_end, time_slot_minutes, lock_after_days, audit_retention_years")
    .eq("id", profile.org_id)
    .single();

  const normalize = (t: string | null) => (t ?? "09:00").slice(0, 5);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

      <div className="max-w-md space-y-6">

        {/* Work day hours */}
        <section className="rounded-lg border border-border p-5">
          <h2 className="mb-1 font-semibold">Work Day Hours</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Visible time range on the calendar for all caseworkers.
          </p>
          <form action={updateWorkDaySettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="work_day_start" className="text-sm font-medium">
                  Start time
                </label>
                <input
                  id="work_day_start"
                  name="work_day_start"
                  type="time"
                  defaultValue={normalize(org?.work_day_start ?? null)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="work_day_end" className="text-sm font-medium">
                  End time
                </label>
                <input
                  id="work_day_end"
                  name="work_day_end"
                  type="time"
                  defaultValue={normalize(org?.work_day_end ?? null)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <Button type="submit" size="sm">Save</Button>
          </form>
        </section>

        {/* Time tracking */}
        <section className="rounded-lg border border-border p-5">
          <h2 className="mb-1 font-semibold">Time Tracking</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Controls calendar snap granularity and how long caseworkers can edit entries.
          </p>
          <form action={updateTimeTrackingSettings} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Time slot granularity</label>
              <p className="text-xs text-muted-foreground">
                Minimum snap interval when dragging or selecting time blocks.
              </p>
              <div className="flex gap-3">
                {[15, 30, 60].map((mins) => (
                  <label key={mins} className="flex cursor-pointer items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name="time_slot_minutes"
                      value={mins}
                      defaultChecked={(org?.time_slot_minutes ?? 15) === mins}
                    />
                    {mins} min
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lock_after_days" className="text-sm font-medium">
                Entry lock window
              </label>
              <p className="text-xs text-muted-foreground">
                Entries older than this become read-only. Corrections require admin approval.
              </p>
              <select
                id="lock_after_days"
                name="lock_after_days"
                defaultValue={org?.lock_after_days ?? 0}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={0}>Same day — lock at midnight</option>
                <option value={1}>1 day after entry</option>
                <option value={2}>2 days after entry</option>
                <option value={7}>7 days after entry</option>
                <option value={14}>14 days after entry</option>
                <option value={30}>30 days after entry</option>
              </select>
            </div>
            <Button type="submit" size="sm">Save</Button>
          </form>
        </section>

        {/* Audit retention */}
        <section className="rounded-lg border border-border p-5">
          <h2 className="mb-1 font-semibold">Audit Retention</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            How long audit records are kept. Federal grant compliance (HHS / ORR) typically requires 7 years.
          </p>
          <form action={updateAuditRetentionSettings} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="audit_retention_years" className="text-sm font-medium">
                Retention period
              </label>
              <select
                id="audit_retention_years"
                name="audit_retention_years"
                defaultValue={org?.audit_retention_years ?? 7}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {[1, 2, 3, 5, 7, 10, 15, 25].map((y) => (
                  <option key={y} value={y}>{y} {y === 1 ? "year" : "years"}</option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">Save</Button>
          </form>
        </section>

      </div>
    </div>
  );
}
