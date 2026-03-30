"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";

export async function updateWorkDaySettings(formData: FormData) {
  const { supabase, orgId } = await requireAdmin();

  const workDayStart = (formData.get("work_day_start") as string).trim();
  const workDayEnd = (formData.get("work_day_end") as string).trim();

  if (!workDayStart || !workDayEnd) return;
  if (workDayEnd <= workDayStart) return; // validation — end must be after start

  const { error } = await supabase
    .from("organizations")
    .update({ work_day_start: workDayStart, work_day_end: workDayEnd })
    .eq("id", orgId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
}
