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
import {
  formatDateTime,
  isoToAmsterdamLocal,
  amsterdamLocalToISO,
  durationMinutes,
} from "@/lib/time";
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
  dealLocked?: boolean;
  onMove: (stage: string) => void;
  onPriority: (p: Priority) => void;
  onVoicemail: (value: number) => void;
  onSaveAppt: (startsISO: string, endsISO: string, id?: string) => Promise<void>;
  onDeleteAppt: (id: string) => Promise<void>;
  onHandoff: () => void;
  onTakeBack?: () => void;
  onSendBack?: () => void;
  onClose: () => void;
}

// Vaste kleur per auteur, zodat je in één oogopslag ziet wie wat schreef.
const NOTE_COLORS = [
  { border: "#2F6B43", bg: "#2F6B4310" }, // mg-green
  { border: "#6366f1", bg: "#6366f110" }, // indigo
  { border: "#f59e0b", bg: "#f59e0b10" }, // amber
  { border: "#ec4899", bg: "#ec489910" }, // pink
  { border: "#14b8a6", bg: "#14b8a610" }, // teal
  { border: "#8b5cf6", bg: "#8b5cf610" }, // violet
  { border: "#ef4444", bg: "#ef444410" }, // red
];

function noteColor(authorId: string | null) {
  if (!authorId) return NOTE_COLORS[0];
  let h = 0;
  for (let i = 0; i < authorId.length; i++) h = (h * 31 + authorId.charCodeAt(i)) >>> 0;
  return NOTE_COLORS[h % NOTE_COLORS.length];
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
  dealLocked,
  onMove,
  onPriority,
  onVoicemail,
  onSaveAppt,
  onDeleteAppt,
  onHandoff,
  onTakeBack,
  onSendBack,
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
  const [apptError, setApptError] = useState<string | null>(null);
  const [waStatus, setWaStatus] = useState<
    Record<string, "sending" | "sent" | "error">
  >({});

  async function sendWhatsappNow(apptId: string) {
    setWaStatus((s) => ({ ...s, [apptId]: "sending" }));
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: apptId }),
      });
      setWaStatus((s) => ({ ...s, [apptId]: res.ok ? "sent" : "error" }));
    } catch {
      setWaStatus((s) => ({ ...s, [apptId]: "error" }));
    }
  }

  const canTakeBack =
    funnel === "closing" &&
    currentUserRole === "agent" &&
    lead.agent_id === currentUserId;

  const canSendBack =
    funnel === "closing" &&
    (currentUserRole === "closer" || currentUserRole === "admin") &&
    !!lead.agent_id &&
    !!onSendBack;

  const vmCount =
    funnel === "closing" ? lead.closer_voicemail_count : lead.voicemail_count;

  async function submitAppt() {
    if (readOnly) return;
    if (!apptStart.includes("T") || apptStart.startsWith("T")) return;
    setSavingAppt(true);
    setApptError(null);
    const startsISO = amsterdamLocalToISO(apptStart);
    const endsISO = new Date(
      new Date(startsISO).getTime() + apptDuration * 60000
    ).toISOString();
    try {
      await onSaveAppt(startsISO, endsISO, editingApptId ?? undefined);
      setApptStart("");
      setApptDuration(30);
      setEditingApptId(null);
    } catch (e) {
      setApptError(e instanceof Error ? e.message : "Opslaan mislukt.");
    } finally {
      setSavingAppt(false);
    }
  }

  async function deleteApptSafe(id: string) {
    setApptError(null);
    try {
      await onDeleteAppt(id);
    } catch (e) {
      setApptError(e instanceof Error ? e.message : "Verwijderen mislukt.");
    }
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

  const showHandoff =
    !readOnly && funnel === "agent" && isFinalAgentStage(lead.stage);

  const knownKeys = new Set<string>(EXTRA_FIELDS.map((f) => f.key));
  // Gespreksduur kan onder verschillende kolomnamen binnenkomen (duration,
  // Duration, Duur, Gespreksduur, ...). Zoek daarom hoofdletter-ongevoelig.
  const durationKey = Object.keys(lead.extra).find((k) => {
    const s = k.toLowerCase();
    return s.includes("duration") || s.includes("duur");
  });
  const duration = durationKey ? lead.extra[durationKey] : undefined;
  const contactpersoon = lead.extra["contactpersoon"];

  // Duration, contactpersoon apart tonen; laat ze uit de generieke lijsten.
  const gridSkip = new Set(["duration", "contactpersoon"]);
  const knownExtra = EXTRA_FIELDS.filter(
    (f) => lead.extra[f.key] && !gridSkip.has(f.key)
  );
  const unknownExtra = Object.entries(lead.extra).filter(
    ([k]) => !knownKeys.has(k) && k !== durationKey
  );

  const ownerHistory = lead.owner_history ?? [];

  function profileName(id: string | null): string {
    if (!id) return "onbekend";
    return profilesById[id]?.full_name || "onbekend";
  }

  // ── Deal-privacy: alleen naam + felicitatie, geen kaartdetails. ──
  if (dealLocked) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
        <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
          <div className="flex items-start justify-between border-b border-gray-100 p-5">
            <h2 className="text-xl font-bold text-mg-dark">
              {lead.full_name || "Naamloze lead"}
            </h2>
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
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="text-5xl">🎉</span>
            <p className="text-2xl font-bold text-mg-green">Gefeliciteerd, deal!</p>
            <p className="text-gray-500">{lead.full_name || "Naamloze lead"}</p>
          </div>
        </div>
      </div>
    );
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
              <p className="mt-1 text-xs font-medium text-blue-600">Alleen-lezen</p>
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
          {/* ── Acties bovenaan ── */}
          {(canTakeBack || canSendBack || showHandoff) && (
            <div className="space-y-2">
              {canSendBack && (
                <button
                  onClick={onSendBack}
                  className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600"
                >
                  ↩ Terugsturen naar sales agent
                </button>
              )}
              {canTakeBack && onTakeBack && (
                <button
                  onClick={onTakeBack}
                  className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600"
                >
                  Terugpakken naar mijn bord
                </button>
              )}
              {showHandoff && (
                <button
                  onClick={onHandoff}
                  className="w-full rounded-xl bg-mg-dark py-3 text-sm font-bold text-white hover:bg-mg-green"
                >
                  Doorzetten naar closer →
                </button>
              )}
            </div>
          )}

          {/* ── 1. Afspraak inplannen ── */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Afspraak inplannen
            </label>
            {apptError && (
              <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {apptError}
              </div>
            )}
            {leadAppts.length > 0 && (
              <ul className="mb-3 space-y-2">
                {leadAppts
                  .slice()
                  .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                  .map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg bg-mg-green/10 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-mg-dark">
                          {formatDateTime(a.starts_at)}
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            {durationMinutes(a.starts_at, a.ends_at)} min
                          </span>
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
                              onClick={() => deleteApptSafe(a.id)}
                              className="text-xs font-medium text-red-500 hover:underline"
                            >
                              verwijder
                            </button>
                          </span>
                        )}
                      </div>
                      {!readOnly && lead.phone && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <button
                            onClick={() => sendWhatsappNow(a.id)}
                            disabled={waStatus[a.id] === "sending"}
                            className="inline-flex items-center gap-1 rounded-md bg-[#25D366] px-2 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.719z" />
                            </svg>
                            {waStatus[a.id] === "sending" ? "Versturen..." : "Nu appen"}
                          </button>
                          {waStatus[a.id] === "sent" && (
                            <span className="text-xs font-medium text-green-600">✓ Verstuurd</span>
                          )}
                          {waStatus[a.id] === "error" && (
                            <span className="text-xs font-medium text-red-500">Mislukt</span>
                          )}
                        </div>
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

          {/* ── 2. Notities ── */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Notities
            </label>
            {loading ? (
              <p className="text-sm text-gray-400">Laden...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-gray-400">Nog geen notities.</p>
            ) : (
              <ul className="space-y-2">
                {comments.map((c) => {
                  const col = noteColor(c.author_id);
                  return (
                    <li
                      key={c.id}
                      className="rounded-lg border-l-4 p-3 text-sm"
                      style={{ borderColor: col.border, backgroundColor: col.bg }}
                    >
                      <p className="text-gray-800">{c.body}</p>
                      <p className="mt-1 text-xs font-medium" style={{ color: col.border }}>
                        {c.author_id
                          ? profilesById[c.author_id]?.full_name || "Onbekend"
                          : "Onbekend"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-2 flex gap-2">
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

          {/* ── 3. Contactgegevens ── */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Contactgegevens
            </label>
            {(lead.phone || lead.email) && (
              <div className="mb-2 flex flex-wrap gap-3 text-sm">
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
            <dl className="space-y-1 text-sm">
              {contactpersoon && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Contactpersoon</dt>
                  <dd className="text-right text-gray-800">{contactpersoon}</dd>
                </div>
              )}
              {lead.address && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Adres</dt>
                  <dd className="text-right text-gray-800">{lead.address}</dd>
                </div>
              )}
              {lead.email && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">E-mail</dt>
                  <dd className="text-right text-gray-800">{lead.email}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* ── 4. Overige informatie ── */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Overige informatie
            </label>

            {duration && (
              <div className="flex items-center gap-2 rounded-xl bg-mg-light p-3">
                <svg className="h-5 w-5 text-mg-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Gespreksduur
                  </p>
                  <p className="font-semibold text-mg-dark">{duration}</p>
                </div>
              </div>
            )}

            {!readOnly && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Label
                </p>
                <div className="flex gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      onClick={() => onPriority(p)}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
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

            {!readOnly && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Stage
                </p>
                <StagePicker stages={stages} value={lead.stage} onChange={onMove} />
              </div>
            )}

            {!readOnly && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Voicemails
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onVoicemail(Math.max(0, vmCount - 1))}
                    className="h-10 w-10 rounded-lg bg-gray-100 text-lg font-bold text-gray-700 hover:bg-gray-200"
                  >
                    −
                  </button>
                  <span className="min-w-[2ch] text-center text-lg font-bold text-mg-dark">
                    {vmCount}
                  </span>
                  <button
                    onClick={() => onVoicemail(vmCount + 1)}
                    className="h-10 w-10 rounded-lg bg-mg-green/10 text-lg font-bold text-mg-green hover:bg-mg-green/20"
                  >
                    +
                  </button>
                </div>
                {funnel === "closing" && (
                  <p className="mt-1 text-xs text-gray-400">
                    Bij de 4e voicemail gaat de kaart automatisch terug naar de sales agent.
                  </p>
                )}
              </div>
            )}

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

            {ownerHistory.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Eigenaarsgeschiedenis
                </p>
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
                      <p className="text-xs text-gray-400">{formatDateTime(entry.at)}</p>
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
          </div>
        </div>
      </div>
    </div>
  );
}
