"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";

export async function createGrant(formData: FormData) {
  const { supabase, orgId } = await requireAdmin();

  const name = (formData.get("name") as string).trim();
  const grantCode = (formData.get("grant_code") as string).trim();
  const color = (formData.get("color") as string) || "#3b82f6";
  const activityTypeIds = formData.getAll("activity_type_ids") as string[];

  if (!name || !grantCode) return;

  const { data: grant, error } = await supabase
    .from("grants")
    .insert({ org_id: orgId, name, grant_code: grantCode, color })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (grant && activityTypeIds.length > 0) {
    await supabase.from("grant_activity_types").insert(
      activityTypeIds.map((atId) => ({
        grant_id: grant.id,
        activity_type_id: atId,
      }))
    );
  }

  revalidatePath("/admin/grants");
}

export async function updateGrant(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const name = (formData.get("name") as string).trim();
  const grantCode = (formData.get("grant_code") as string).trim();
  const color = (formData.get("color") as string) || "#3b82f6";
  const activityTypeIds = formData.getAll("activity_type_ids") as string[];

  if (!name || !grantCode) return;

  const { error } = await supabase
    .from("grants")
    .update({ name, grant_code: grantCode, color })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Replace junction rows
  await supabase.from("grant_activity_types").delete().eq("grant_id", id);
  if (activityTypeIds.length > 0) {
    await supabase.from("grant_activity_types").insert(
      activityTypeIds.map((atId) => ({
        grant_id: id,
        activity_type_id: atId,
      }))
    );
  }

  revalidatePath("/admin/grants");
  revalidatePath("/dashboard");
}

export async function archiveGrant(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("grants")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/grants");
  revalidatePath("/dashboard");
}

export async function restoreGrant(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("grants")
    .update({ archived_at: null })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/grants");
  revalidatePath("/dashboard");
}
