"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/dashboard");
  return { supabase, orgId: profile.org_id };
}

export async function createGrant(formData: FormData) {
  const { supabase, orgId } = await requireAdmin();

  const name = (formData.get("name") as string).trim();
  const grantCode = (formData.get("grant_code") as string).trim();

  if (!name || !grantCode) return;

  const { error } = await supabase
    .from("grants")
    .insert({ org_id: orgId, name, grant_code: grantCode });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/grants");
}

export async function updateGrant(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const name = (formData.get("name") as string).trim();
  const grantCode = (formData.get("grant_code") as string).trim();

  if (!name || !grantCode) return;

  const { error } = await supabase
    .from("grants")
    .update({ name, grant_code: grantCode })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/grants");
}

export async function archiveGrant(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("grants")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/grants");
}

export async function restoreGrant(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("grants")
    .update({ archived_at: null })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/grants");
}
