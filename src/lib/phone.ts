// Normaliseer een (Nederlands) telefoonnummer naar E.164 (+31...), zoals
// WhatsApp/Twilio vereist. Geeft null terug als er geen bruikbaar nummer is.
export function toE164NL(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (hadPlus) return `+${digits}`;
  if (digits.startsWith("31")) return `+${digits}`;
  if (digits.startsWith("0")) return `+31${digits.slice(1)}`;
  // Laatste redmiddel: aanname NL zonder leidende 0.
  return `+31${digits}`;
}
