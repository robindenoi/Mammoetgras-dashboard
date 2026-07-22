"use client";

import { useState, useRef, useEffect } from "react";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { TZDate } from "@date-fns/tz";
import type { Appointment, Profile } from "@/lib/types";
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
  filterOwner: string; // "all" | profile-id
}

type FormState =
  | { mode: "new"; start: string }
  | { mode: "edit"; appt: Appointment }
  | null;

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_H = 48; // px per uur
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

export default function AgendaView({
  appointments,
  setAppointments,
  people,
  currentUserId,
  filterOwner,
}: Props) {
  const [mode, setMode] = useState<"week" | "dag">("week");
  const [ref, setRef] = useState<Date>(new Date());
  const [form, setForm] = useState<FormState>(null);
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

  // Bij openen naar ~8:00 scrollen.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 1 * HOUR_H;
  }, []);

  const days =
    mode === "week"
      ? weekDays(ref)
      : [new TZDate(ref.getTime(), TZ)];

  const visible = appointments.filter(
    (a) => filterOwner === "all" || a.owner_id === filterOwner
  );

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
                  {dayAppts.map((a) => {
                    const startMin = minutesIntoDay(a.starts_at);
                    const dur = Math.max(20, durationMinutes(a.starts_at, a.ends_at));
                    const top = ((startMin - START_HOUR * 60) / 60) * HOUR_H;
                    const height = (dur / 60) * HOUR_H;
                    const owner = people.find((p) => p.id === a.owner_id);
                    return (
                      <button
                        key={a.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm({ mode: "edit", appt: a });
                        }}
                        className={`absolute inset-x-1 z-20 overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm ${
                          a.type === "closing"
                            ? "bg-mg-accent text-white"
                            : "bg-mg-green text-white"
                        }`}
                        style={{ top, height }}
                      >
                        <span className="font-semibold">{formatTime(a.starts_at)}</span>{" "}
                        {a.title || (a.type === "closing" ? "Closing" : "Terugbel")}
                        {filterOwner === "all" && owner && (
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
