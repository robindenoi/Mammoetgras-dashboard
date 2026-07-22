"use client";

import { useState } from "react";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import type { Appointment, Profile } from "@/lib/types";
import { weekDays, sameAmsterdamDay, formatTime } from "@/lib/time";
import AppointmentForm from "./AppointmentForm";

interface Props {
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  people: Profile[];
  currentUserId: string;
  filterOwner: string; // "all" | profile-id
}

type FormState =
  | { mode: "new"; date: string }
  | { mode: "edit"; appt: Appointment }
  | null;

export default function AgendaView({
  appointments,
  setAppointments,
  people,
  currentUserId,
  filterOwner,
}: Props) {
  const [weekRef, setWeekRef] = useState<Date>(new Date());
  const [form, setForm] = useState<FormState>(null);

  const days = weekDays(weekRef);
  const visible = appointments.filter(
    (a) => filterOwner === "all" || a.owner_id === filterOwner
  );

  const weekLabel = `${format(days[0], "d MMM", { locale: nl })} – ${format(
    days[6],
    "d MMM",
    { locale: nl }
  )}`;

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

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekRef((d) => addDays(d, -7))}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={() => setWeekRef(new Date())}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
          >
            Deze week
          </button>
          <button
            onClick={() => setWeekRef((d) => addDays(d, 7))}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
          >
            →
          </button>
        </div>
        <span className="text-sm font-semibold text-mg-dark">{weekLabel}</span>
        <button
          onClick={() =>
            setForm({ mode: "new", date: format(new Date(), "yyyy-MM-dd") })
          }
          className="ml-auto rounded-xl bg-mg-green px-4 py-2 text-sm font-semibold text-white hover:bg-mg-accent"
        >
          + Afspraak
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayAppts = visible
            .filter((a) => sameAmsterdamDay(a.starts_at, day))
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
          const isToday = sameAmsterdamDay(new Date().toISOString(), day);
          return (
            <div
              key={key}
              className="rounded-2xl bg-white p-2 shadow-sm sm:min-h-[8rem]"
            >
              <div
                className={`mb-2 flex items-center justify-between px-1 ${
                  isToday ? "text-mg-green" : "text-gray-500"
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider">
                  {format(day, "EEE d/M", { locale: nl })}
                </span>
                <button
                  onClick={() => setForm({ mode: "new", date: key })}
                  className="rounded px-1.5 text-sm font-bold text-mg-green hover:bg-mg-green/10"
                  aria-label="Afspraak toevoegen"
                >
                  +
                </button>
              </div>
              <div className="space-y-1.5">
                {dayAppts.map((a) => {
                  const owner = people.find((p) => p.id === a.owner_id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => setForm({ mode: "edit", appt: a })}
                      className={`w-full rounded-lg p-2 text-left text-xs ${
                        a.type === "closing"
                          ? "bg-mg-accent/15 text-mg-dark"
                          : "bg-mg-green/10 text-mg-dark"
                      }`}
                    >
                      <span className="font-semibold">
                        {formatTime(a.starts_at)}
                      </span>{" "}
                      {a.title || (a.type === "closing" ? "Closing" : "Terugbel")}
                      {filterOwner === "all" && owner && (
                        <span className="block text-[10px] text-gray-500">
                          {owner.full_name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {form && (
        <AppointmentForm
          appointment={form.mode === "edit" ? form.appt : null}
          people={people}
          defaultOwnerId={filterOwner !== "all" ? filterOwner : currentUserId}
          currentUserId={currentUserId}
          defaultDate={form.mode === "new" ? form.date : undefined}
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
