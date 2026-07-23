export const AGENT_STAGES = [
  "Brochure verzonden",
  "Eerste opvolging",
  "Voicemail — bel terug",
  "Terugbelafspraak",
  "Klaar om door te zetten",
  "Teruggenomen van closer",
] as const;

export const CLOSING_STAGES = [
  "Overgedragen",
  "Closing-afspraak",
  "Aanvullende info",
  "Inschrijving verzonden",
  "Gesloten",
] as const;

export type AgentStage = (typeof AGENT_STAGES)[number];
export type ClosingStage = (typeof CLOSING_STAGES)[number];

export function stagesFor(funnel: "agent" | "closing"): readonly string[] {
  return funnel === "agent" ? AGENT_STAGES : CLOSING_STAGES;
}

export function isFinalAgentStage(stage: string): boolean {
  return stage === "Klaar om door te zetten";
}
