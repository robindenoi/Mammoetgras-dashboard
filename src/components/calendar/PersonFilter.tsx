"use client";

import type { Profile } from "@/lib/types";

interface Props {
  people: Profile[];
  value: string; // owner-id of "all"
  onChange: (value: string) => void;
}

export default function PersonFilter({ people, value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
    >
      <option value="all">Iedereen</option>
      {people.map((p) => (
        <option key={p.id} value={p.id}>
          {p.full_name || p.id}
        </option>
      ))}
    </select>
  );
}
