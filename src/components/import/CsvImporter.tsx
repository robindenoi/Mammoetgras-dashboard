"use client";

import { useState, useMemo } from "react";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import {
  type ColumnMapping,
  type CsvRow,
  type LeadField,
  rowToLead,
  toLeadInsert,
  normalizeName,
  headerSignature,
} from "@/lib/csv";
import ColumnMapper from "./ColumnMapper";

interface Props {
  profiles: Profile[];
}

function guessField(header: string): LeadField | "extra" {
  const h = header.toLowerCase();
  if (/(agent|verkoper|medewerker|rep)/.test(h)) return "agent";
  if (/(voornaam|achternaam|naam|name)/.test(h)) return "full_name";
  if (/(adres|address|straat|postcode|plaats|woonplaats)/.test(h)) return "address";
  if (/(tel|phone|mobiel|gsm|nummer)/.test(h)) return "phone";
  if (/(mail|e-mail|email)/.test(h)) return "email";
  if (/(^id$|lead.?id|ref|extern)/.test(h)) return "external_ref";
  return "extra";
}

const MAP_STORAGE_PREFIX = "mammoetgras-csvmap-";

export default function CsvImporter({ profiles }: Props) {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [remember, setRemember] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    inserted: number;
    duplicates: number;
    unmatched: number;
  } | null>(null);

  const agents = useMemo(
    () => profiles.filter((p) => p.role === "agent" || p.role === "admin"),
    [profiles]
  );

  // Lookup van genormaliseerde naam -> agent-id (leaddesk_name en full_name).
  const nameToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of profiles) {
      if (p.leaddesk_name) m.set(normalizeName(p.leaddesk_name), p.id);
      if (p.full_name) m.set(normalizeName(p.full_name), p.id);
    }
    return m;
  }, [profiles]);

  function resolveAgentId(agentName: string | null): string | null {
    if (!agentName) return null;
    const key = normalizeName(agentName);
    return nameToId.get(key) ?? assignments[key] ?? null;
  }

  // Distinct agent-namen uit de CSV volgens de huidige mapping.
  const agentColumn = Object.entries(mapping).find(([, v]) => v === "agent")?.[0];
  const distinctAgentNames = useMemo(() => {
    if (!agentColumn) return [];
    const set = new Set<string>();
    for (const r of rows) {
      const raw = (r[agentColumn] ?? "").trim();
      if (raw) set.add(raw);
    }
    return Array.from(set).sort();
  }, [rows, agentColumn]);

  const unmatchedNames = distinctAgentNames.filter(
    (n) => !nameToId.has(normalizeName(n))
  );

  function handleFile(file: File) {
    setError(null);
    setResult(null);
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const hdrs = res.meta.fields ?? [];
        const data = (res.data as CsvRow[]).filter((r) =>
          Object.values(r).some((v) => v && v.trim() !== "")
        );
        if (hdrs.length === 0 || data.length === 0) {
          setError("Kon geen rijen of kolommen vinden in dit bestand.");
          return;
        }
        // Laatst gebruikte mapping ophalen, anders raden.
        let initial: ColumnMapping = {};
        const stored = localStorage.getItem(
          MAP_STORAGE_PREFIX + headerSignature(hdrs)
        );
        if (stored) {
          try {
            initial = JSON.parse(stored);
          } catch {
            initial = {};
          }
        }
        for (const h of hdrs) {
          if (!initial[h]) initial[h] = guessField(h);
        }
        setHeaders(hdrs);
        setRows(data);
        setMapping(initial);
        setAssignments({});
      },
      error: (err) => setError(`Kon CSV niet lezen: ${err.message}`),
    });
  }

  function setColumn(col: string, value: LeadField | "extra") {
    setMapping((prev) => ({ ...prev, [col]: value }));
  }

  async function runImport() {
    setImporting(true);
    setError(null);

    const supabase = createClient();
    const hasExternalRef = Object.values(mapping).includes("external_ref");

    const inserts = [];
    let unmatched = 0;
    for (const r of rows) {
      const mapped = rowToLead(r, mapping);
      const agentId = resolveAgentId(mapped.agentName);
      if (mapped.agentName && !agentId) unmatched++;
      inserts.push(toLeadInsert(mapped, agentId));
    }

    // "Onthoud" — sla de gekozen CSV-naam op als leaddesk_name bij de agent.
    if (remember) {
      for (const [normName, agentId] of Object.entries(assignments)) {
        if (!agentId) continue;
        const original = distinctAgentNames.find(
          (n) => normalizeName(n) === normName
        );
        if (original) {
          await supabase
            .from("profiles")
            .update({ leaddesk_name: original })
            .eq("id", agentId);
        }
      }
    }

    let inserted = 0;
    try {
      for (let i = 0; i < inserts.length; i += 500) {
        const batch = inserts.slice(i, i + 500);
        const query = hasExternalRef
          ? supabase
              .from("leads")
              .upsert(batch, {
                onConflict: "external_ref",
                ignoreDuplicates: true,
              })
              .select("id")
          : supabase.from("leads").insert(batch).select("id");
        const { data, error: err } = await query;
        if (err) throw new Error(err.message);
        inserted += data?.length ?? 0;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import mislukt");
      setImporting(false);
      return;
    }

    // Onthoud de mapping voor de volgende keer.
    localStorage.setItem(
      MAP_STORAGE_PREFIX + headerSignature(headers),
      JSON.stringify(mapping)
    );

    setResult({
      inserted,
      duplicates: rows.length - inserted,
      unmatched,
    });
    setImporting(false);
    setRows([]);
    setHeaders([]);
  }

  // ── Klaar-scherm ──
  if (result) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-mg-dark">Import voltooid</h2>
        <ul className="space-y-1 text-gray-700">
          <li>✓ {result.inserted} nieuwe leads toegevoegd</li>
          {result.duplicates > 0 && (
            <li className="text-gray-500">
              {result.duplicates} overgeslagen (duplicaat of leeg)
            </li>
          )}
          {result.unmatched > 0 && (
            <li className="text-amber-600">
              {result.unmatched} leads zonder gekoppelde agent (alleen zichtbaar
              voor admin)
            </li>
          )}
        </ul>
        <button
          onClick={() => setResult(null)}
          className="mt-5 rounded-xl bg-mg-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-mg-accent"
        >
          Nog een bestand importeren
        </button>
      </div>
    );
  }

  // ── Upload-scherm ──
  if (headers.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-mg-green/30 bg-white p-10 text-center shadow-sm">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <p className="mb-4 text-gray-600">Kies een CSV-bestand uit LeadDesk.</p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="mx-auto block text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-mg-green file:px-5 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-mg-accent"
        />
      </div>
    );
  }

  // ── Mapping + resolver-scherm ──
  const matchedCount = distinctAgentNames.length - unmatchedNames.length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-mg-green">
          1. Koppel de kolommen ({rows.length} rijen)
        </h2>
        <ColumnMapper
          headers={headers}
          mapping={mapping}
          sample={rows[0]}
          onChange={setColumn}
        />
      </div>

      {agentColumn && unmatchedNames.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-mg-green">
            2. Onbekende agents koppelen ({matchedCount}/
            {distinctAgentNames.length} herkend)
          </h2>
          <div className="space-y-2 rounded-2xl bg-white p-5 shadow-sm">
            {unmatchedNames.map((name) => (
              <div
                key={name}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-gray-800">
                  &ldquo;{name}&rdquo;
                </span>
                <select
                  value={assignments[normalizeName(name)] ?? ""}
                  onChange={(e) =>
                    setAssignments((prev) => ({
                      ...prev,
                      [normalizeName(name)]: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20"
                >
                  <option value="">— laat leeg (admin) —</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name || a.id}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-mg-green focus:ring-mg-green"
              />
              Onthoud deze koppelingen voor de volgende import
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={runImport}
          disabled={importing}
          className="rounded-xl bg-mg-green px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-mg-accent disabled:opacity-50"
        >
          {importing ? "Importeren..." : `Importeer ${rows.length} leads`}
        </button>
        <button
          onClick={() => {
            setHeaders([]);
            setRows([]);
            setMapping({});
          }}
          className="text-sm font-medium text-gray-500 hover:underline"
        >
          Ander bestand
        </button>
      </div>
    </div>
  );
}
