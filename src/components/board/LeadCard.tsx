"use client";

import type { Lead } from "@/lib/types";

interface Props {
  lead: Lead;
  onOpen: () => void;
}

export default function LeadCard({ lead, onOpen }: Props) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full flex-col gap-1 rounded-xl bg-white p-4 text-left shadow-sm transition-all hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-gray-800">
          {lead.full_name || "Naamloze lead"}
        </span>
        {lead.voicemail_count > 0 && (
          <span className="shrink-0 rounded-full bg-mg-green/10 px-2 py-0.5 text-xs font-semibold text-mg-green">
            {lead.voicemail_count}× vm
          </span>
        )}
      </div>
      {lead.address && (
        <span className="truncate text-sm text-gray-500">{lead.address}</span>
      )}
      {lead.phone && (
        <span className="text-sm text-gray-400">{lead.phone}</span>
      )}
    </button>
  );
}
