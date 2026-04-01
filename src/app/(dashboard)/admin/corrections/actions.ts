"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";

export async function approveCorrection(correctionId: string, reviewNote: string) {
  const { supabase, orgId } = await requireAdmin();

  // Fetch the full correction request
  const { data: correction, error: fetchErr } = await supabase
    .from("time_log_corrections")
    .select("*, time_logs!original_log_id(org_id, caseworker_id)")
    .eq("id", correctionId)
    .eq("org_id", orgId)
    .eq("status", "pending")
    .single();

  if (fetchErr || !correction) throw new Error("Correction not found or already resolved.");

  const original = correction.time_logs as unknown as {
    org_id: string;
    caseworker_id: string;
  } | null;

  if (!original) throw new Error("Original log not found.");

  const reviewer = await supabase.auth.getUser();
  const reviewerId = reviewer.data.user?.id;

  // Create the replacement time_log entry
  const { data: newLog, error: insertErr } = await supabase
    .from("time_logs")
    .insert({
      org_id: original.org_id,
      caseworker_id: original.caseworker_id,
      client_id: correction.new_client_id,
      grant_id: correction.new_grant_id,
      activity_type_id: correction.new_activity_type_id,
      start_time: correction.new_start_time,
      end_time: correction.new_end_time,
      case_note_ref: correction.new_case_note_ref,
      correction_of: correction.original_log_id,
    })
    .select("id")
    .single();

  if (insertErr || !newLog) throw new Error(insertErr?.message ?? "Failed to create replacement entry.");

  // Mark the original as superseded
  await supabase
    .from("time_logs")
    .update({ superseded_at: new Date().toISOString() })
    .eq("id", correction.original_log_id);

  // Update the correction record
  await supabase
    .from("time_log_corrections")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      review_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
      replacement_log_id: newLog.id,
    })
    .eq("id", correctionId);

  revalidatePath("/admin/corrections");
}

export async function rejectCorrection(correctionId: string, reviewNote: string) {
  const { supabase, orgId } = await requireAdmin();

  const reviewer = await supabase.auth.getUser();
  const reviewerId = reviewer.data.user?.id;

  const { error } = await supabase
    .from("time_log_corrections")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      review_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", correctionId)
    .eq("org_id", orgId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  revalidatePath("/admin/corrections");
}
