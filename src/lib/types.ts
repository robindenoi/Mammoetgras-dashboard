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
