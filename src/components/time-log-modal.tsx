"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface Grant {
  id: string;
  name: string;
  grant_code: string;
}

interface ExistingLog {
  id: string;
  clientId: string;
  grantId: string | null;
  caseNoteRef: string | null;
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
  workDayStart: string; // "08:00:00"
  workDayEnd: string;   // "16:30:00"
  existingLog?: ExistingLog;
  existingEvents: CalendarEvent[];
  onSaved: () => void;
}

// "08:00:00" or "08:00" → "08:00"
function normalizeTime(t: string): string {
  return t.slice(0, 5);
}

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
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function buildTimestamp(baseDate: Date, timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

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
  existingLog,
  existingEvents,
  onSaved,
}: Props) {
  const wdStart = normalizeTime(workDayStart);
  const wdEnd = normalizeTime(workDayEnd);
  const timeOptions = generateTimeOptions(wdStart, wdEnd);

  const clamp = (t: string) => (t < wdStart ? wdStart : t > wdEnd ? wdEnd : t);

  const [startTime, setStartTime] = useState(clamp(dateToTimeStr(start)));
  const [endTime, setEndTime] = useState(clamp(dateToTimeStr(end)));
  const [clientId, setClientId] = useState(existingLog?.clientId ?? "");
  const [grantId, setGrantId] = useState(existingLog?.grantId ?? "");
  const [caseNoteRef, setCaseNoteRef] = useState(existingLog?.caseNoteRef ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state whenever the modal opens for a new slot or event
  useEffect(() => {
    if (!isOpen) return;
    setStartTime(clamp(dateToTimeStr(start)));
    setEndTime(clamp(dateToTimeStr(end)));
    setClientId(existingLog?.clientId ?? "");
    setGrantId(existingLog?.grantId ?? "");
    setCaseNoteRef(existingLog?.caseNoteRef ?? "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, start, end, existingLog]);

  // Live overlap check — updates as the user changes start/end times
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

  // When start changes, push end forward if it's no longer after start
  const handleStartChange = (val: string) => {
    setStartTime(val);
    if (endTime <= val) {
      const next = addMinutes(val, 30);
      setEndTime(next > wdEnd ? wdEnd : next);
    }
  };

  if (!isOpen) return null;

  const endOptions = timeOptions.filter((o) => o.value > startTime);

  const handleSave = async () => {
    if (!clientId) {
      setError("Please select a client.");
      return;
    }
    if (overlapConflict) {
      setError(`Overlaps with "${overlapConflict.title}" — adjust the times to fix this.`);
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    // Server-side overlap check as a safety net for stale state
    const overlapQuery = supabase
      .from("time_logs")
      .select("id")
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
      start_time: buildTimestamp(start, startTime),
      end_time: buildTimestamp(start, endTime),
      case_note_ref: caseNoteRef || null,
    };

    const { error: err } = existingLog
      ? await supabase.from("time_logs").update(payload).eq("id", existingLog.id)
      : await supabase.from("time_logs").insert(payload);

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
    onClose();
  };

  const handleDelete = async () => {
    if (!existingLog) return;
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("time_logs")
      .delete()
      .eq("id", existingLog.id);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-gray-100">
        <h2 className="mb-5 text-base font-semibold text-gray-900">
          {existingLog ? "Edit Time Entry" : "New Time Entry"}
        </h2>

        {overlapConflict && (
          <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 ring-1 ring-amber-200">
            Overlaps with <span className="font-medium">&ldquo;{overlapConflict.title}&rdquo;</span> — adjust the times above to resolve before saving.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Start
              </label>
              <select
                value={startTime}
                onChange={(e) => handleStartChange(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {timeOptions
                  .filter((o) => o.value < wdEnd)
                  .map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
                End
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {endOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Client */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Client <span className="text-red-400">*</span>
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.last_name}, {c.first_name}
                </option>
              ))}
            </select>
          </div>

          {/* Grant */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Grant
            </label>
            <select
              value={grantId}
              onChange={(e) => setGrantId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No grant</option>
              {grants.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.grant_code} — {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Case note */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Case Note Reference
            </label>
            <input
              type="text"
              value={caseNoteRef}
              onChange={(e) => setCaseNoteRef(e.target.value)}
              placeholder="Optional reference number or note"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            {existingLog && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
