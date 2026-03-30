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

  const { data: grants } = await supabase
    .from("grants")
    .select("id, name, grant_code, archived_at")
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("name");

  const active = (grants ?? []).filter((g) => !g.archived_at);
  const archived = (grants ?? []).filter((g) => !!g.archived_at);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Grants</h1>
        <GrantFormDialog createAction={createGrant} updateAction={updateGrant} />
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
                  No grants yet. Create one to get started.
                </td>
              </tr>
            ) : (
              <>
                {active.map((grant) => (
                  <GrantRow
                    key={grant.id}
                    grant={grant}
                    updateAction={updateGrant}
                    archiveAction={archiveGrant}
                    restoreAction={restoreGrant}
                  />
                ))}
                {archived.map((grant) => (
                  <GrantRow
                    key={grant.id}
                    grant={grant}
                    updateAction={updateGrant}
                    archiveAction={archiveGrant}
                    restoreAction={restoreGrant}
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
  updateAction,
  archiveAction,
  restoreAction,
}: {
  grant: { id: string; name: string; grant_code: string; archived_at: string | null };
  updateAction: (id: string, formData: FormData) => Promise<void>;
  archiveAction: (id: string) => Promise<void>;
  restoreAction: (id: string) => Promise<void>;
}) {
  const isArchived = !!grant.archived_at;

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 font-medium">{grant.name}</td>
      <td className="px-4 py-3 font-mono text-muted-foreground">
        {grant.grant_code}
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
              createAction={async () => {}}
              updateAction={updateAction}
            />
          )}
          <form
            action={async () => {
              "use server";
              if (isArchived) {
                await restoreAction(grant.id);
              } else {
                await archiveAction(grant.id);
              }
            }}
          >
            <Button variant="ghost" size="sm" type="submit">
              {isArchived ? "Restore" : "Archive"}
            </Button>
          </form>
        </div>
      </td>
    </tr>
  );
}
