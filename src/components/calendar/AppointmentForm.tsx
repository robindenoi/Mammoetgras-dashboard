"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Appointment, Profile, AppointmentType, Role } from "@/lib/types";
import { amsterdamLocalToISO, isoToAmsterdamLocal, formatTime } from "@/lib/time";

interface Props {
  appointment?: Appointment | null;
  people: Profile[];
  defaultOwnerId: string;
  currentUserId: string;
  currentUserRole: Role | null;
  defaultDate?: string;
  defaultStart?: string;
  onSaved: (appt: Appointment) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}

const DURATIONS = [15, 30, 45, 60, 90];

function initialDuration(a?: Appointment | null): number {
  if (!a) return 30;
  const mins = Math.round(
    (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000
  );
  return DURATIONS.includes(mins) ? mins : 30;
}

export default function AppointmentForm({
  appointment,
  people,
  defaultOwnerId,
  currentUserId,
  currentUserRole,
  defaultDate,
  defaultStart,
  onSaved,
  onDeleted,
  onClose,
}: Props) {
  const [ownerId, setOwnerId] = useState(appointment?.owner_id ?? defaultOwnerId);
  const [type, setType] = useState<AppointmentType>(
    appointment?.type ?? "terugbel"
  );
  const [title, setTitle] = useState(appointment?.title ?? "");
  const [note, setNote] = useState(appointment?.note ?? "");
  const [start, setStart] = useState(
    appointment
      ? isoToAmsterdamLocal(appointment.starts_at)
      : (defaultStart ?? `${defaultDate ?? ""}T10:00`)
  );
  const [duration, setDuration] = useState(initialDuration(appointment));

  const [conflicts, setConflicts] = useState<Appointment[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canTakeOver =
    appointment &&
    appointment.owner_id !== currentUserId &&
    (currentUserRole === "closer" || currentUserRole === "admin");

  async function takeOver() {
    if (!appointment) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("appointments")
      .update({ owner_id: currentUserId })
      .eq("id", appointment.id)
      .select()
      .single();
    if (err) setError(err.message);
    else onSaved(data as Appointment);
    setBusy(false);
  }

  async function save(force: boolean) {
    setError(null);
    if (!start.includes("T") || start.startsWith("T")) {
      setError("Kies een datum en tijd.");
      return;
    }
    setBusy(true);

    const startsAt = amsterdamLocalToISO(start);
    const endsAt = new Date(
      new Date(startsAt).getTime() + duration * 60000
    ).toISOString();

    const supabase = createClient();

    if (!force) {
      let q = supabase
        .from("appointments")
        .select("*")
        .eq("owner_id", ownerId)
        .lt("starts_at", endsAt)
        .gt("ends_at", startsAt);
      if (appointment) q = q.neq("id", appointment.id);
      const { data: overlapping } = await q;
      if (overlapping && overlapping.length > 0) {
        setConflicts(overlapping as Appointment[]);
        setBusy(false);
        return;
      }
    }

    const payload = {
      owner_id: ownerId,
      type,
      title: title.trim() || null,
      note: note.trim() || null,
      starts_at: startsAt,
      ends_at: endsAt,
    };

    if (appointment) {
      const { data, error: err } = await supabase
        .from("appointments")
        .update(payload)
        .eq("id", appointment.id)
        .select()
        .single();
      if (err) setError(err.message);
      else onSaved(data as Appointment);
    } else {
      const { data, error: err } = await supabase
        .from("appointments")
        .insert({ ...payload, created_by: currentUserId })
        .select()
        .single();
      if (err) setError(err.message);
      else onSaved(data as Appointment);
    }
    setBusy(false);
  }

  async function remove() {
    if (!appointment) return;
    if (!confirm("Afspraak verwijderen?")) return;
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("appointments")
      .delete()
      .eq("id", appointment.id);
    if (err) setError(err.message);
    else onDeleted(appointment.id);
    setBusy(false);
  }

  const field =
    "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
        <h2 className="mb-1 text-lg font-bold text-mg-dark">
          {appointment ? "Afspraak bewerken" : "Nieuwe afspraak"}
        </h2>
        {appointment?.created_by &&
          appointment.created_by !== appointment.owner_id && (
            <p className="mb-3 text-xs text-gray-400">
              Oorspronkelijk ingepland door{" "}
              {people.find((p) => p.id === appointment.created_by)?.full_name ||
                "een agent"}
            </p>
          )}

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {conflicts && (
          <div className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-semibold">Let op: dubbele boeking</p>
            <ul className="mt-1 list-inside list-disc">
              {conflicts.map((c) => (
                <li key={c.id}>
                  {formatTime(c.starts_at)}–{formatTime(c.ends_at)}{" "}
                  {c.title || c.type}
                </li>
              ))}
            </ul>
          </div>
        )}

        {canTakeOver && (
          <button
            onClick={takeOver}
            disabled={busy}
            className="mb-4 w-full rounded-xl bg-mg-dark py-3 text-sm font-bold text-white hover:bg-mg-green disabled:opacity-50"
          >
            {busy ? "Bezig..." : "Afspraak overnemen"}
          </button>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Persoon
            </label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className={field}
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.id}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AppointmentType)}
                className={field}
              >
                <option value="terugbel">Terugbelafspraak</option>
                <option value="closing">Closing-afspraak</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Duur
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className={field}
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Datum & tijd
            </label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                setConflicts(null);
              }}
              className={field}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Titel / notitie
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="bijv. naam van de klant"
              className={field}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            Annuleren
          </button>
          {appointment && (
            <button
              onClick={remove}
              disabled={busy}
              className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              Verwijderen
            </button>
          )}
          <button
            onClick={() => save(conflicts !== null)}
            disabled={busy}
            className="flex-1 rounded-xl bg-mg-green py-3 text-sm font-bold text-white hover:bg-mg-accent disabled:opacity-50"
          >
            {busy
              ? "Bezig..."
              : conflicts !== null
                ? "Toch opslaan"
                : "Opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}
