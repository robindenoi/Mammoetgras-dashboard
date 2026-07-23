"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { TZDate } from "@date-fns/tz";
import type { Appointment, Profile, Role } from "@/lib/types";
import {
  TZ,
  weekDays,
  sameAmsterdamDay,
  formatTime,
  minutesIntoDay,
  durationMinutes,
} from "@/lib/time";
import AppointmentForm from "./AppointmentForm";

interface Props {
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  people: Profile[];
  currentUserId: string;
  currentUserRole: Role;
  filterOwner: string;
  handedOffLeadCloser?: Record<string, string>;
  profilesById?: Record<string, Profile>;
}

type FormState =
  | { mode: "new"; start: string }
  | { mode: "edit"; appt: Appointment }
  | null;

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_H = 48;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

const CLOSER_COLORS = [
  { bg: "#6366f1", text: "white" },  // indigo
  { bg: "#f59e0b", text: "white" },  // amber
  { bg: "#ec4899", text: "white" },  // pink
  { bg: "#8b5cf6", text: "white" },  // violet
  { bg: "#14b8a6", text: "white" },  // teal
];

interface LayoutSlot {
  appt: Appointment;
  col: number;
  totalCols: number;
}

function layoutOverlaps(appts: Appointment[]): LayoutSlot[] {
  if (appts.length === 0) return [];

  const sorted = [...appts].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  const clusters: Appointment[][] = [];
  let current: Appointment[] = [sorted[0]];
  let clusterEnd = new Date(sorted[0].ends_at).getTime();

  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i];
    if (new Date(a.starts_at).getTime() < clusterEnd) {
      current.push(a);
      clusterEnd = Math.max(clusterEnd, new Date(a.ends_at).getTime());
    } else {
      clusters.push(current);
      current = [a];
      clusterEnd = new Date(a.ends_at).getTime();
    }
  }
  clusters.push(current);

  const result: LayoutSlot[] = [];
  for (const cluster of clusters) {
    const cols: { end: number }[] = [];
    for (const a of cluster) {
      const aStart = new Date(a.starts_at).getTime();
      let placed = false;
      for (let c = 0; c < cols.length; c++) {
        if (aStart >= cols[c].end) {
          cols[c].end = new Date(a.ends_at).getTime();
          result.push({ appt: a, col: c, totalCols: 0 });
          placed = true;
          break;
        }
      }
      if (!placed) {
        cols.push({ end: new Date(a.ends_at).getTime() });
        result.push({ appt: a, col: cols.length - 1, totalCols: 0 });
      }
    }
    const total = cols.length;
    for (const slot of result) {
      if (cluster.includes(slot.appt)) slot.totalCols = total;
    }
  }

  return result;
}

export default function AgendaView({
  appointments,
  setAppointments,
  people,
  currentUserId,
  currentUserRole,
  filterOwner,
  handedOffLeadCloser,
  profilesById,
}: Props) {
  const [mode, setMode] = useState<"week" | "dag">("week");
  const [ref, setRef] = useState<Date>(new Date());
  const [form, setForm] = useState<FormState>(null);
  const [showCloserAppts, setShowCloserAppts] = useState(true);
  const [nowMin, setNowMin] = useState(() =>
    minutesIntoDay(new Date().toISOString())
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const i = setInterval(
      () => setNowMin(minutesIntoDay(new Date().toISOString())),
      60 * 1000
    );
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 1 * HOUR_H;
  }, []);

  const days =
    mode === "week"
      ? weekDays(ref)
      : [new TZDate(ref.getTime(), TZ)];

  // Build closer color map from handedOffLeadCloser
  const closerColorMap = useMemo(() => {
    const map: Record<string, { bg: string; text: string; name: string }> = {};
    if (!handedOffLeadCloser) return map;
    const closerIds = [...new Set(Object.values(handedOffLeadCloser))];
    closerIds.forEach((id, i) => {
      const color = CLOSER_COLORS[i % CLOSER_COLORS.length];
      const name = profilesById?.[id]?.full_name || "Closer";
      map[id] = { ...color, name };
    });
    return map;
  }, [handedOffLeadCloser, profilesById]);

  const hasCloserAppts = Object.keys(closerColorMap).length > 0;

  // Visible appointments: own + handed-off leads at closers
  const visible = useMemo(() => {
    const own = appointments.filter(
      (a) => filterOwner === "all" || a.owner_id === filterOwner
    );
    if (!showCloserAppts || !handedOffLeadCloser || filterOwner === "all") return own;

    const closerAppts = appointments.filter((a) => {
      if (!a.lead_id) return false;
      if (a.owner_id === filterOwner) return false;
      const closerId = handedOffLeadCloser[a.lead_id];
      return closerId && a.owner_id === closerId;
    });

    // Dedupe
    const ownIds = new Set(own.map((a) => a.id));
    return [...own, ...closerAppts.filter((a) => !ownIds.has(a.id))];
  }, [appointments, filterOwner, showCloserAppts, handedOffLeadCloser]);

  function apptColor(a: Appointment): { bg: string; text: string } | null {
    if (!handedOffLeadCloser || !a.lead_id) return null;
    const closerId = handedOffLeadCloser[a.lead_id];
    if (closerId && a.owner_id === closerId && a.owner_id !== filterOwner) {
      return closerColorMap[closerId] || null;
    }
    return null;
  }

  const step = mode === "week" ? 7 : 1;
  const label =
    mode === "week"
      ? `${format(days[0], "d MMM", { locale: nl })} – ${format(days[6], "d MMM", { locale: nl })}`
      : format(days[0], "EEEE d MMMM yyyy", { locale: nl });

  function upsert(appt: Appointment) {
    setAppointments((prev) => {
      const idx = prev.findIndex((a) => a.id === appt.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = appt;
        return next;
      }
      return [...prev, appt];
    });
    setForm(null);
  }

  function slotClick(day: TZDate, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMin = START_HOUR * 60 + (y / HOUR_H) * 60;
    const snapped = Math.round(totalMin / 15) * 15;
    const hh = String(Math.floor(snapped / 60)).padStart(2, "0");
    const mm = String(snapped % 60).padStart(2, "0");
    const start = `${format(day, "yyyy-MM-dd")}T${hh}:${mm}`;
    setForm({ mode: "new", start });
  }

  const gridHeight = (END_HOUR - START_HOUR) * HOUR_H;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRef((d) => addDays(d, -step))}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={() => setRef(new Date())}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
          >
            Vandaag
          </button>
          <button
            onClick={() => setRef((d) => addDays(d, step))}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
          >
            →
          </button>
        </div>
        <span className="text-sm font-semibold text-mg-dark">{label}</span>

        <div className="ml-auto inline-flex rounded-lg bg-white p-1 shadow-sm">
          <button
            onClick={() => setMode("dag")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === "dag" ? "bg-mg-green text-white" : "text-gray-600"}`}
          >
            Dag
          </button>
          <button
            onClick={() => setMode("week")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === "week" ? "bg-mg-green text-white" : "text-gray-600"}`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Legenda closer-kleuren + toggle */}
      {hasCloserAppts && filterOwner !== "all" && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showCloserAppts}
              onChange={(e) => setShowCloserAppts(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-mg-green focus:ring-mg-green"
            />
            <span className="font-medium text-gray-700">Toon doorgezette leads bij closers</span>
          </label>
          {showCloserAppts && Object.entries(closerColorMap).map(([id, { bg, name }]) => (
            <span key={id} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: bg }}
              />
              <span className="font-medium text-gray-600">{name}</span>
            </span>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {/* Dag-koppen */}
        <div
          className="grid border-b border-gray-100"
          style={{ gridTemplateColumns: `3rem repeat(${days.length}, 1fr)` }}
        >
          <div />
          {days.map((day) => {
            const today = sameAmsterdamDay(new Date().toISOString(), day);
            return (
              <div
                key={day.getTime()}
                className={`py-2 text-center text-xs font-bold uppercase tracking-wider ${today ? "text-mg-green" : "text-gray-500"}`}
              >
                {format(day, "EEE d/M", { locale: nl })}
              </div>
            );
          })}
        </div>

        {/* Tijdrooster */}
        <div ref={scrollRef} className="max-h-[70vh] overflow-y-auto">
          <div
            className="grid"
            style={{ gridTemplateColumns: `3rem repeat(${days.length}, 1fr)` }}
          >
            {/* Uur-labels */}
            <div className="relative" style={{ height: gridHeight }}>
              {HOURS.map((h, i) => (
                <div
                  key={h}
                  className="absolute right-1 -translate-y-1/2 text-[10px] text-gray-400"
                  style={{ top: i * HOUR_H }}
                >
                  {h}:00
                </div>
              ))}
            </div>

            {/* Dag-kolommen */}
            {days.map((day) => {
              const today = sameAmsterdamDay(new Date().toISOString(), day);
              const dayAppts = visible.filter((a) =>
                sameAmsterdamDay(a.starts_at, day)
              );
              const layout = layoutOverlaps(dayAppts);
              return (
                <div
                  key={day.getTime()}
                  onClick={(e) => slotClick(day, e)}
                  className="relative cursor-pointer border-l border-gray-100"
                  style={{ height: gridHeight }}
                >
                  {/* uurlijnen */}
                  {HOURS.map((h, i) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-gray-100"
                      style={{ top: i * HOUR_H }}
                    />
                  ))}

                  {/* nu-lijn */}
                  {today &&
                    nowMin >= START_HOUR * 60 &&
                    nowMin <= END_HOUR * 60 && (
                      <div
                        className="absolute inset-x-0 z-10 border-t-2 border-red-500"
                        style={{ top: ((nowMin - START_HOUR * 60) / 60) * HOUR_H }}
                      >
                        <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                      </div>
                    )}

                  {/* afspraken */}
                  {layout.map(({ appt: a, col, totalCols }) => {
                    const startMin = minutesIntoDay(a.starts_at);
                    const dur = Math.max(20, durationMinutes(a.starts_at, a.ends_at));
                    const top = ((startMin - START_HOUR * 60) / 60) * HOUR_H;
                    const height = (dur / 60) * HOUR_H;
                    const owner = people.find((p) => p.id === a.owner_id);
                    const widthPct = 100 / totalCols;
                    const leftPct = col * widthPct;
                    const closerColor = apptColor(a);
                    return (
                      <button
                        key={a.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm({ mode: "edit", appt: a });
                        }}
                        className={`absolute z-20 overflow-hidden rounded-md px-1 py-0.5 text-left text-[11px] leading-tight shadow-sm ${
                          closerColor
                            ? ""
                            : a.type === "closing"
                              ? "bg-mg-accent text-white"
                              : "bg-mg-green text-white"
                        }`}
                        style={{
                          top,
                          height,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                          ...(closerColor
                            ? { backgroundColor: closerColor.bg, color: closerColor.text }
                            : {}),
                        }}
                      >
                        <span className="font-semibold">{formatTime(a.starts_at)}</span>{" "}
                        {a.title || (a.type === "closing" ? "Closing" : "Terugbel")}
                        {(filterOwner === "all" || closerColor) && owner && (
                          <span className="block opacity-80">{owner.full_name}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        Tip: klik op een leeg tijdslot om een afspraak toe te voegen.
      </p>

      {form && (
        <AppointmentForm
          appointment={form.mode === "edit" ? form.appt : null}
          people={people}
          defaultOwnerId={filterOwner !== "all" ? filterOwner : currentUserId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          defaultStart={form.mode === "new" ? form.start : undefined}
          onSaved={upsert}
          onDeleted={(id) => {
            setAppointments((prev) => prev.filter((a) => a.id !== id));
            setForm(null);
          }}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
