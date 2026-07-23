"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Lead,
  LeadComment,
  Profile,
  Appointment,
  Priority,
  Role,
} from "@/lib/types";
import { PRIORITIES, PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/types";
import { isFinalAgentStage } from "@/lib/funnels";
import { EXTRA_FIELDS } from "@/lib/csv";
import { formatDateTime, isoToAmsterdamLocal, amsterdamLocalToISO } from "@/lib/time";
import StagePicker from "./StagePicker";

interface Props {
  lead: Lead;
  stages: readonly string[];
  funnel: "agent" | "closing";
  currentUserId: string;
  currentUserRole: Role;
  profilesById: Record<string, Profile>;
  leadAppts: Appointment[];
  readOnly?: boolean;
  onMove: (stage: string) => void;
  onPriority: (p: Priority) => void;
  onVoicemail: (value: number) => void;
  onSaveAppt: (startsISO: string, endsISO: string, id?: string) => Promise<void>;
  onDeleteAppt: (id: string) => Promise<void>;
  onHandoff: () => void;
  onTakeBack?: () => void;
  onClose: () => void;
}

export default function LeadDrawer({
  lead,
  stages,
  funnel,
  currentUserId,
  currentUserRole,
  profilesById,
  leadAppts,
  readOnly,
  onMove,
  onPriority,
  onVoicemail,
  onSaveAppt,
  onDeleteAppt,
  onHandoff,
  onTakeBack,
  onClose,
}: Props) {
  const [comments, setComments] = useState<LeadComment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const [apptStart, setApptStart] = useState("");
  const [apptDuration, setApptDuration] = useState(30);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [savingAppt, setSavingAppt] = useState(false);

  const isOwnCard =
    lead.agent_id === currentUserId || lead.closer_id === currentUserId;
  const canTakeBack =
    funnel === "closing" &&
    currentUserRole === "agent" &&
    lead.agent_id === currentUserId;

  async function submitAppt() {
    if (readOnly) return;
    if (!apptStart.includes("T") || apptStart.startsWith("T")) return;
    setSavingAppt(true);
    const startsISO = amsterdamLocalToISO(apptStart);
    const endsISO = new Date(
      new Date(startsISO).getTime() + apptDuration * 60000
    ).toISOString();
    await onSaveAppt(startsISO, endsISO, editingApptId ?? undefined);
    setApptStart("");
    setApptDuration(30);
    setEditingApptId(null);
    setSavingAppt(false);
  }

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

  const showHandoff = !readOnly && funnel === "agent" && isFinalAgentStage(lead.stage);

  const knownKeys = new Set<string>(EXTRA_FIELDS.map((f) => f.key));
  const knownExtra = EXTRA_FIELDS.filter((f) => lead.extra[f.key]);
  const unknownExtra = Object.entries(lead.extra).filter(
    ([k]) => !knownKeys.has(k)
  );

  const ownerHistory = lead.owner_history ?? [];

  function profileName(id: string | null): string {
    if (!id) return "onbekend";
    return profilesById[id]?.full_name || "onbekend";
  }

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
            <p className="mt-1 text-xs text-gray-400">
              Agent:{" "}
              {lead.agent_id
                ? profilesById[lead.agent_id]?.full_name || "onbekend"
                : "niet toegewezen"}
              {lead.closer_id && (
                <>
                  {" · Closer: "}
                  {profilesById[lead.closer_id]?.full_name || "onbekend"}
                </>
              )}
            </p>
            {readOnly && (
              <p className="mt-1 text-xs font-medium text-blue-600">
                Alleen-lezen
              </p>
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

          {canTakeBack && onTakeBack && (
            <button
              onClick={onTakeBack}
              className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600"
            >
              Terugpakken naar mijn bord
            </button>
          )}

          {!readOnly && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Prioriteit
              </label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => onPriority(p)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      lead.priority === p
                        ? PRIORITY_COLORS[p] + " ring-2 ring-offset-1 ring-current"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Opvolgafspraken
            </label>
            {leadAppts.length > 0 && (
              <ul className="mb-3 space-y-2">
                {leadAppts
                  .slice()
                  .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                  .map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between rounded-lg bg-mg-green/10 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-mg-dark">
                        {formatDateTime(a.starts_at)}
                      </span>
                      {!readOnly && (
                        <span className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingApptId(a.id);
                              setApptStart(isoToAmsterdamLocal(a.starts_at));
                            }}
                            className="text-xs font-medium text-mg-green hover:underline"
                          >
                            bewerk
                          </button>
                          <button
                            onClick={() => onDeleteAppt(a.id)}
                            className="text-xs font-medium text-red-500 hover:underline"
                          >
                            verwijder
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            )}
            {!readOnly && (
              <>
                <div className="flex flex-wrap items-end gap-2">
                  <input
                    type="datetime-local"
                    value={apptStart}
                    onChange={(e) => setApptStart(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
                  />
                  <select
                    value={apptDuration}
                    onChange={(e) => setApptDuration(Number(e.target.value))}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
                  >
                    {[15, 30, 45, 60].map((d) => (
                      <option key={d} value={d}>
                        {d} min
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={submitAppt}
                    disabled={savingAppt || !apptStart}
                    className="rounded-lg bg-mg-green px-4 py-2 text-sm font-semibold text-white hover:bg-mg-accent disabled:opacity-50"
                  >
                    {editingApptId ? "Bijwerken" : "Inplannen"}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Verschijnt ook in de agenda.
                </p>
              </>
            )}
          </div>

          {knownExtra.length > 0 && (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-xl bg-mg-light p-4 text-sm sm:grid-cols-2">
              {knownExtra.map((f) => (
                <div key={f.key}>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {f.label}
                  </dt>
                  <dd className="text-gray-800">{lead.extra[f.key]}</dd>
                </div>
              ))}
            </dl>
          )}

          {!readOnly && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Stage
              </label>
              <StagePicker stages={stages} value={lead.stage} onChange={onMove} />
            </div>
          )}

          {!readOnly && (
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
          )}

          {showHandoff && (
            <button
              onClick={onHandoff}
              className="w-full rounded-xl bg-mg-dark py-3 text-sm font-bold text-white hover:bg-mg-green"
            >
              Doorzetten naar closer →
            </button>
          )}

          {ownerHistory.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Eigenaarsgeschiedenis
              </label>
              <ol className="relative ml-3 border-l-2 border-gray-200">
                {ownerHistory.map((entry, i) => (
                  <li key={i} className="mb-3 ml-4 last:mb-0">
                    <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-gray-400" />
                    <p className="text-sm text-gray-700">
                      {entry.action === "doorgezet" ? (
                        <>
                          <span className="font-semibold">{profileName(entry.from)}</span>
                          {" → "}
                          <span className="font-semibold">{profileName(entry.to)}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">{profileName(entry.to)}</span>
                          {" heeft teruggenomen van "}
                          <span className="font-semibold">{profileName(entry.from)}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDateTime(entry.at)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {unknownExtra.length > 0 && (
            <details className="rounded-xl bg-gray-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-gray-600">
                Overige velden uit CSV
              </summary>
              <dl className="mt-2 space-y-1 text-sm">
                {unknownExtra.map(([k, v]) => (
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
