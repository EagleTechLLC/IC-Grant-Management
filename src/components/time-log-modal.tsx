"use client";

import { useState } from "react";
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  start: Date;
  end: Date;
  clients: Client[];
  grants: Grant[];
  userId: string;
  orgId: string;
  existingLog?: ExistingLog;
  onSaved: () => void;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
  existingLog,
  onSaved,
}: Props) {
  const [startTime, setStartTime] = useState(formatTime(start));
  const [endTime, setEndTime] = useState(formatTime(end));
  const [clientId, setClientId] = useState(existingLog?.clientId ?? "");
  const [grantId, setGrantId] = useState(existingLog?.grantId ?? "");
  const [caseNoteRef, setCaseNoteRef] = useState(
    existingLog?.caseNoteRef ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!clientId) {
      setError("Please select a client.");
      return;
    }
    const startIso = buildTimestamp(start, startTime);
    const endIso = buildTimestamp(start, endTime);
    if (endIso <= startIso) {
      setError("End time must be after start time.");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      org_id: orgId,
      caseworker_id: userId,
      client_id: clientId,
      grant_id: grantId || null,
      start_time: startIso,
      end_time: endIso,
      case_note_ref: caseNoteRef || null,
    };

    const { error: err } = existingLog
      ? await supabase
          .from("time_logs")
          .update(payload)
          .eq("id", existingLog.id)
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {existingLog ? "Edit Time Entry" : "New Time Entry"}
        </h2>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Start
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                End
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.last_name}, {c.first_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Grant
            </label>
            <select
              value={grantId}
              onChange={(e) => setGrantId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">No grant</option>
              {grants.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.grant_code} — {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Case Note Reference
            </label>
            <input
              type="text"
              value={caseNoteRef}
              onChange={(e) => setCaseNoteRef(e.target.value)}
              placeholder="Optional reference number or note"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            {existingLog && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
