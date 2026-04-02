"use client";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

import { Calendar, dateFnsLocalizer, SlotInfo, Event } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, endOfWeek, getDay, startOfDay, endOfDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useState, useCallback, useEffect } from "react";
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

interface TimeLogEvent extends Event {
  id: string;
  resource: {
    clientId: string;
    grantId: string | null;
    grantColor: string | null;
    activityTypeId: string | null;
    activityTypeColor: string | null;
    caseNoteRef: string | null;
    correctionOf: string | null;
    isSuperseded: boolean;
  };
}

interface Props {
  clients: Client[];
  grants: Grant[];
  workDayStart: string;
  workDayEnd: string;
  timeSlotMinutes: number;
  lockAfterDays: number;
  userId: string;
  orgId: string;
}

const NO_COLOR = "#3b82f6";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 59, g: 130, b: 246 };
}

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
  timeSlotMinutes,
  lockAfterDays,
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
          "id, start_time, end_time, case_note_ref, activity_type_id, correction_of, superseded_at, clients(id, first_name, last_name), grants(id, name, grant_code, color), activity_types(id, name, color)"
        )
        .eq("caseworker_id", userId)
        .is("superseded_at", null) // hide entries replaced by an approved correction
        .gte("start_time", rangeStart.toISOString())
        .lte("start_time", rangeEnd.toISOString())
        .order("start_time");

      if (!data) return;

      setEvents(
        data.map((log) => {
          const client = log.clients as unknown as Client | null;
          const grant = log.grants as unknown as (Grant & { color: string }) | null;
          const activityType = log.activity_types as unknown as ActivityType | null;
          const clientName = client
            ? `${client.first_name} ${client.last_name}`
            : "Unknown";
          const baseTitle = grant
            ? `${clientName} — ${grant.grant_code}`
            : clientName;
          // Append a marker if this entry is itself a correction of an older one
          const title = log.correction_of ? `${baseTitle} ✎` : baseTitle;
          return {
            id: log.id,
            title,
            start: new Date(log.start_time),
            end: new Date(log.end_time),
            resource: {
              clientId: client?.id ?? "",
              grantId: grant?.id ?? null,
              grantColor: grant?.color ?? null,
              activityTypeId: log.activity_type_id ?? null,
              activityTypeColor: activityType?.color ?? null,
              caseNoteRef: log.case_note_ref,
              correctionOf: log.correction_of ?? null,
              isSuperseded: !!log.superseded_at,
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

  const eventPropGetter = useCallback((event: TimeLogEvent) => {
    // Left stripe = activity type color (what kind of work?)
    // Background tint = grant color (who's paying?)
    const stripeColor =
      event.resource.activityTypeColor ??
      event.resource.grantColor ??
      NO_COLOR;
    const bgColor = event.resource.grantColor ?? NO_COLOR;
    const { r, g, b } = hexToRgb(bgColor);
    return {
      style: {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
        boxShadow: `inset 4px 0 0 ${stripeColor}`,
        color: "#111827",
        border: "none",
      },
    };
  }, []);

  const min = timeStringToDate(workDayStart);
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
          step={timeSlotMinutes}
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
        lockAfterDays={lockAfterDays}
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
