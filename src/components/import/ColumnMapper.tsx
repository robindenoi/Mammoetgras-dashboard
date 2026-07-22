"use client";

import {
  LEAD_FIELDS,
  FIELD_LABELS,
  type ColumnMapping,
  type LeadField,
} from "@/lib/csv";

interface Props {
  headers: string[];
  mapping: ColumnMapping;
  sample: Record<string, string> | undefined;
  onChange: (col: string, value: LeadField | "extra") => void;
}

export default function ColumnMapper({
  headers,
  mapping,
  sample,
  onChange,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-mg-light text-left text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-4 py-3">CSV-kolom</th>
            <th className="px-4 py-3">Voorbeeld</th>
            <th className="px-4 py-3">Koppel aan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {headers.map((h) => (
            <tr key={h}>
              <td className="px-4 py-2 font-medium text-gray-800">{h}</td>
              <td className="max-w-[12rem] truncate px-4 py-2 text-gray-500">
                {sample?.[h] ?? "—"}
              </td>
              <td className="px-4 py-2">
                <select
                  value={mapping[h] ?? "extra"}
                  onChange={(e) =>
                    onChange(h, e.target.value as LeadField | "extra")
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
                >
                  <option value="extra">{FIELD_LABELS.extra}</option>
                  {LEAD_FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {FIELD_LABELS[f]}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
