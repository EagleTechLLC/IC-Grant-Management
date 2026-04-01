import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const now = new Date();
  const fromStr = params.from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const toStr = params.to ?? now.toISOString().slice(0, 10);

  const { data: entries } = await supabase
    .from("time_log_audits")
    .select(`
      id, action, old_data, new_data, created_at,
      profiles!changed_by(full_name)
    `)
    .gte("created_at", `${fromStr}T00:00:00`)
    .lte("created_at", `${toStr}T23:59:59`)
    .order("created_at", { ascending: false })
    .limit(500);

  const actionVariant = (action: string) => {
    if (action === "insert") return "border-green-600 text-green-700";
    if (action === "delete") return "border-red-500 text-red-600";
    return "border-blue-500 text-blue-600";
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Immutable record of all time entry changes. Read-only.
          </p>
        </div>
        <form className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <input name="from" type="date" defaultValue={fromStr}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <input name="to" type="date" defaultValue={toStr}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <button type="submit"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Filter
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entry ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Detail</th>
            </tr>
          </thead>
          <tbody>
            {!entries || entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No audit entries for this period.
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const profile = entry.profiles as unknown as { full_name: string } | null;
                const data = (entry.new_data ?? entry.old_data) as Record<string, unknown> | null;
                const detail = data
                  ? [
                      data.start_time ? format(new Date(data.start_time as string), "MMM d h:mm a") : null,
                      data.end_time ? `– ${format(new Date(data.end_time as string), "h:mm a")}` : null,
                    ].filter(Boolean).join(" ")
                  : "";

                return (
                  <tr key={entry.id} className="border-b border-border last:border-0 font-mono text-xs">
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(entry.created_at), "MMM d, yyyy HH:mm:ss")}
                    </td>
                    <td className="px-4 py-3 font-sans">{profile?.full_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={actionVariant(entry.action)}>
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {((entry.new_data ?? entry.old_data) as Record<string, unknown>)?.id as string ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-sans text-muted-foreground">{detail}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
