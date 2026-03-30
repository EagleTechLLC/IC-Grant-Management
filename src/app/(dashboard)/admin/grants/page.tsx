import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import GrantFormDialog from "@/components/grant-form-dialog";
import { createGrant, updateGrant, archiveGrant, restoreGrant } from "./actions";

export default async function AdminGrantsPage() {
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

  const [{ data: rawGrants }, { data: activityTypes }] = await Promise.all([
    supabase
      .from("grants")
      .select(
        "id, name, grant_code, color, archived_at, grant_activity_types(activity_type_id)"
      )
      .order("archived_at", { ascending: true, nullsFirst: true })
      .order("name"),
    supabase
      .from("activity_types")
      .select("id, name, color")
      .eq("org_id", profile.org_id)
      .is("archived_at", null)
      .order("sort_order")
      .order("name"),
  ]);

  const grants = (rawGrants ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    grant_code: g.grant_code,
    color: g.color ?? "#3b82f6",
    archived_at: g.archived_at,
    activityTypeIds: (
      g.grant_activity_types as { activity_type_id: string }[]
    ).map((gat) => gat.activity_type_id),
  }));

  const active = grants.filter((g) => !g.archived_at);
  const archived = grants.filter((g) => !!g.archived_at);
  const allActivityTypes = activityTypes ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Grants</h1>
        <GrantFormDialog
          action={createGrant}
          activityTypes={allActivityTypes}
        />
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Code
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
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No grants yet. Create one to get started.
                </td>
              </tr>
            ) : (
              <>
                {active.map((grant) => (
                  <GrantRow
                    key={grant.id}
                    grant={grant}
                    activityTypes={allActivityTypes}
                  />
                ))}
                {archived.map((grant) => (
                  <GrantRow
                    key={grant.id}
                    grant={grant}
                    activityTypes={allActivityTypes}
                  />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GrantRow({
  grant,
  activityTypes,
}: {
  grant: {
    id: string;
    name: string;
    grant_code: string;
    color: string;
    archived_at: string | null;
    activityTypeIds: string[];
  };
  activityTypes: { id: string; name: string; color: string }[];
}) {
  const isArchived = !!grant.archived_at;
  const updateAction = updateGrant.bind(null, grant.id);
  const toggleAction = isArchived
    ? restoreGrant.bind(null, grant.id)
    : archiveGrant.bind(null, grant.id);

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 font-medium">{grant.name}</td>
      <td className="px-4 py-3 font-mono text-muted-foreground">
        {grant.grant_code}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="h-5 w-5 rounded"
            style={{ backgroundColor: grant.color }}
          />
          <span className="font-mono text-xs text-muted-foreground">
            {grant.color}
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
            <GrantFormDialog
              grant={grant}
              action={updateAction}
              activityTypes={activityTypes}
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
