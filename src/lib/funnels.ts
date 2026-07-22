// Vaste funnel-stages voor v1 (nog niet configureerbaar via de UI).

export const AGENT_STAGES = [
  "Brochure verzonden",
  "Eerste opvolging",
  "Voicemail — bel terug",
  "Terugbelafspraak",
  "Klaar om door te zetten",
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

// Is dit de laatste stage van de agent-funnel? Dan volgt handoff i.p.v. verder.
export function isFinalAgentStage(stage: string): boolean {
  return stage === AGENT_STAGES[AGENT_STAGES.length - 1];
}
