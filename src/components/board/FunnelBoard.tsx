"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, Profile, Appointment, Priority, Role } from "@/lib/types";
import { PRIORITY_RANK, PRIORITIES, PRIORITY_LABELS } from "@/lib/types";
import {
  stagesFor,
  CLOSING_STAGES,
  isDealStage,
  isClosingAfgevallen,
  AGENT_AFGEVALLEN_STAGE,
  AGENT_TERUGGENOMEN_STAGE,
  CLOSER_VOICEMAIL_LIMIT,
} from "@/lib/funnels";
import { fireConfetti } from "@/lib/confetti";
import LeadCard from "./LeadCard";
import LeadDrawer from "./LeadDrawer";
import HandoffModal from "./HandoffModal";
import NewLeadForm from "./NewLeadForm";

type SortKey = "handmatig" | "prioriteit" | "nieuw" | "oud" | "afspraak";

interface Props {
  initialLeads: Lead[];
  appts: Appointment[];
  setAppts: React.Dispatch<React.SetStateAction<Appointment[]>>;
  funnel: "agent" | "closing";
  closers: Profile[];
  profilesById: Record<string, Profile>;
  currentUserId: string;
  currentUserRole: Role;
  onHandoffDone?: (leadId: string, closerId: string) => void;
}

export default function FunnelBoard({
  initialLeads,
  appts,
  setAppts,
  funnel,
  closers,
  profilesById,
  currentUserId,
  currentUserRole,
  onHandoffDone,
}: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [handoffLead, setHandoffLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState<Priority | "all">("all");
  const [sort, setSort] = useState<SortKey>("handmatig");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);

  // Auto-scroll van het horizontale bord terwijl je een kaart naar de rand sleept.
  const boardRef = useRef<HTMLDivElement>(null);
  const scrollDir = useRef(0);
  const rafRef = useRef<number | null>(null);

  function stopAutoScroll() {
    scrollDir.current = 0;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function autoScrollTick() {
    const el = boardRef.current;
    if (el && scrollDir.current !== 0) {
      el.scrollLeft += scrollDir.current * 16;
      rafRef.current = requestAnimationFrame(autoScrollTick);
    } else {
      rafRef.current = null;
    }
  }

  function onBoardDragOver(e: React.DragEvent<HTMLDivElement>) {
    const el = boardRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const rect = el.getBoundingClientRect();
    const EDGE = 90;
    let dir = 0;
    if (e.clientX < rect.left + EDGE) dir = -1;
    else if (e.clientX > rect.right - EDGE) dir = 1;
    scrollDir.current = dir;
    if (dir !== 0 && rafRef.current == null) {
      rafRef.current = requestAnimationFrame(autoScrollTick);
    }
  }

  useEffect(() => stopAutoScroll, []);

  const stages = stagesFor(funnel);
  const selected = leads.find((l) => l.id === selectedId) ?? null;
  const nowISO = new Date().toISOString();

  // Agent op closing-bord = read-only (behalve eigen kaarten terugpakken)
  const isReadOnly = funnel === "closing" && currentUserRole === "agent";

  function canEditLead(lead: Lead): boolean {
    if (!isReadOnly) return true;
    return lead.agent_id === currentUserId;
  }

  // Eerstvolgende toekomstige afspraak — gebruikt voor doorzetten (pre-fill) en
  // de sorteeroptie "eerstvolgende afspraak".
  const nextApptByLead = useMemo(() => {
    const m: Record<string, Appointment> = {};
    for (const a of appts) {
      if (!a.lead_id || a.starts_at < nowISO) continue;
      const cur = m[a.lead_id];
      if (!cur || a.starts_at < cur.starts_at) m[a.lead_id] = a;
    }
    return m;
  }, [appts, nowISO]);

  // Afspraak die op de kaart getoond wordt: bij voorkeur de eerstvolgende, maar
  // als die er niet (meer) is, de laatst geweeste — zodat een afspraak op de
  // kaart blijft staan, ook als het moment nu is of net voorbij.
  const displayApptByLead = useMemo(() => {
    const upcoming: Record<string, Appointment> = {};
    const past: Record<string, Appointment> = {};
    for (const a of appts) {
      if (!a.lead_id) continue;
      if (a.starts_at >= nowISO) {
        const c = upcoming[a.lead_id];
        if (!c || a.starts_at < c.starts_at) upcoming[a.lead_id] = a;
      } else {
        const c = past[a.lead_id];
        if (!c || a.starts_at > c.starts_at) past[a.lead_id] = a;
      }
    }
    const m: Record<string, Appointment> = {};
    for (const id of new Set([...Object.keys(upcoming), ...Object.keys(past)])) {
      m[id] = upcoming[id] ?? past[id];
    }
    return m;
  }, [appts, nowISO]);

  const apptsByLead = useMemo(() => {
    const m: Record<string, Appointment[]> = {};
    for (const a of appts) {
      if (!a.lead_id) continue;
      (m[a.lead_id] ??= []).push(a);
    }
    return m;
  }, [appts]);

  function matchSearch(l: Lead): boolean {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [
      l.full_name,
      l.phone,
      l.address,
      l.email,
      l.extra["contactpersoon"],
      l.extra["stad"],
    ]
      .filter(Boolean)
      .some((v) => v!.toLowerCase().includes(q));
  }

  function compare(a: Lead, b: Lead): number {
    switch (sort) {
      case "nieuw":
        return b.created_at.localeCompare(a.created_at);
      case "oud":
        return a.created_at.localeCompare(b.created_at);
      case "afspraak": {
        const aa = nextApptByLead[a.id]?.starts_at ?? "9999";
        const bb = nextApptByLead[b.id]?.starts_at ?? "9999";
        return aa.localeCompare(bb);
      }
      case "prioriteit":
        return (
          PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
          b.updated_at.localeCompare(a.updated_at)
        );
      case "handmatig":
      default:
        return a.position - b.position || a.created_at.localeCompare(b.created_at);
    }
  }

  const visibleByStage = (stage: string) =>
    leads
      .filter(
        (l) =>
          l.stage === stage &&
          matchSearch(l) &&
          (labelFilter === "all" || l.priority === labelFilter)
      )
      .sort(compare);

  async function patchLead(id: string, changes: Partial<Lead>) {
    const lead = leads.find((l) => l.id === id);
    if (lead && !canEditLead(lead)) return;
    const prev = leads;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...changes } : l)));
    const supabase = createClient();
    const { error: err } = await supabase.from("leads").update(changes).eq("id", id);
    if (err) {
      setError(err.message);
      setLeads(prev);
    } else if (changes.stage && isDealStage(changes.stage)) {
      fireConfetti();
    }
  }

  // Kaart terug naar de oorspronkelijke sales agent (agent_id). Notities blijven
  // aan de lead gekoppeld en verhuizen dus mee; afspraken gaan via RPC mee.
  async function returnToAgent(lead: Lead, targetStage: string) {
    const agentId = lead.agent_id;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("leads")
      .update({
        funnel: "agent",
        stage: targetStage,
        closer_voicemail_count: 0,
      })
      .eq("id", lead.id);
    if (err) return setError(err.message);

    if (agentId) {
      await supabase.rpc("move_lead_appointments", {
        p_lead_id: lead.id,
        p_new_owner: agentId,
      });
      setAppts((prev) =>
        prev.map((a) =>
          a.lead_id === lead.id ? { ...a, owner_id: agentId } : a
        )
      );
    }
    setLeads((ls) => ls.filter((l) => l.id !== lead.id));
    setHandoffLead(null);
    setSelectedId(null);
  }

  async function reorder(draggedId: string, targetStage: string, beforeId: string | null) {
    if (isReadOnly) return;
    const dragged = leads.find((l) => l.id === draggedId);
    if (!dragged) return;
    if (draggedId === beforeId) return;

    // Slepen naar "Afgevallen" in de closing-funnel → terug naar de agent.
    if (funnel === "closing" && isClosingAfgevallen(targetStage)) {
      await returnToAgent(dragged, AGENT_AFGEVALLEN_STAGE);
      return;
    }

    const targetList = leads
      .filter((l) => l.stage === targetStage && l.id !== draggedId)
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));

    let idx = beforeId ? targetList.findIndex((l) => l.id === beforeId) : targetList.length;
    if (idx < 0) idx = targetList.length;
    targetList.splice(idx, 0, { ...dragged, stage: targetStage });

    const posById = new Map<string, number>();
    targetList.forEach((l, i) => posById.set(l.id, i));

    const prev = leads;
    setLeads((ls) =>
      ls.map((l) => {
        if (l.id === draggedId)
          return { ...l, stage: targetStage, position: posById.get(l.id)! };
        if (posById.has(l.id)) return { ...l, position: posById.get(l.id)! };
        return l;
      })
    );

    const supabase = createClient();

    // 1) De stage van de gesleepte kaart is het belangrijkst: die moet blijven
    //    staan waar hij naartoe is gesleept. Aparte, gegarandeerde update.
    const draggedPos = posById.get(draggedId)!;
    let { error: err } = await supabase
      .from("leads")
      .update({ stage: targetStage, position: draggedPos })
      .eq("id", draggedId);
    if (err) {
      // Val terug op enkel de stage (bv. als 'position' live nog ontbreekt).
      ({ error: err } = await supabase
        .from("leads")
        .update({ stage: targetStage })
        .eq("id", draggedId));
    }
    if (err) {
      setError(err.message);
      setLeads(prev);
      return;
    }

    // 2) Volgorde van de overige kaarten — best effort, faalt stil.
    await Promise.all(
      targetList
        .filter((l) => l.id !== draggedId)
        .map((l) =>
          supabase
            .from("leads")
            .update({ position: posById.get(l.id)! })
            .eq("id", l.id)
        )
    );
  }

  async function saveAppt(leadId: string, startsISO: string, endsISO: string, id?: string) {
    const supabase = createClient();
    if (id) {
      const { data, error: err } = await supabase
        .from("appointments")
        .update({ starts_at: startsISO, ends_at: endsISO })
        .eq("id", id)
        .select()
        .single();
      if (err) return setError(err.message);
      setAppts((prev) => prev.map((a) => (a.id === id ? (data as Appointment) : a)));
    } else {
      const lead = leads.find((l) => l.id === leadId);
      const { data, error: err } = await supabase
        .from("appointments")
        .insert({
          lead_id: leadId,
          owner_id: currentUserId,
          created_by: currentUserId,
          type: "terugbel",
          title: lead?.full_name ?? null,
          starts_at: startsISO,
          ends_at: endsISO,
        })
        .select()
        .single();
      if (err) return setError(err.message);
      setAppts((prev) => [...prev, data as Appointment]);
    }
  }

  async function deleteAppt(id: string) {
    const supabase = createClient();
    const { error: err } = await supabase.from("appointments").delete().eq("id", id);
    if (err) return setError(err.message);
    setAppts((prev) => prev.filter((a) => a.id !== id));
  }

  async function handoff(closerId: string, appt?: { starts_at: string; ends_at: string }) {
    if (!handoffLead) return;
    const id = handoffLead.id;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("leads")
      .update({ closer_id: closerId, funnel: "closing", stage: CLOSING_STAGES[0] })
      .eq("id", id);
    if (err) return setError(err.message);

    if (appt) {
      const { data, error: apptErr } = await supabase
        .from("appointments")
        .insert({
          lead_id: id,
          owner_id: closerId,
          created_by: currentUserId,
          type: "closing",
          title: handoffLead.full_name ?? null,
          starts_at: appt.starts_at,
          ends_at: appt.ends_at,
        })
        .select()
        .single();
      if (apptErr) setError(apptErr.message);
      else setAppts((prev) => [...prev, data as Appointment]);
    }

    const futureApptIds = appts
      .filter((a) => a.lead_id === id && a.starts_at >= nowISO && a.owner_id !== closerId)
      .map((a) => a.id);
    if (futureApptIds.length > 0) {
      await supabase
        .from("appointments")
        .update({ owner_id: closerId })
        .in("id", futureApptIds);
    }
    setAppts((prev) =>
      prev.map((a) =>
        a.lead_id === id && a.starts_at >= nowISO
          ? { ...a, owner_id: closerId }
          : a
      )
    );
    setLeads((ls) => ls.filter((l) => l.id !== id));
    setHandoffLead(null);
    setSelectedId(null);
    onHandoffDone?.(id, closerId);
    fireConfetti();
  }

  // Agent pakt zijn eigen kaart terug van een closer. Afspraken verhuizen mee
  // naar de agent, zodat ze niet in de agenda van de closer blijven hangen.
  async function takeBack(leadId: string) {
    const supabase = createClient();
    const { error: err } = await supabase
      .from("leads")
      .update({
        funnel: "agent",
        stage: AGENT_TERUGGENOMEN_STAGE,
        closer_voicemail_count: 0,
      })
      .eq("id", leadId);
    if (err) return setError(err.message);
    await supabase.rpc("move_lead_appointments", {
      p_lead_id: leadId,
      p_new_owner: currentUserId,
    });
    setAppts((prev) =>
      prev.map((a) =>
        a.lead_id === leadId ? { ...a, owner_id: currentUserId } : a
      )
    );
    setLeads((ls) => ls.filter((l) => l.id !== leadId));
    setSelectedId(null);
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {isReadOnly && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          Je bekijkt het closing-bord als kijker. Je kunt alleen je eigen kaarten terugpakken.
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op naam, contact, telefoon, stad..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
          />
        </div>
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <button
              onClick={() => setShowNewLead(true)}
              className="rounded-xl bg-mg-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-mg-accent"
            >
              + Nieuwe lead
            </button>
          )}
          <label className="text-sm text-gray-500">Label:</label>
          <select
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value as Priority | "all")}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
          >
            <option value="all">Alle labels</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <label className="text-sm text-gray-500">Sorteer:</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
          >
            <option value="handmatig">Handmatig (sleepvolgorde)</option>
            <option value="prioriteit">Label (Closing afspraak eerst)</option>
            <option value="afspraak">Eerstvolgende afspraak</option>
            <option value="nieuw">Nieuwste eerst</option>
            <option value="oud">Oudste eerst</option>
          </select>
        </div>
      </div>

      {leads.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm">
          Nog geen leads in deze funnel.
        </p>
      ) : (
        <div
          ref={boardRef}
          onDragOver={onBoardDragOver}
          onDrop={() => {
            // Loslaten in de ruimte tussen kolommen: geen verplaatsing, maar
            // wél alles netjes resetten (voorkomt vastlopen).
            setDragId(null);
            setOverStage(null);
            stopAutoScroll();
          }}
          onDragEnd={() => {
            setDragId(null);
            setOverStage(null);
            stopAutoScroll();
          }}
          className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-4 lg:overflow-x-auto lg:pb-4"
        >
          {stages.map((stage) => {
            const items = visibleByStage(stage);
            const isOver = overStage === stage;
            return (
              <section
                key={stage}
                onDragOver={(e) => {
                  if (!isReadOnly) {
                    e.preventDefault();
                    setOverStage(stage);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node))
                    setOverStage((s) => (s === stage ? null : s));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!isReadOnly && dragId) reorder(dragId, stage, null);
                  setDragId(null);
                  setOverStage(null);
                  stopAutoScroll();
                }}
                className={`flex flex-col rounded-2xl p-2 transition-colors lg:w-72 lg:shrink-0 ${
                  isOver && !isReadOnly ? "bg-mg-green/10 ring-2 ring-mg-green/40" : "bg-black/[0.02]"
                }`}
              >
                <div className="mb-2 flex items-center justify-between px-1 pt-1">
                  <h2 className="text-sm font-bold text-mg-dark">{stage}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-500 shadow-sm">
                    {items.length}
                  </span>
                </div>
                <div className="min-h-[4rem] flex-1 space-y-2">
                  {items.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-gray-400">
                      {isReadOnly ? "Geen kaarten" : "Sleep hierheen"}
                    </p>
                  ) : (
                    items.map((lead) => {
                      const editable = canEditLead(lead);
                      return (
                        <div
                          key={lead.id}
                          onDragOver={(e) => { if (!isReadOnly) e.preventDefault(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isReadOnly && dragId) reorder(dragId, lead.stage, lead.id);
                            setDragId(null);
                            setOverStage(null);
                            stopAutoScroll();
                          }}
                        >
                          <LeadCard
                            lead={lead}
                            nextAppt={displayApptByLead[lead.id] ?? null}
                            ownerName={
                              lead.agent_id
                                ? profilesById[lead.agent_id]?.full_name
                                : null
                            }
                            dealLocked={funnel === "closing" && isDealStage(lead.stage)}
                            dragging={dragId === lead.id}
                            draggable={!isReadOnly || editable}
                            onDragStart={() => { if (!isReadOnly) setDragId(lead.id); }}
                            onDragEnd={() => {
                              setDragId(null);
                              setOverStage(null);
                              stopAutoScroll();
                            }}
                            onOpen={() => setSelectedId(lead.id)}
                            highlight={isReadOnly && editable}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {selected && (
        <LeadDrawer
          lead={selected}
          stages={stages}
          funnel={funnel}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          profilesById={profilesById}
          leadAppts={apptsByLead[selected.id] ?? []}
          readOnly={isReadOnly && !canEditLead(selected)}
          dealLocked={funnel === "closing" && isDealStage(selected.stage)}
          onMove={(stage) => {
            if (funnel === "closing" && isClosingAfgevallen(stage)) {
              returnToAgent(selected, AGENT_AFGEVALLEN_STAGE);
            } else {
              patchLead(selected.id, { stage });
            }
          }}
          onPriority={(p: Priority) => patchLead(selected.id, { priority: p })}
          onVoicemail={(value) => {
            if (funnel === "closing") {
              if (value >= CLOSER_VOICEMAIL_LIMIT) {
                returnToAgent(selected, AGENT_TERUGGENOMEN_STAGE);
              } else {
                patchLead(selected.id, { closer_voicemail_count: value });
              }
            } else {
              patchLead(selected.id, { voicemail_count: value });
            }
          }}
          onSaveAppt={(s, e, id) => saveAppt(selected.id, s, e, id)}
          onDeleteAppt={deleteAppt}
          onHandoff={() => setHandoffLead(selected)}
          onTakeBack={() => takeBack(selected.id)}
          onSendBack={() => returnToAgent(selected, AGENT_TERUGGENOMEN_STAGE)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {showNewLead && (
        <NewLeadForm
          funnel={funnel}
          currentUserId={currentUserId}
          onCreated={(lead) => {
            setLeads((prev) => [lead, ...prev]);
            setShowNewLead(false);
          }}
          onClose={() => setShowNewLead(false)}
        />
      )}

      {handoffLead && (
        <HandoffModal
          lead={handoffLead}
          closers={closers}
          currentUserId={currentUserId}
          existingAppt={nextApptByLead[handoffLead.id] ?? null}
          onConfirm={handoff}
          onClose={() => setHandoffLead(null)}
        />
      )}
    </div>
  );
}
