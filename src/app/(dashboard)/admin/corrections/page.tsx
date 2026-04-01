import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approveCorrection, rejectCorrection } from "./actions";

export default async function AdminCorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const statusFilter = params.status ?? "pending";

  const { data: corrections } = await supabase
    .from("time_log_corrections")
    .select(`
      id, reason, status, review_note, reviewed_at, created_at,
      new_start_time, new_end_time, new_case_note_ref,
      profiles!requested_by(full_name),
      reviewer:profiles!reviewed_by(full_name),
      original_log:time_logs!original_log_id(
        start_time, end_time, case_note_ref,
        clients(first_name, last_name),
        grants(name, grant_code),
        activity_types(name)
      ),
      new_client:clients!new_client_id(first_name, last_name),
      new_grant:grants!new_grant_id(name, grant_code),
      new_activity_type:activity_types!new_activity_type_id(name)
    `)
    .eq("status", statusFilter)
    .order("created_at", { ascending: statusFilter === "pending" });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Correction Requests</h1>
        <div className="flex gap-2">
          {["pending", "approved", "rejected"].map((s) => (
            <a
              key={s}
              href={`/admin/corrections?status=${s}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {s}
            </a>
          ))}
        </div>
      </div>

      {!corrections || corrections.length === 0 ? (
        <div className="rounded-lg border border-border px-4 py-12 text-center text-muted-foreground">
          No {statusFilter} correction requests.
        </div>
      ) : (
        <div className="space-y-4">
          {corrections.map((c) => {
            const requester = c.profiles as unknown as { full_name: string } | null;
            const reviewer = c.reviewer as unknown as { full_name: string } | null;
            const orig = c.original_log as unknown as {
              start_time: string; end_time: string; case_note_ref: string | null;
              clients: { first_name: string; last_name: string } | null;
              grants: { name: string; grant_code: string } | null;
              activity_types: { name: string } | null;
            } | null;
            const newClient = c.new_client as unknown as { first_name: string; last_name: string } | null;
            const newGrant = c.new_grant as unknown as { name: string; grant_code: string } | null;
            const newAt = c.new_activity_type as unknown as { name: string } | null;

            return (
              <div key={c.id} className="rounded-lg border border-border p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{requester?.full_name ?? "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">
                      Submitted {format(new Date(c.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <Badge variant={
                    c.status === "approved" ? "outline"
                    : c.status === "rejected" ? "secondary"
                    : "default"
                  } className={
                    c.status === "approved" ? "border-green-600 text-green-700" : ""
                  }>
                    {c.status}
                  </Badge>
                </div>

                {/* Reason */}
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="font-medium">Reason: </span>{c.reason}
                </div>

                {/* Original vs Proposed */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Original</p>
                    <div className="space-y-1 rounded-md border border-border px-3 py-2">
                      {orig && (
                        <>
                          <p><span className="text-muted-foreground">Date:</span>{" "}
                            {format(new Date(orig.start_time), "MMM d, yyyy")}</p>
                          <p><span className="text-muted-foreground">Time:</span>{" "}
                            {format(new Date(orig.start_time), "h:mm a")} – {format(new Date(orig.end_time), "h:mm a")}</p>
                          <p><span className="text-muted-foreground">Client:</span>{" "}
                            {orig.clients ? `${orig.clients.last_name}, ${orig.clients.first_name}` : "—"}</p>
                          <p><span className="text-muted-foreground">Grant:</span>{" "}
                            {orig.grants?.grant_code ?? "—"}</p>
                          <p><span className="text-muted-foreground">Activity:</span>{" "}
                            {orig.activity_types?.name ?? "—"}</p>
                          {orig.case_note_ref && (
                            <p><span className="text-muted-foreground">Note:</span> {orig.case_note_ref}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Proposed</p>
                    <div className="space-y-1 rounded-md border border-border px-3 py-2">
                      {c.new_start_time && (
                        <>
                          <p><span className="text-muted-foreground">Date:</span>{" "}
                            {format(new Date(c.new_start_time), "MMM d, yyyy")}</p>
                          <p><span className="text-muted-foreground">Time:</span>{" "}
                            {format(new Date(c.new_start_time), "h:mm a")} – {format(new Date(c.new_end_time!), "h:mm a")}</p>
                        </>
                      )}
                      <p><span className="text-muted-foreground">Client:</span>{" "}
                        {newClient ? `${newClient.last_name}, ${newClient.first_name}` : "—"}</p>
                      <p><span className="text-muted-foreground">Grant:</span>{" "}
                        {newGrant?.grant_code ?? "—"}</p>
                      <p><span className="text-muted-foreground">Activity:</span>{" "}
                        {newAt?.name ?? "—"}</p>
                      {c.new_case_note_ref && (
                        <p><span className="text-muted-foreground">Note:</span> {c.new_case_note_ref}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin response (resolved) */}
                {c.status !== "pending" && (
                  <div className="text-sm text-muted-foreground">
                    {c.status === "approved" ? "Approved" : "Rejected"} by {reviewer?.full_name ?? "admin"}{" "}
                    on {format(new Date(c.reviewed_at!), "MMM d, yyyy")}.
                    {c.review_note && <span> Note: {c.review_note}</span>}
                  </div>
                )}

                {/* Approve / reject actions */}
                {c.status === "pending" && (
                  <CorrectionActions correctionId={c.id} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CorrectionActions({ correctionId }: { correctionId: string }) {
  return (
    <div className="flex items-end gap-3 border-t border-border pt-4">
      <div className="flex-1">
        <label className="text-xs font-medium text-muted-foreground">
          Note (optional)
        </label>
        <input
          form={`approve-${correctionId}`}
          name="review_note"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Optional note to caseworker…"
        />
      </div>
      <form
        id={`reject-${correctionId}`}
        action={async (fd) => {
          "use server";
          await rejectCorrection(correctionId, (fd.get("review_note") as string) ?? "");
        }}
      >
        <input type="hidden" name="review_note" />
        <Button variant="outline" size="sm" type="submit">Reject</Button>
      </form>
      <form
        id={`approve-${correctionId}`}
        action={async (fd) => {
          "use server";
          await approveCorrection(correctionId, (fd.get("review_note") as string) ?? "");
        }}
      >
        <Button size="sm" type="submit">Approve</Button>
      </form>
    </div>
  );
}
