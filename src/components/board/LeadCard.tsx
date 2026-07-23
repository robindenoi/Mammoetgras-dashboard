"use client";

import type { Lead, Appointment } from "@/lib/types";
import { PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/types";
import { formatDate, formatDateTime, sameAmsterdamDay } from "@/lib/time";

interface Props {
  lead: Lead;
  nextAppt: Appointment | null;
  ownerName?: string | null;
  draggable?: boolean;
  dragging?: boolean;
  highlight?: boolean;
  dealLocked?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onOpen: () => void;
}

export default function LeadCard({
  lead,
  nextAppt,
  ownerName,
  draggable,
  dragging,
  highlight,
  dealLocked,
  onDragStart,
  onDragEnd,
  onOpen,
}: Props) {
  const contact = lead.extra["contactpersoon"];
  const stad = lead.extra["stad"];
  const isToday =
    nextAppt && sameAmsterdamDay(nextAppt.starts_at, new Date());

  // Deal-privacy: in de Deal-stage alleen de naam + felicitatie tonen.
  if (dealLocked) {
    return (
      <button
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onOpen}
        className={`flex w-full flex-col gap-0.5 rounded-xl bg-emerald-50 p-4 text-left shadow-sm ring-1 ring-emerald-200 transition-all hover:shadow-md ${
          draggable ? "cursor-grab active:cursor-grabbing" : ""
        } ${dragging ? "opacity-40" : ""}`}
      >
        <span className="font-semibold text-emerald-800">
          {lead.full_name || "Naamloze lead"}
        </span>
        <span className="text-sm font-medium text-emerald-600">
          🎉 Gefeliciteerd, deal
        </span>
      </button>
    );
  }

  return (
    <>
      <style>{`
        @keyframes hf-nudge {
          0%, 90% { transform: rotate(0deg); }
          92% { transform: rotate(-1.5deg); }
          94% { transform: rotate(1.5deg); }
          96% { transform: rotate(-1deg); }
          98% { transform: rotate(1deg); }
          100% { transform: rotate(0deg); }
        }
        .hf-shake { animation: hf-nudge 4s ease-in-out infinite; }
      `}</style>
      <button
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onOpen}
        className={`flex w-full flex-col gap-1 rounded-xl p-4 text-left shadow-sm transition-all hover:shadow-md ${
          highlight ? "bg-blue-50 ring-2 ring-blue-300" : "bg-white"
        } ${isToday ? "hf-shake ring-2 ring-amber-400" : ""} ${
          draggable ? "cursor-grab active:cursor-grabbing" : ""
        } ${dragging ? "scale-[0.98] opacity-40 ring-2 ring-mg-green/50" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-gray-800">
            {lead.full_name || contact || "Naamloze lead"}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[lead.priority]}`}
          >
            {PRIORITY_LABELS[lead.priority]}
          </span>
        </div>

        {contact && lead.full_name && (
          <span className="truncate text-sm text-gray-500">{contact}</span>
        )}
        {(stad || lead.phone) && (
          <span className="text-sm text-gray-400">
            {[stad, lead.phone].filter(Boolean).join(" · ")}
          </span>
        )}

        {nextAppt && (
          <span
            className={`mt-1 inline-flex items-center gap-1 self-start rounded-lg px-2 py-1 text-xs font-semibold ${
              isToday
                ? "bg-amber-100 text-amber-700"
                : "bg-mg-green/10 text-mg-green"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {isToday ? "Vandaag " : ""}
            {formatDateTime(nextAppt.starts_at)}
          </span>
        )}

        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-xs text-gray-400">
            Aangemaakt {formatDate(lead.created_at)}
          </span>
          {ownerName && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mg-green/15 text-[10px] font-bold text-mg-green">
                {ownerName.charAt(0).toUpperCase()}
              </span>
              {ownerName}
            </span>
          )}
        </div>
      </button>
    </>
  );
}
