import { AGENT_STAGES } from "./funnels";

// Kernvelden met een echte kolom in de leads-tabel (speciaal gedrag).
export const CORE_FIELDS = [
  "full_name",
  "phone",
  "email",
  "address",
  "external_ref",
  "agent",
] as const;
export type CoreField = (typeof CORE_FIELDS)[number];

// Extra velden: 1-op-1 te koppelen, opgeslagen in de `extra`-jsonb en
// getoond bij de lead. Volgorde bepaalt de weergave in het lead-scherm.
export const EXTRA_FIELDS = [
  { key: "contactpersoon", label: "Contactpersoon" },
  { key: "duration", label: "Gespreksduur" },
  { key: "gespreksresultaat", label: "Gespreksresultaat" },
  { key: "commentaar", label: "Commentaar" },
  { key: "terugbelvenster", label: "Terugbel-venster" },
  { key: "postcode", label: "Postcode" },
  { key: "stad", label: "Stad" },
  { key: "campagne", label: "Campagne" },
  { key: "contactlijst", label: "Contactlijst" },
  { key: "datum", label: "Datum" },
  { key: "tijd", label: "Tijd" },
] as const;
export type ExtraKey = (typeof EXTRA_FIELDS)[number]["key"];

export type MapTarget = CoreField | ExtraKey | "extra";

export const FIELD_LABELS: Record<string, string> = {
  full_name: "Naam / bedrijf",
  phone: "Telefoon",
  email: "E-mail",
  address: "Adres",
  external_ref: "LeadDesk-ID (voor dedupe)",
  agent: "Sales agent (wie brochure stuurde)",
  extra: "Overig / negeren",
  ...Object.fromEntries(EXTRA_FIELDS.map((f) => [f.key, f.label])),
};

// Volgorde waarin velden in de dropdown verschijnen.
export const MAP_OPTIONS: MapTarget[] = [
  ...CORE_FIELDS,
  ...EXTRA_FIELDS.map((f) => f.key),
  "extra",
];

const EXTRA_KEYS = new Set<string>(EXTRA_FIELDS.map((f) => f.key));

// mapping: CSV-kolomnaam -> doelveld
export type ColumnMapping = Record<string, MapTarget>;
export type CsvRow = Record<string, string>;

export interface MappedLead {
  external_ref: string | null;
  full_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  extra: Record<string, string>;
  agentName: string | null; // ruwe naam uit de CSV, nog te matchen
}

function clean(v: string | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

// Eén CSV-rij omzetten naar een MappedLead volgens de mapping.
export function rowToLead(row: CsvRow, mapping: ColumnMapping): MappedLead {
  const lead: MappedLead = {
    external_ref: null,
    full_name: null,
    address: null,
    phone: null,
    email: null,
    extra: {},
    agentName: null,
  };

  for (const [col, value] of Object.entries(row)) {
    const target: MapTarget = mapping[col] ?? "extra";
    const cleaned = clean(value);

    if (target === "agent") {
      lead.agentName = cleaned;
    } else if (target === "phone") {
      lead.phone = cleaned ? cleaned.replace(/\s+/g, "") : null;
    } else if (target === "external_ref") {
      lead.external_ref = cleaned;
    } else if (target === "full_name") {
      lead.full_name = cleaned;
    } else if (target === "address") {
      lead.address = cleaned;
    } else if (target === "email") {
      lead.email = cleaned;
    } else if (EXTRA_KEYS.has(target)) {
      if (cleaned !== null) lead.extra[target] = cleaned;
    } else {
      // "extra" catch-all: bewaar onder de originele kolomnaam.
      if (cleaned !== null) lead.extra[col] = cleaned;
    }
  }
  return lead;
}

// Normaliseer een naam voor matching (kleine letters, spaties gestript).
export function normalizeName(name: string | null): string {
  return (name ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Rij klaarmaken voor insert in de leads-tabel.
export function toLeadInsert(lead: MappedLead, agentId: string | null) {
  return {
    external_ref: lead.external_ref,
    full_name: lead.full_name,
    address: lead.address,
    phone: lead.phone,
    email: lead.email,
    extra: lead.extra,
    agent_id: agentId,
    funnel: "agent" as const,
    stage: AGENT_STAGES[0],
  };
}

// Stabiele signatuur van de kolomkoppen — om de laatste mapping te onthouden.
export function headerSignature(headers: string[]): string {
  return headers.slice().sort().join("|");
}
