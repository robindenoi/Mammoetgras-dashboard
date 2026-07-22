import { AGENT_STAGES } from "./funnels";

// Velden waar een CSV-kolom aan gekoppeld kan worden.
export const LEAD_FIELDS = [
  "full_name",
  "address",
  "phone",
  "email",
  "external_ref",
  "agent",
] as const;

export type LeadField = (typeof LEAD_FIELDS)[number];

export const FIELD_LABELS: Record<LeadField | "extra", string> = {
  full_name: "Naam",
  address: "Adres",
  phone: "Telefoon",
  email: "E-mail",
  external_ref: "LeadDesk-ID (voor dedupe)",
  agent: "Sales agent (wie brochure stuurde)",
  extra: "Houd als extra",
};

// mapping: CSV-kolomnaam -> veld of "extra"
export type ColumnMapping = Record<string, LeadField | "extra">;

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
    const target = mapping[col] ?? "extra";
    const cleaned = clean(value);
    switch (target) {
      case "agent":
        lead.agentName = cleaned;
        break;
      case "phone":
        lead.phone = cleaned ? cleaned.replace(/\s+/g, "") : null;
        break;
      case "external_ref":
        lead.external_ref = cleaned;
        break;
      case "extra":
        if (cleaned !== null) lead.extra[col] = cleaned;
        break;
      default:
        lead[target] = cleaned;
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
