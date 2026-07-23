"use client";

import { useState, useMemo, useCallback } from "react";
import type { Lead, Profile, Appointment, Role } from "@/lib/types";
import FunnelBoard from "./FunnelBoard";
import AgendaView from "@/components/calendar/AgendaView";

interface Props {
  initialLeads: Lead[];
  initialAppointments: Appointment[];
  funnel: "agent" | "closing";
  closers: Profile[];
  profilesById: Record<string, Profile>;
  people: Profile[];
  currentUserId: string;
  currentUserRole: Role;
  personFilter?: Profile[];
  handedOffLeadCloser?: Record<string, string>;
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
  currentUserRole,
  personFilter,
  handedOffLeadCloser: initialHandedOff,
}: Props) {
  const [view, setView] = useState<View>("bord");
  const [boardPerson, setBoardPerson] = useState<string>("all");
  const [agendaPerson, setAgendaPerson] = useState<string>("all");
  const [appts, setAppts] = useState<Appointment[]>(initialAppointments);
  const [handedOffMap, setHandedOffMap] = useState<Record<string, string>>(
    initialHandedOff ?? {}
  );

  const showPersonFilter = !!personFilter && personFilter.length > 0;

  const filteredLeads = useMemo(() => {
    if (!showPersonFilter || boardPerson === "all") return initialLeads;
    const key = funnel === "agent" ? "agent_id" : "closer_id";
    return initialLeads.filter((l) => l[key] === boardPerson);
  }, [initialLeads, boardPerson, showPersonFilter, funnel]);

  const agendaOwner = showPersonFilter ? agendaPerson : currentUserId;

  const leadsById = useMemo(() => {
    const map: Record<string, Lead> = {};
    for (const l of initialLeads) map[l.id] = l;
    return map;
  }, [initialLeads]);

  const onHandoff = useCallback((leadId: string, closerId: string) => {
    setHandedOffMap((prev) => ({ ...prev, [leadId]: closerId }));
  }, []);

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
            <label className="text-sm text-gray-500">
              {view === "bord" ? "Wiens bord:" : "Wiens agenda:"}
            </label>
            {view === "bord" ? (
              <select
                value={boardPerson}
                onChange={(e) => setBoardPerson(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
              >
                <option value="all">
                  {funnel === "agent" ? "Alle agents" : "Alle closers"}
                </option>
                {personFilter!.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.id}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={agendaPerson}
                onChange={(e) => setAgendaPerson(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
              >
                <option value="all">Iedereen</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.id}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {view === "bord" ? (
        <FunnelBoard
          key={boardPerson}
          initialLeads={filteredLeads}
          appts={appts}
          setAppts={setAppts}
          funnel={funnel}
          closers={closers}
          profilesById={profilesById}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onHandoffDone={onHandoff}
        />
      ) : (
        <AgendaView
          appointments={appts}
          setAppointments={setAppts}
          people={people}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          filterOwner={agendaOwner}
          leadsById={leadsById}
          handedOffLeadCloser={handedOffMap}
          profilesById={profilesById}
        />
      )}
    </div>
  );
}
