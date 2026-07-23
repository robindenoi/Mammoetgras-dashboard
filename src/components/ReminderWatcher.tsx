"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { Appointment } from "@/lib/types";
import { formatDateTime } from "@/lib/time";

type ApptWithLead = Appointment & {
  lead?: { full_name: string | null; phone: string | null } | null;
};

const DISMISS_KEY = "mg-reminders-dismissed";
const REMIND_BEFORE_KEY = "mg-remind-before-min";
const SNOOZE_OPTIONS = [5, 10, 15, 30];

function loadDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]");
  } catch {
    return [];
  }
}

function loadRemindBefore(): number {
  try {
    const v = localStorage.getItem(REMIND_BEFORE_KEY);
    return v ? Number(v) : 15;
  } catch {
    return 15;
  }
}

export default function ReminderWatcher() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<ApptWithLead[]>([]);
  const [dueId, setDueId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [remindBefore, setRemindBefore] = useState(loadRemindBefore);
  const dismissed = useRef<Set<string>>(new Set());
  const snoozed = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    dismissed.current = new Set(loadDismissed());
  }, []);

  function updateRemindBefore(min: number) {
    setRemindBefore(min);
    localStorage.setItem(REMIND_BEFORE_KEY, String(min));
  }

  const fetchAppts = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const until = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from("appointments")
      .select("*, lead:leads(full_name, phone)")
      .eq("owner_id", user.id)
      .gte("starts_at", since)
      .lte("starts_at", until)
      .order("starts_at", { ascending: true });
    setAppts((data as ApptWithLead[]) ?? []);
  }, [user]);

  useEffect(() => {
    fetchAppts();
    const i = setInterval(fetchAppts, 5 * 60 * 1000);
    return () => clearInterval(i);
  }, [fetchAppts]);

  useEffect(() => {
    if (!user) return;
    function check() {
      const now = Date.now();
      const threshold = remindBefore * 60 * 1000;
      for (const a of appts) {
        if (dismissed.current.has(a.id)) continue;
        const snoozeUntil = snoozed.current.get(a.id);
        if (snoozeUntil && now < snoozeUntil) continue;
        if (new Date(a.starts_at).getTime() - threshold <= now) {
          setDueId(a.id);
          return;
        }
      }
    }
    check();
    const i = setInterval(check, 30 * 1000);
    return () => clearInterval(i);
  }, [appts, user, remindBefore]);

  if (!user) return null;

  // Settings gear (always visible when logged in)
  if (!dueId) {
    return (
      <>
        {showSettings && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl">
              <h3 className="mb-3 text-sm font-bold text-mg-dark">
                Herinneringsinstellingen
              </h3>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Herinner me zo lang van tevoren:
              </label>
              <select
                value={remindBefore}
                onChange={(e) => updateRemindBefore(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
              >
                <option value={0}>Op het moment zelf</option>
                <option value={5}>5 minuten</option>
                <option value={10}>10 minuten</option>
                <option value={15}>15 minuten</option>
                <option value={30}>30 minuten</option>
                <option value={60}>1 uur</option>
                <option value={120}>2 uur</option>
                <option value={1440}>1 dag</option>
              </select>
              <button
                onClick={() => setShowSettings(false)}
                className="mt-4 w-full rounded-xl bg-mg-green py-2.5 text-sm font-bold text-white hover:bg-mg-accent"
              >
                Opslaan
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowSettings(true)}
          className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-50"
          title="Herinneringsinstellingen"
        >
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1" />
          </svg>
        </button>
      </>
    );
  }

  const appt = appts.find((a) => a.id === dueId);
  if (!appt) return null;

  const name = appt.lead?.full_name || appt.title || "Lead";
  const phone = appt.lead?.phone;
  const startsIn = Math.round(
    (new Date(appt.starts_at).getTime() - Date.now()) / 60000
  );
  const timeLabel =
    startsIn > 0 ? `Over ${startsIn} min` : "Nu";

  function dismiss() {
    dismissed.current.add(dueId!);
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...dismissed.current]));
    setDueId(null);
  }
  function snooze(min: number) {
    snoozed.current.set(dueId!, Date.now() + min * 60 * 1000);
    setDueId(null);
  }

  return (
    <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-mg-green/30 bg-white p-5 shadow-xl">
        <div className="mb-1 flex items-center gap-2 text-sm font-bold text-mg-green">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1" />
          </svg>
          {appt.type === "closing" ? "Closing-afspraak" : "Tijd om te bellen"}
        </div>
        <p className="text-lg font-bold text-mg-dark">{name}</p>
        <p className="text-sm text-gray-500">
          {formatDateTime(appt.starts_at)} — <span className="font-semibold text-mg-green">{timeLabel}</span>
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex-1 rounded-xl bg-mg-green py-2.5 text-center text-sm font-bold text-white hover:bg-mg-accent"
            >
              Bel {phone}
            </a>
          )}
          <div className="flex gap-1">
            {SNOOZE_OPTIONS.map((min) => (
              <button
                key={min}
                onClick={() => snooze(min)}
                className="rounded-xl bg-gray-100 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
              >
                {min}m
              </button>
            ))}
          </div>
          <button
            onClick={dismiss}
            className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            Gezien
          </button>
        </div>
      </div>
    </div>
  );
}
