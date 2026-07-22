"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadComment, Profile } from "@/lib/types";
import { isFinalAgentStage } from "@/lib/funnels";
import StagePicker from "./StagePicker";

interface Props {
  lead: Lead;
  stages: readonly string[];
  funnel: "agent" | "closing";
  currentUserId: string;
  profilesById: Record<string, Profile>;
  onMove: (stage: string) => void;
  onVoicemail: (value: number) => void;
  onHandoff: () => void;
  onClose: () => void;
}

export default function LeadDrawer({
  lead,
  stages,
  funnel,
  currentUserId,
  profilesById,
  onMove,
  onVoicemail,
  onHandoff,
  onClose,
}: Props) {
  const [comments, setComments] = useState<LeadComment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("lead_comments")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setComments((data as LeadComment[]) ?? []);
        setLoading(false);
      });
  }, [lead.id]);

  async function addComment() {
    if (!body.trim()) return;
    setPosting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("lead_comments")
      .insert({ lead_id: lead.id, author_id: currentUserId, body: body.trim() })
      .select()
      .single();
    if (!error && data) {
      setComments((prev) => [...prev, data as LeadComment]);
      setBody("");
    }
    setPosting(false);
  }

  const showHandoff = funnel === "agent" && isFinalAgentStage(lead.stage);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-xl font-bold text-mg-dark">
              {lead.full_name || "Naamloze lead"}
            </h2>
            {lead.address && (
              <p className="text-sm text-gray-500">{lead.address}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Sluiten"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {(lead.phone || lead.email) && (
            <div className="flex flex-wrap gap-3 text-sm">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="rounded-lg bg-mg-green px-4 py-2 font-semibold text-white hover:bg-mg-accent"
                >
                  Bel {lead.phone}
                </a>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200"
                >
                  E-mail
                </a>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Stage
            </label>
            <StagePicker stages={stages} value={lead.stage} onChange={onMove} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Voicemails
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onVoicemail(Math.max(0, lead.voicemail_count - 1))}
                className="h-10 w-10 rounded-lg bg-gray-100 text-lg font-bold text-gray-700 hover:bg-gray-200"
              >
                −
              </button>
              <span className="min-w-[2ch] text-center text-lg font-bold text-mg-dark">
                {lead.voicemail_count}
              </span>
              <button
                onClick={() => onVoicemail(lead.voicemail_count + 1)}
                className="h-10 w-10 rounded-lg bg-mg-green/10 text-lg font-bold text-mg-green hover:bg-mg-green/20"
              >
                +
              </button>
            </div>
          </div>

          {showHandoff && (
            <button
              onClick={onHandoff}
              className="w-full rounded-xl bg-mg-dark py-3 text-sm font-bold text-white hover:bg-mg-green"
            >
              Doorzetten naar closer →
            </button>
          )}

          {Object.keys(lead.extra).length > 0 && (
            <details className="rounded-xl bg-mg-light p-4">
              <summary className="cursor-pointer text-sm font-semibold text-gray-600">
                Extra info uit CSV
              </summary>
              <dl className="mt-2 space-y-1 text-sm">
                {Object.entries(lead.extra).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="text-right text-gray-800">{v}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Notities
            </h3>
            {loading ? (
              <p className="text-sm text-gray-400">Laden...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-gray-400">Nog geen notities.</p>
            ) : (
              <ul className="space-y-2">
                {comments.map((c) => (
                  <li key={c.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                    <p className="text-gray-800">{c.body}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {c.author_id
                        ? profilesById[c.author_id]?.full_name || "Onbekend"
                        : "Onbekend"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 p-4">
          <div className="flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addComment();
              }}
              placeholder="Notitie toevoegen..."
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
            />
            <button
              onClick={addComment}
              disabled={posting || !body.trim()}
              className="rounded-xl bg-mg-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-mg-accent disabled:opacity-50"
            >
              Plaats
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
