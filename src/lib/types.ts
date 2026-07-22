export type Category = "Geld" | "Risico" | "Uitstel" | "Vertrouwen" | "Interesse";

export interface Card {
  id: string;
  category: Category;
  objection: string;
  erkennen: string;
  reframe: string;
  bewijs: string;
  afsluitvraag: string;
  script: string;
  audio_url: string | null;
  created_at: string;
}

export const CATEGORIES: Category[] = [
  "Geld",
  "Risico",
  "Uitstel",
  "Vertrouwen",
  "Interesse",
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Geld: "bg-amber-100 text-amber-800",
  Risico: "bg-red-100 text-red-800",
  Uitstel: "bg-blue-100 text-blue-800",
  Vertrouwen: "bg-purple-100 text-purple-800",
  Interesse: "bg-emerald-100 text-emerald-800",
};

// ── Sales-CRM ──────────────────────────────────────────────

export type Role = "agent" | "closer" | "admin";
export type Funnel = "agent" | "closing";
export type AppointmentType = "terugbel" | "closing";

export interface Profile {
  id: string;
  full_name: string | null;
  leaddesk_name: string | null;
  role: Role;
  active: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  external_ref: string | null;
  full_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  extra: Record<string, string>;
  agent_id: string | null;
  closer_id: string | null;
  funnel: Funnel;
  stage: string;
  voicemail_count: number;
  created_at: string;
  updated_at: string;
}

export interface LeadComment {
  id: string;
  lead_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  lead_id: string | null;
  owner_id: string;
  type: AppointmentType;
  title: string | null;
  starts_at: string;
  ends_at: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}
