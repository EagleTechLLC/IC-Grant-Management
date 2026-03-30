import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { updateWorkDaySettings } from "./actions";

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
    .select("name, work_day_start, work_day_end")
    .eq("id", profile.org_id)
    .single();

  // Normalize "HH:MM:SS" → "HH:MM" for <input type="time">
  const normalize = (t: string | null) => (t ?? "09:00").slice(0, 5);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

      <div className="max-w-md space-y-8">
        {/* Work day hours */}
        <section className="rounded-lg border border-border p-5">
          <h2 className="mb-1 font-semibold">Work Day Hours</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Sets the visible range on the time grid for all caseworkers.
          </p>
          <form action={updateWorkDaySettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="work_day_start"
                  className="text-sm font-medium"
                >
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
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
