"use client";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

import { Calendar, dateFnsLocalizer, SlotInfo, Event } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, endOfWeek, getDay, startOfDay, endOfDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useState, useCallback, useEffect, useMemo } from "react";
import type { View } from "react-big-calendar";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import TimeLogModal from "@/components/time-log-modal";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

const DnDCalendar = withDragAndDrop<TimeLogEvent>(Calendar);

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

interface TimeLogEvent extends Event {
  id: string;
  resource: {
    clientId: string;
    grantId: string | null;
    caseNoteRef: string | null;
  };
}

interface Props {
  clients: Client[];
  grants: Grant[];
  workDayStart: string;
  workDayEnd: string;
  userId: string;
  orgId: string;
}

const GRANT_COLORS = [
  "#7c3aed", // violet
  "#db2777", // pink
  "#d97706", // amber
  "#059669", // emerald
  "#dc2626", // red
  "#0891b2", // cyan
  "#ea580c", // orange
  "#4f46e5", // indigo
];

const NO_GRANT_COLOR = "#3b82f6"; // blue

function timeStringToDate(timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export default function TimeGrid({
  clients,
  grants,
  workDayStart,
  workDayEnd,
  userId,
  orgId,
}: Props) {
  const [events, setEvents] = useState<TimeLogEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>("day");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStart, setModalStart] = useState(new Date());
  const [modalEnd, setModalEnd] = useState(new Date());
  const [editingLog, setEditingLog] = useState<
    (TimeLogEvent["resource"] & { id: string }) | undefined
  >();

  const fetchEvents = useCallback(
    async (date: Date, view: View) => {
      const supabase = createClient();
      const rangeStart = view === "week"
        ? startOfWeek(date, { weekStartsOn: 0 })
        : startOfDay(date);
      const rangeEnd = view === "week"
        ? endOfWeek(date, { weekStartsOn: 0 })
        : endOfDay(date);
      const { data } = await supabase
        .from("time_logs")
        .select(
          "id, start_time, end_time, case_note_ref, clients(id, first_name, last_name), grants(id, name, grant_code)"
        )
        .eq("caseworker_id", userId)
        .gte("start_time", rangeStart.toISOString())
        .lte("start_time", rangeEnd.toISOString())
        .order("start_time");

      if (!data) return;

      setEvents(
        data.map((log) => {
          const client = log.clients as unknown as Client | null;
          const grant = log.grants as unknown as Grant | null;
          const clientName = client
            ? `${client.first_name} ${client.last_name}`
            : "Unknown";
          const title = grant
            ? `${clientName} — ${grant.grant_code}`
            : clientName;
          return {
            id: log.id,
            title,
            start: new Date(log.start_time),
            end: new Date(log.end_time),
            resource: {
              clientId: client?.id ?? "",
              grantId: grant?.id ?? null,
              caseNoteRef: log.case_note_ref,
            },
          };
        })
      );
    },
    [userId]
  );

  useEffect(() => {
    fetchEvents(currentDate, currentView);
  }, [currentDate, currentView, fetchEvents]);

  const handleDropOrResize = useCallback(
    async ({
      event,
      start,
      end,
    }: {
      event: TimeLogEvent;
      start: Date | string;
      end: Date | string;
    }) => {
      const newStart = new Date(start);
      const newEnd = new Date(end);

      const conflict = events.find(
        (e) =>
          e.id !== event.id &&
          (e.start as Date) < newEnd &&
          (e.end as Date) > newStart
      );

      if (conflict) {
        toast.error(`Overlaps with "${conflict.title}"`);
        return;
      }

      // Optimistically update local state for instant feedback
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id ? { ...e, start: newStart, end: newEnd } : e
        )
      );

      const supabase = createClient();
      const { error } = await supabase
        .from("time_logs")
        .update({
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        })
        .eq("id", event.id);

      if (error) {
        toast.error("Failed to move entry — reverting.");
        fetchEvents(currentDate, currentView);
      }
    },
    [events, currentDate, currentView, fetchEvents]
  );

  const handleSelectSlot = useCallback(({ start, end, action }: SlotInfo) => {
    if (action !== "select") return;
    setModalStart(start);
    setModalEnd(end);
    setEditingLog(undefined);
    setModalOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: TimeLogEvent) => {
    setModalStart(event.start as Date);
    setModalEnd(event.end as Date);
    setEditingLog({ id: event.id, ...event.resource });
    setModalOpen(true);
  }, []);

  // Build grantId → color map (stable order from grants array)
  const grantColorMap = useMemo(
    () =>
      Object.fromEntries(
        grants.map((g, i) => [g.id, GRANT_COLORS[i % GRANT_COLORS.length]])
      ),
    [grants]
  );

  const eventPropGetter = useCallback(
    (event: TimeLogEvent) => {
      const color = event.resource.grantId
        ? (grantColorMap[event.resource.grantId] ?? NO_GRANT_COLOR)
        : NO_GRANT_COLOR;
      return { style: { backgroundColor: color } };
    },
    [grantColorMap]
  );

  const min = timeStringToDate(workDayStart);
  // Subtract 1 min from max so totalMin = numGroups × step exactly,
  // fixing the 15-min DnD slot-snap offset caused by the library's +1.
  const max = new Date(timeStringToDate(workDayEnd).getTime() - 60_000);

  return (
    <>
      <div style={{ height: "680px" }}>
        <DnDCalendar
          localizer={localizer}
          events={events}
          defaultView="day"
          views={["day", "week"]}
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleDropOrResize}
          onEventResize={handleDropOrResize}
          eventPropGetter={eventPropGetter}
          resizable
          min={min}
          max={max}
          step={15}
          timeslots={1}
          style={{ height: "100%" }}
        />
      </div>

      <TimeLogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        start={modalStart}
        end={modalEnd}
        clients={clients}
        grants={grants}
        userId={userId}
        orgId={orgId}
        workDayStart={workDayStart}
        workDayEnd={workDayEnd}
        existingLog={editingLog}
        existingEvents={events.map((e) => ({
          id: e.id,
          title: (e.title as string) ?? "",
          start: e.start as Date,
          end: e.end as Date,
        }))}
        onSaved={() => fetchEvents(currentDate, currentView)}
      />
    </>
  );
}
