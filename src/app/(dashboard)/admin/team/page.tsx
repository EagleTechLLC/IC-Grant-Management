import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;

  // Default to current week (Mon–Sun)
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const fromStr = params.from ?? monday.toISOString().slice(0, 10);
  const toStr = params.to ?? sunday.toISOString().slice(0, 10);
  const fromDate = new Date(`${fromStr}T00:00:00`);
  const toDate = new Date(`${toStr}T23:59:59`);

  const { data: logs } = await supabase
    .from("time_logs")
    .select(
      "id, start_time, end_time, case_note_ref, profiles(full_name), clients(first_name, last_name), grants(name, grant_code), activity_types(name, color)"
    )
    .gte("start_time", fromDate.toISOString())
    .lte("start_time", toDate.toISOString())
    .order("start_time", { ascending: false });

  const rows = (logs ?? []).map((log) => {
    const profile = log.profiles as unknown as { full_name: string } | null;
    const client = log.clients as unknown as {
      first_name: string;
      last_name: string;
    } | null;
    const grant = log.grants as unknown as {
      name: string;
      grant_code: string;
    } | null;
    const activityType = log.activity_types as unknown as {
      name: string;
      color: string;
    } | null;

    const start = new Date(log.start_time);
    const end = new Date(log.end_time);
    const durationMins = Math.round(
      (end.getTime() - start.getTime()) / 60_000
    );

    return {
      id: log.id,
      caseworker: profile?.full_name ?? "Unknown",
      client: client
        ? `${client.last_name}, ${client.first_name}`
        : "Unknown",
      grant: grant ? `${grant.grant_code}` : "—",
      activityType: activityType?.name ?? "—",
      activityTypeColor: activityType?.color ?? null,
      date: format(start, "MMM d, yyyy"),
      time: `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`,
      duration:
        durationMins >= 60
          ? `${Math.floor(durationMins / 60)}h ${durationMins % 60 > 0 ? `${durationMins % 60}m` : ""}`.trim()
          : `${durationMins}m`,
      caseNoteRef: log.case_note_ref,
    };
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team View</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All time entries across the organization.
          </p>
        </div>
        <form className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              From
            </label>
            <input
              name="from"
              type="date"
              defaultValue={fromStr}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              To
            </label>
            <input
              name="to"
              type="date"
              defaultValue={toStr}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Filter
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Caseworker
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Client
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Time
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Duration
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Grant
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Activity
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No time entries for this period.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{row.caseworker}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.client}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.date}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.time}
                  </td>
                  <td className="px-4 py-3">{row.duration}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {row.grant}
                  </td>
                  <td className="px-4 py-3">
                    {row.activityType !== "—" ? (
                      <div className="flex items-center gap-1.5">
                        {row.activityTypeColor && (
                          <div
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{
                              backgroundColor: row.activityTypeColor,
                            }}
                          />
                        )}
                        {row.activityType}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <p className="mt-3 text-right text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "entry" : "entries"}
        </p>
      )}
    </div>
  );
}
