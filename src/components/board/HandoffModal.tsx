"use client";

import { useState, useEffect, useMemo } from "react";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { TZDate } from "@date-fns/tz";
import { createClient } from "@/lib/supabase/client";
import type { Lead, Profile, Appointment } from "@/lib/types";
import {
  TZ,
  weekDays,
  sameAmsterdamDay,
  formatTime,
  minutesIntoDay,
  durationMinutes,
  amsterdamLocalToISO,
} from "@/lib/time";

interface Props {
  lead: Lead;
  closers: Profile[];
  currentUserId: string;
  onConfirm: (closerId: string, appt?: { starts_at: string; ends_at: string }) => Promise<void>;
  onClose: () => void;
}

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_H = 40;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const DURATIONS = [15, 30, 45, 60, 90];

export default function HandoffModal({
  lead,
  closers,
  currentUserId,
  onConfirm,
  onClose,
}: Props) {
  const [step, setStep] = useState<"closer" | "agenda">("closer");
  const [chosen, setChosen] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Agenda state
  const [closerAppts, setCloserAppts] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [weekRef, setWeekRef] = useState<Date>(new Date());
  const [apptStart, setApptStart] = useState("");
  const [apptDuration, setApptDuration] = useState(30);

  const active = closers.filter((c) => c.active);
  const chosenProfile = active.find((c) => c.id === chosen);
  const days = weekDays(weekRef);

  const weekLabel = `${format(days[0], "d MMM", { locale: nl })} – ${format(days[6], "d MMM", { locale: nl })}`;

  useEffect(() => {
    if (step !== "agenda" || !chosen) return;
    setLoadingAppts(true);
    const supabase = createClient();
    const from = new TZDate(days[0].getTime(), TZ).toISOString();
    const to = addDays(days[6], 1).toISOString();
    supabase
      .from("appointments")
      .select("*")
      .eq("owner_id", chosen)
      .gte("starts_at", from)
      .lt("starts_at", to)
      .then(({ data }) => {
        setCloserAppts((data as Appointment[]) ?? []);
        setLoadingAppts(false);
      });
  }, [step, chosen, weekRef]);

  function slotClick(day: TZDate, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMin = START_HOUR * 60 + (y / HOUR_H) * 60;
    const snapped = Math.round(totalMin / 15) * 15;
    const hh = String(Math.floor(snapped / 60)).padStart(2, "0");
    const mm = String(snapped % 60).padStart(2, "0");
    setApptStart(`${format(day, "yyyy-MM-dd")}T${hh}:${mm}`);
  }

  const conflicts = useMemo(() => {
    if (!apptStart || !apptStart.includes("T")) return [];
    const startsAt = amsterdamLocalToISO(apptStart);
    const endsAt = new Date(
      new Date(startsAt).getTime() + apptDuration * 60000
    ).toISOString();
    return closerAppts.filter(
      (a) => a.starts_at < endsAt && a.ends_at > startsAt
    );
  }, [apptStart, apptDuration, closerAppts]);

  async function confirm() {
    setBusy(true);
    if (apptStart && apptStart.includes("T")) {
      const startsAt = amsterdamLocalToISO(apptStart);
      const endsAt = new Date(
        new Date(startsAt).getTime() + apptDuration * 60000
      ).toISOString();
      await onConfirm(chosen, { starts_at: startsAt, ends_at: endsAt });
    } else {
      await onConfirm(chosen);
    }
    setBusy(false);
  }

  const gridHeight = (END_HOUR - START_HOUR) * HOUR_H;

  if (step === "closer") {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
        <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
          <h2 className="text-lg font-bold text-mg-dark">Doorzetten naar closer</h2>
          <p className="mt-1 text-sm text-gray-500">
            {lead.full_name || "Deze lead"} gaat naar de closing-funnel. Kies wie
            hem oppakt.
          </p>

          <div className="mt-4 space-y-2">
            {active.length === 0 && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                Er zijn nog geen actieve closers. Vraag de admin om er een in te
                stellen via Beheer.
              </p>
            )}
            {active.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center rounded-xl border-2 p-3 transition-colors ${
                  chosen === c.id
                    ? "border-mg-green bg-mg-green/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="closer"
                    value={c.id}
                    checked={chosen === c.id}
                    onChange={() => setChosen(c.id)}
                    className="h-4 w-4 text-mg-green focus:ring-mg-green"
                  />
                  <span className="font-medium text-gray-800">
                    {c.full_name || c.id}
                  </span>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Annuleren
            </button>
            <button
              disabled={!chosen}
              onClick={() => setStep("agenda")}
              className="flex-1 rounded-xl bg-mg-green py-3 text-sm font-bold text-white hover:bg-mg-accent disabled:opacity-50"
            >
              Volgende: afspraak plannen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: agenda + appointment scheduling
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-3xl">
        <div className="border-b border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-mg-dark">
                Afspraak plannen bij {chosenProfile?.full_name}
              </h2>
              <p className="text-sm text-gray-500">
                Klik op een tijdslot om een closing-afspraak in te plannen voor{" "}
                {lead.full_name || "deze lead"}.
              </p>
            </div>
            <button
              onClick={() => setStep("closer")}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
            >
              ← Terug
            </button>
          </div>
        </div>

        {/* Afspraakformulier */}
        <div className="border-b border-gray-100 px-5 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Datum & tijd
              </label>
              <input
                type="datetime-local"
                value={apptStart}
                onChange={(e) => setApptStart(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Duur
              </label>
              <select
                value={apptDuration}
                onChange={(e) => setApptDuration(Number(e.target.value))}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>
          </div>
          {conflicts.length > 0 && (
            <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              <span className="font-semibold">Let op — overlapt met:</span>{" "}
              {conflicts.map((c) => (
                <span key={c.id} className="mr-2">
                  {formatTime(c.starts_at)}–{formatTime(c.ends_at)}{" "}
                  {c.title || c.type}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Mini-agenda */}
        <div className="flex-1 overflow-hidden px-5 py-3">
          <div className="mb-2 flex items-center gap-2">
            <button
              onClick={() => setWeekRef((d) => addDays(d, -7))}
              className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium hover:bg-gray-200"
            >
              ←
            </button>
            <button
              onClick={() => setWeekRef(new Date())}
              className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium hover:bg-gray-200"
            >
              Vandaag
            </button>
            <button
              onClick={() => setWeekRef((d) => addDays(d, 7))}
              className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium hover:bg-gray-200"
            >
              →
            </button>
            <span className="text-xs font-semibold text-gray-600">{weekLabel}</span>
            {loadingAppts && (
              <span className="text-xs text-gray-400">Laden...</span>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-100">
            {/* Dag-koppen */}
            <div
              className="grid border-b border-gray-100 bg-gray-50"
              style={{ gridTemplateColumns: `2.5rem repeat(${days.length}, 1fr)` }}
            >
              <div />
              {days.map((day) => {
                const today = sameAmsterdamDay(new Date().toISOString(), day);
                return (
                  <div
                    key={day.getTime()}
                    className={`py-1.5 text-center text-[10px] font-bold uppercase ${today ? "text-mg-green" : "text-gray-500"}`}
                  >
                    {format(day, "EEE d/M", { locale: nl })}
                  </div>
                );
              })}
            </div>

            {/* Tijdrooster */}
            <div className="max-h-[35vh] overflow-y-auto">
              <div
                className="grid"
                style={{ gridTemplateColumns: `2.5rem repeat(${days.length}, 1fr)` }}
              >
                {/* Uurlabels */}
                <div className="relative" style={{ height: gridHeight }}>
                  {HOURS.map((h, i) => (
                    <div
                      key={h}
                      className="absolute right-0.5 -translate-y-1/2 text-[9px] text-gray-400"
                      style={{ top: i * HOUR_H }}
                    >
                      {h}:00
                    </div>
                  ))}
                </div>

                {/* Dagkolommen */}
                {days.map((day) => {
                  const today = sameAmsterdamDay(new Date().toISOString(), day);
                  const dayAppts = closerAppts.filter((a) =>
                    sameAmsterdamDay(a.starts_at, day)
                  );
                  return (
                    <div
                      key={day.getTime()}
                      onClick={(e) => slotClick(day, e)}
                      className="relative cursor-pointer border-l border-gray-100"
                      style={{ height: gridHeight }}
                    >
                      {HOURS.map((h, i) => (
                        <div
                          key={h}
                          className="absolute inset-x-0 border-t border-gray-100"
                          style={{ top: i * HOUR_H }}
                        />
                      ))}

                      {today && (() => {
                        const nowMin = minutesIntoDay(new Date().toISOString());
                        if (nowMin >= START_HOUR * 60 && nowMin <= END_HOUR * 60) {
                          return (
                            <div
                              className="absolute inset-x-0 z-10 border-t-2 border-red-500"
                              style={{ top: ((nowMin - START_HOUR * 60) / 60) * HOUR_H }}
                            />
                          );
                        }
                        return null;
                      })()}

                      {dayAppts.map((a) => {
                        const startMin = minutesIntoDay(a.starts_at);
                        const dur = Math.max(15, durationMinutes(a.starts_at, a.ends_at));
                        const top = ((startMin - START_HOUR * 60) / 60) * HOUR_H;
                        const height = (dur / 60) * HOUR_H;
                        return (
                          <div
                            key={a.id}
                            className={`absolute inset-x-0.5 z-20 overflow-hidden rounded px-1 py-0.5 text-[9px] leading-tight ${
                              a.type === "closing"
                                ? "bg-mg-accent text-white"
                                : "bg-mg-green text-white"
                            }`}
                            style={{ top, height: Math.max(height, 12) }}
                          >
                            <span className="font-semibold">{formatTime(a.starts_at)}</span>{" "}
                            {a.title || a.type}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="mt-1 text-[10px] text-gray-400">
            Klik op een tijdslot of vul hierboven handmatig een datum/tijd in.
          </p>
        </div>

        {/* Acties */}
        <div className="border-t border-gray-100 p-5">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Annuleren
            </button>
            <button
              disabled={busy}
              onClick={confirm}
              className="flex-1 rounded-xl bg-mg-green py-3 text-sm font-bold text-white hover:bg-mg-accent disabled:opacity-50"
            >
              {busy
                ? "Bezig..."
                : apptStart
                  ? "Doorzetten + afspraak plannen"
                  : "Doorzetten zonder afspraak"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
