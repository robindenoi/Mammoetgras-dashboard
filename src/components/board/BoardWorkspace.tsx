"use client";

import { useState, useMemo } from "react";
import type { Lead, Profile, Appointment } from "@/lib/types";
import FunnelBoard from "./FunnelBoard";
import AgendaView from "@/components/calendar/AgendaView";

interface Props {
  initialLeads: Lead[];
  initialAppointments: Appointment[];
  funnel: "agent" | "closing";
  closers: Profile[];
  profilesById: Record<string, Profile>;
  people: Profile[]; // voor de agenda (eigenaren)
  currentUserId: string;
  // Persoonsfilter (bij closing: kies wiens bord/agenda)
  personFilter?: Profile[];
}

type View = "bord" | "agenda";

export default function BoardWorkspace({
  initialLeads,
  initialAppointments,
  funnel,
  closers,
  profilesById,
  people,
  currentUserId,
  personFilter,
}: Props) {
  const [view, setView] = useState<View>("bord");
  const [person, setPerson] = useState<string>("all");
  const [appts, setAppts] = useState<Appointment[]>(initialAppointments);

  const showPersonFilter = !!personFilter && personFilter.length > 0;

  // Leads gefilterd op gekozen persoon (closer). Bij "all" alles.
  const filteredLeads = useMemo(() => {
    if (!showPersonFilter || person === "all") return initialLeads;
    return initialLeads.filter((l) => l.closer_id === person);
  }, [initialLeads, person, showPersonFilter]);

  // Agenda-eigenaar: bij persoonsfilter de gekozen persoon; anders eigen agenda.
  const agendaOwner = showPersonFilter ? person : currentUserId;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl bg-white p-1 shadow-sm">
          <button
            onClick={() => setView("bord")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              view === "bord" ? "bg-mg-green text-white" : "text-gray-600"
            }`}
          >
            Bord
          </button>
          <button
            onClick={() => setView("agenda")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              view === "agenda" ? "bg-mg-green text-white" : "text-gray-600"
            }`}
          >
            Agenda
          </button>
        </div>

        {showPersonFilter && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Wie:</label>
            <select
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
            >
              <option value="all">Iedereen</option>
              {personFilter!.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {view === "bord" ? (
        <FunnelBoard
          key={person}
          initialLeads={filteredLeads}
          appts={appts}
          setAppts={setAppts}
          funnel={funnel}
          closers={closers}
          profilesById={profilesById}
          currentUserId={currentUserId}
        />
      ) : (
        <AgendaView
          appointments={appts}
          setAppointments={setAppts}
          people={people}
          currentUserId={currentUserId}
          filterOwner={agendaOwner}
        />
      )}
    </div>
  );
}
