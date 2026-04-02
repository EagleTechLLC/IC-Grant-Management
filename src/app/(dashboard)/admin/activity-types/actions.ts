"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";

export async function createActivityType(formData: FormData) {
  const { supabase, orgId } = await requireAdmin();

  const name = (formData.get("name") as string).trim();
  const color = (formData.get("color") as string) || "#6b7280";
  const activity_code = (formData.get("activity_code") as string).trim().toUpperCase() || null;

  if (!name) return;

  // Default sort_order to end of list
  const { count } = await supabase
    .from("activity_types")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  const { error } = await supabase
    .from("activity_types")
    .insert({ org_id: orgId, name, color, activity_code, sort_order: count ?? 0 });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/activity-types");
}

export async function updateActivityType(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const name = (formData.get("name") as string).trim();
  const color = (formData.get("color") as string) || "#6b7280";
  const activity_code = (formData.get("activity_code") as string).trim().toUpperCase() || null;

  if (!name) return;

  const { error } = await supabase
    .from("activity_types")
    .update({ name, color, activity_code })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/activity-types");
  revalidatePath("/dashboard");
}

export async function archiveActivityType(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("activity_types")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/activity-types");
}

export async function restoreActivityType(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("activity_types")
    .update({ archived_at: null })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/activity-types");
}
