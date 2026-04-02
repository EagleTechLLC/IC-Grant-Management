"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";

export async function updateWorkDaySettings(formData: FormData) {
  const { supabase, orgId } = await requireAdmin();

  const workDayStart = (formData.get("work_day_start") as string).trim();
  const workDayEnd = (formData.get("work_day_end") as string).trim();

  if (!workDayStart || !workDayEnd) return;
  if (workDayEnd <= workDayStart) return;

  const { error } = await supabase
    .from("organizations")
    .update({ work_day_start: workDayStart, work_day_end: workDayEnd })
    .eq("id", orgId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
}

export async function updateTimeTrackingSettings(formData: FormData) {
  const { supabase, orgId } = await requireAdmin();

  const timeSlotMinutes = parseInt(formData.get("time_slot_minutes") as string, 10);
  const lockAfterDays = parseInt(formData.get("lock_after_days") as string, 10);

  if (isNaN(timeSlotMinutes) || isNaN(lockAfterDays)) return;
  if (![15, 30, 60].includes(timeSlotMinutes)) return;
  if (lockAfterDays < 0 || lockAfterDays > 30) return;

  const { error } = await supabase
    .from("organizations")
    .update({ time_slot_minutes: timeSlotMinutes, lock_after_days: lockAfterDays })
    .eq("id", orgId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
}

export async function updateAuditRetentionSettings(formData: FormData) {
  const { supabase, orgId } = await requireAdmin();

  const auditRetentionYears = parseInt(formData.get("audit_retention_years") as string, 10);

  if (isNaN(auditRetentionYears) || auditRetentionYears < 1 || auditRetentionYears > 25) return;

  const { error } = await supabase
    .from("organizations")
    .update({ audit_retention_years: auditRetentionYears })
    .eq("id", orgId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
}
