export const AGENT_STAGES = [
  "Brochure verzonden",
  "Eerste opvolging",
  "Voicemail — bel terug",
  "Terugbelafspraak",
  "Klaar om door te zetten",
  "Teruggenomen van closer",
  "Afgevallen",
] as const;

// Kolomvolgorde van het closer-bord (zie action-point 8).
export const CLOSING_STAGES = [
  "Overdragen",
  "Voicemail",
  "Nog niet gelezen",
  "Terugbel afspraak",
  "Afgevallen",
  "Inschrijving verzonden",
  "Deal",
  "Inschrijving ontvangen",
] as const;

export type AgentStage = (typeof AGENT_STAGES)[number];
export type ClosingStage = (typeof CLOSING_STAGES)[number];

export function stagesFor(funnel: "agent" | "closing"): readonly string[] {
  return funnel === "agent" ? AGENT_STAGES : CLOSING_STAGES;
}

export function isFinalAgentStage(stage: string): boolean {
  return stage === "Klaar om door te zetten";
}

export function isDealStage(stage: string): boolean {
  return stage === "Deal";
}

// Afgevallen in de closing-funnel → kaart terug naar de oorspronkelijke agent.
export function isClosingAfgevallen(stage: string): boolean {
  return stage === "Afgevallen";
}

// Agent-stage waarin een teruggestuurde/afgevallen kaart landt.
export const AGENT_AFGEVALLEN_STAGE = "Afgevallen";
export const AGENT_TERUGGENOMEN_STAGE = "Teruggenomen van closer";

// Aantal closer-voicemails waarna de kaart automatisch retour gaat.
export const CLOSER_VOICEMAIL_LIMIT = 4;
