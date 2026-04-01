"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestCorrection(data: {
  orgId: string;
  originalLogId: string;
  reason: string;
  newClientId: string;
  newGrantId: string | null;
  newActivityTypeId: string | null;
  newStartTime: string;
  newEndTime: string;
  newCaseNoteRef: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify the original log belongs to this caseworker
  const { data: original } = await supabase
    .from("time_logs")
    .select("id, caseworker_id, org_id")
    .eq("id", data.originalLogId)
    .single();

  if (!original || original.caseworker_id !== user.id) {
    throw new Error("Not authorized to request correction on this entry.");
  }

  // Check for overlaps with proposed new times (excluding the original entry)
  const { data: overlaps } = await supabase
    .from("time_logs")
    .select("id")
    .eq("caseworker_id", user.id)
    .neq("id", data.originalLogId)
    .is("superseded_at", null)
    .lt("start_time", data.newEndTime)
    .gt("end_time", data.newStartTime)
    .limit(1);

  if (overlaps && overlaps.length > 0) {
    throw new Error("Proposed times overlap with an existing entry.");
  }

  const { error } = await supabase.from("time_log_corrections").insert({
    org_id: data.orgId,
    original_log_id: data.originalLogId,
    requested_by: user.id,
    reason: data.reason,
    new_client_id: data.newClientId,
    new_grant_id: data.newGrantId,
    new_activity_type_id: data.newActivityTypeId,
    new_start_time: data.newStartTime,
    new_end_time: data.newEndTime,
    new_case_note_ref: data.newCaseNoteRef,
  });

  if (error) throw new Error(error.message);
}
