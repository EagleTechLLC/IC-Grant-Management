import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ActivityTypeFormDialog from "@/components/activity-type-form-dialog";
import {
  createActivityType,
  updateActivityType,
  archiveActivityType,
  restoreActivityType,
} from "./actions";

export default async function AdminActivityTypesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: activityTypes } = await supabase
    .from("activity_types")
    .select("id, name, color, sort_order, archived_at")
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("sort_order")
    .order("name");

  const active = (activityTypes ?? []).filter((at) => !at.archived_at);
  const archived = (activityTypes ?? []).filter((at) => !!at.archived_at);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Activity Types</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Categories of work caseworkers log time against. The color shows as
            the left stripe on calendar events.
          </p>
        </div>
        <ActivityTypeFormDialog action={createActivityType} />
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Color
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {active.length === 0 && archived.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No activity types yet. Create one to get started.
                </td>
              </tr>
            ) : (
              <>
                {active.map((at) => (
                  <ActivityTypeRow key={at.id} activityType={at} />
                ))}
                {archived.map((at) => (
                  <ActivityTypeRow key={at.id} activityType={at} />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityTypeRow({
  activityType,
}: {
  activityType: {
    id: string;
    name: string;
    color: string;
    archived_at: string | null;
  };
}) {
  const isArchived = !!activityType.archived_at;
  const updateAction = updateActivityType.bind(null, activityType.id);
  const toggleAction = isArchived
    ? restoreActivityType.bind(null, activityType.id)
    : archiveActivityType.bind(null, activityType.id);

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 font-medium">{activityType.name}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="h-5 w-5 rounded"
            style={{ backgroundColor: activityType.color }}
          />
          <span className="font-mono text-xs text-muted-foreground">
            {activityType.color}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        {isArchived ? (
          <Badge variant="secondary">Archived</Badge>
        ) : (
          <Badge variant="outline" className="border-green-600 text-green-700">
            Active
          </Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {!isArchived && (
            <ActivityTypeFormDialog
              activityType={activityType}
              action={updateAction}
            />
          )}
          <form action={toggleAction}>
            <Button variant="ghost" size="sm" type="submit">
              {isArchived ? "Restore" : "Archive"}
            </Button>
          </form>
        </div>
      </td>
    </tr>
  );
}
