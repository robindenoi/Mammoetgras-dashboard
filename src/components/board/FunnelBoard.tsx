"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, Profile } from "@/lib/types";
import { stagesFor, CLOSING_STAGES } from "@/lib/funnels";
import LeadCard from "./LeadCard";
import LeadDrawer from "./LeadDrawer";
import HandoffModal from "./HandoffModal";

interface Props {
  initialLeads: Lead[];
  funnel: "agent" | "closing";
  closers: Profile[];
  profilesById: Record<string, Profile>;
  currentUserId: string;
}

export default function FunnelBoard({
  initialLeads,
  funnel,
  closers,
  profilesById,
  currentUserId,
}: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [handoffLead, setHandoffLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stages = stagesFor(funnel);
  const selected = leads.find((l) => l.id === selectedId) ?? null;

  async function patchLead(id: string, changes: Partial<Lead>) {
    const prev = leads;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...changes } : l)));
    const supabase = createClient();
    const { error: err } = await supabase
      .from("leads")
      .update(changes)
      .eq("id", id);
    if (err) {
      setError(err.message);
      setLeads(prev); // rollback
    }
  }

  async function handoff(closerId: string) {
    if (!handoffLead) return;
    const id = handoffLead.id;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("leads")
      .update({
        closer_id: closerId,
        funnel: "closing",
        stage: CLOSING_STAGES[0],
      })
      .eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    // Verlaat dit bord (agent-funnel).
    setLeads((ls) => ls.filter((l) => l.id !== id));
    setHandoffLead(null);
    setSelectedId(null);
  }

  const byStage = (stage: string) => leads.filter((l) => l.stage === stage);

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {leads.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm">
          Nog geen leads in deze funnel.
        </p>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-4 lg:overflow-x-auto lg:pb-4">
          {stages.map((stage) => {
            const items = byStage(stage);
            return (
              <section
                key={stage}
                className="lg:w-72 lg:shrink-0"
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <h2 className="text-sm font-bold text-mg-dark">{stage}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-500 shadow-sm">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2 rounded-2xl bg-black/[0.02] p-2">
                  {items.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-gray-400">
                      Leeg
                    </p>
                  ) : (
                    items.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onOpen={() => setSelectedId(lead.id)}
                      />
                    ))
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
          profilesById={profilesById}
          onMove={(stage) => patchLead(selected.id, { stage })}
          onVoicemail={(value) =>
            patchLead(selected.id, { voicemail_count: value })
          }
          onHandoff={() => setHandoffLead(selected)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {handoffLead && (
        <HandoffModal
          lead={handoffLead}
          closers={closers}
          onConfirm={handoff}
          onClose={() => setHandoffLead(null)}
        />
      )}
    </div>
  );
}
