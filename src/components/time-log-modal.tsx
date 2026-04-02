"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { requestCorrection } from "@/app/(dashboard)/dashboard/actions";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  alien_number: string | null;
}

interface ActivityType {
  id: string;
  name: string;
  color: string;
  activity_code: string | null;
}

interface Grant {
  id: string;
  name: string;
  grant_code: string;
  color: string;
  activityTypes: ActivityType[];
}

interface ExistingLog {
  id: string;
  clientId: string;
  grantId: string | null;
  activityTypeId: string | null;
  caseNoteRef: string | null;
  correctionOf: string | null;
  isSuperseded: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  start: Date;
  end: Date;
  clients: Client[];
  grants: Grant[];
  userId: string;
  orgId: string;
  workDayStart: string;
  workDayEnd: string;
  lockAfterDays: number;
  existingLog?: ExistingLog;
  existingEvents: CalendarEvent[];
  onSaved: () => void;
}

function normalizeTime(t: string): string { return t.slice(0, 5); }
function dateToTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function timeStrToLabel(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}
function generateTimeOptions(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const options: { value: string; label: string }[] = [];
  for (let mins = sh * 60 + sm; mins <= eh * 60 + em; mins += 15) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    options.push({ value, label: timeStrToLabel(value) });
  }
  return options;
}
function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function buildTimestamp(baseDate: Date, timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function isEntryLocked(entryStart: Date, lockAfterDays: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entryDate = new Date(entryStart);
  entryDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / 86_400_000);
  return daysDiff > lockAfterDays;
}

type ModalView = "edit" | "locked" | "correction";

export default function TimeLogModal({
  isOpen,
  onClose,
  start,
  end,
  clients,
  grants,
  userId,
  orgId,
  workDayStart,
  workDayEnd,
  lockAfterDays,
  existingLog,
  existingEvents,
  onSaved,
}: Props) {
  const wdStart = normalizeTime(workDayStart);
  const wdEnd = normalizeTime(workDayEnd);
  const timeOptions = generateTimeOptions(wdStart, wdEnd);
  const clamp = (t: string) => (t < wdStart ? wdStart : t > wdEnd ? wdEnd : t);

  const locked = !!existingLog && isEntryLocked(start, lockAfterDays);
  const initialView: ModalView = existingLog
    ? locked ? "locked" : "edit"
    : "edit";

  const [view, setView] = useState<ModalView>(initialView);
  const [startTime, setStartTime] = useState(clamp(dateToTimeStr(start)));
  const [endTime, setEndTime] = useState(clamp(dateToTimeStr(end)));
  const [clientId, setClientId] = useState(existingLog?.clientId ?? "");
  const [grantId, setGrantId] = useState(existingLog?.grantId ?? "");
  const [activityTypeId, setActivityTypeId] = useState(existingLog?.activityTypeId ?? "");
  const [caseNoteRef, setCaseNoteRef] = useState(existingLog?.caseNoteRef ?? "");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const lk = !!existingLog && isEntryLocked(start, lockAfterDays);
    setView(existingLog ? (lk ? "locked" : "edit") : "edit");
    setStartTime(clamp(dateToTimeStr(start)));
    setEndTime(clamp(dateToTimeStr(end)));
    setClientId(existingLog?.clientId ?? "");
    setGrantId(existingLog?.grantId ?? "");
    setActivityTypeId(existingLog?.activityTypeId ?? "");
    setCaseNoteRef(existingLog?.caseNoteRef ?? "");
    setReason("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, start, end, existingLog]);

  const handleGrantChange = (val: string) => {
    setGrantId(val);
    setActivityTypeId("");
  };

  const selectedGrant = grants.find((g) => g.id === grantId) ?? null;
  const availableActivityTypes = selectedGrant?.activityTypes ?? [];

  const overlapConflict = useMemo(() => {
    const s = buildTimestamp(start, startTime);
    const e = buildTimestamp(start, endTime);
    return (
      existingEvents.find(
        (ev) =>
          ev.id !== existingLog?.id &&
          ev.start.toISOString() < e &&
          ev.end.toISOString() > s
      ) ?? null
    );
  }, [start, startTime, endTime, existingEvents, existingLog]);

  const handleStartChange = (val: string) => {
    setStartTime(val);
    if (endTime <= val) {
      const next = addMinutes(val, 30);
      setEndTime(next > wdEnd ? wdEnd : next);
    }
  };

  const endOptions = timeOptions.filter((o) => o.value > startTime);
  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.alien_number
      ? `${c.last_name}, ${c.first_name} (A# ${c.alien_number})`
      : `${c.last_name}, ${c.first_name}`,
  }));
  const grantOptions = [
    { value: "", label: "No grant" },
    ...grants.map((g) => ({ value: g.id, label: `${g.grant_code} — ${g.name}` })),
  ];
  const activityTypeOptions = [
    { value: "", label: "No activity type" },
    ...availableActivityTypes.map((at) => ({
      value: at.id,
      label: at.activity_code ? `${at.activity_code} — ${at.name}` : at.name,
    })),
  ];

  // ── Normal save (unlocked entry) ──────────────────────────────────────────
  const handleSave = async () => {
    if (!clientId) { setError("Please select a client."); return; }
    if (overlapConflict) {
      setError(`Overlaps with "${overlapConflict.title}" — adjust the times to fix this.`);
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const overlapQuery = supabase
      .from("time_logs").select("id")
      .eq("caseworker_id", userId)
      .lt("start_time", buildTimestamp(start, endTime))
      .gt("end_time", buildTimestamp(start, startTime))
      .limit(1);
    const { data: overlaps } = await (existingLog
      ? overlapQuery.neq("id", existingLog.id)
      : overlapQuery);
    if (overlaps && overlaps.length > 0) {
      setError("This time block overlaps with an existing entry.");
      setLoading(false);
      return;
    }

    const payload = {
      org_id: orgId,
      caseworker_id: userId,
      client_id: clientId,
      grant_id: grantId || null,
      activity_type_id: activityTypeId || null,
      start_time: buildTimestamp(start, startTime),
      end_time: buildTimestamp(start, endTime),
      case_note_ref: caseNoteRef || null,
    };

    const { error: err } = existingLog
      ? await supabase.from("time_logs").update(payload).eq("id", existingLog.id)
      : await supabase.from("time_logs").insert(payload);

    setLoading(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  };

  const handleDelete = async () => {
    if (!existingLog) return;
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("time_logs").delete().eq("id", existingLog.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  };

  // ── Correction request submit ─────────────────────────────────────────────
  const handleCorrectionSubmit = async () => {
    if (!reason.trim()) { setError("Please explain why this correction is needed."); return; }
    if (!clientId) { setError("Please select a client."); return; }
    setLoading(true);
    setError(null);
    try {
      await requestCorrection({
        orgId,
        originalLogId: existingLog!.id,
        reason: reason.trim(),
        newClientId: clientId,
        newGrantId: grantId || null,
        newActivityTypeId: activityTypeId || null,
        newStartTime: buildTimestamp(start, startTime),
        newEndTime: buildTimestamp(start, endTime),
        newCaseNoteRef: caseNoteRef || null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit correction.");
    } finally {
      setLoading(false);
    }
  };

  // ── Lookup display helpers ────────────────────────────────────────────────
  const clientLabel = (() => {
    const c = clients.find((c) => c.id === existingLog?.clientId);
    if (!c) return "Unknown";
    return c.alien_number
      ? `${c.last_name}, ${c.first_name} (A# ${c.alien_number})`
      : `${c.last_name}, ${c.first_name}`;
  })();
  const grantLabel = grants.find((g) => g.id === existingLog?.grantId)?.name ?? "No grant";
  const atLabel = grants
    .flatMap((g) => g.activityTypes)
    .find((at) => at.id === existingLog?.activityTypeId)?.name ?? "None";

  const formFields = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start</label>
          <select value={startTime} onChange={(e) => handleStartChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring">
            {timeOptions.filter((o) => o.value < wdEnd).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End</label>
          <select value={endTime} onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring">
            {endOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Client <span className="text-destructive">*</span>
        </label>
        <Combobox options={clientOptions} value={clientId} onSelect={setClientId}
          placeholder="Select a client…" searchPlaceholder="Search clients…" emptyText="No clients found." />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Grant</label>
        <Combobox options={grantOptions} value={grantId} onSelect={handleGrantChange}
          placeholder="No grant" searchPlaceholder="Search grants…" emptyText="No grants found." />
      </div>
      {grantId && availableActivityTypes.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Activity Type</label>
          <Combobox options={activityTypeOptions} value={activityTypeId} onSelect={setActivityTypeId}
            placeholder="No activity type" searchPlaceholder="Search activity types…" emptyText="No activity types found." />
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Case Note Reference</label>
        <Input value={caseNoteRef} onChange={(e) => setCaseNoteRef(e.target.value)}
          placeholder="Optional reference number or note" />
      </div>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {view === "correction" ? "Request Correction"
              : view === "locked" ? "Time Entry (Locked)"
              : existingLog ? "Edit Time Entry"
              : "New Time Entry"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Locked read-only view ── */}
          {view === "locked" && (
            <>
              <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{clientLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grant</span>
                  <span>{grantLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Activity</span>
                  <span>{atLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span>{dateToTimeStr(start)} – {dateToTimeStr(end)}</span>
                </div>
                {existingLog?.caseNoteRef && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Case Note</span>
                    <span>{existingLog.caseNoteRef}</span>
                  </div>
                )}
              </div>
              {existingLog?.correctionOf && (
                <p className="text-xs text-muted-foreground">
                  ✎ This entry is a correction of a previous entry.
                </p>
              )}
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                This entry is locked. To make changes, submit a correction request for admin approval.
              </div>
            </>
          )}

          {/* ── Correction request form ── */}
          {view === "correction" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reason for correction <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain what needs to change and why…"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Update the fields below to show the correct values:
              </p>
              {overlapConflict && (
                <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 ring-1 ring-amber-200">
                  Proposed times overlap with &ldquo;{overlapConflict.title}&rdquo;.
                </div>
              )}
              {formFields}
            </>
          )}

          {/* ── Normal edit form ── */}
          {view === "edit" && (
            <>
              {overlapConflict && (
                <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 ring-1 ring-amber-200">
                  Overlaps with{" "}
                  <span className="font-medium">&ldquo;{overlapConflict.title}&rdquo;</span>{" "}
                  — adjust the times above to resolve before saving.
                </div>
              )}
              {formFields}
            </>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          {view === "locked" && (
            <>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={() => setView("correction")}>Request Correction</Button>
            </>
          )}
          {view === "correction" && (
            <>
              <Button variant="ghost" onClick={() => setView("locked")} disabled={loading}>Back</Button>
              <Button onClick={handleCorrectionSubmit} disabled={loading}>
                {loading ? "Submitting…" : "Submit for Approval"}
              </Button>
            </>
          )}
          {view === "edit" && (
            <>
              <div>
                {existingLog && (
                  <Button variant="ghost" size="sm" onClick={handleDelete} disabled={loading}
                    className="text-destructive hover:text-destructive">
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "Saving…" : "Save"}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
