// Verstuurt een WhatsApp-bericht via de Twilio REST API (zonder SDK, puur fetch,
// zodat er geen extra dependency nodig is).
//
// Twee modi:
//  - body: vrije tekst (werkt in de Twilio-sandbox / binnen een lopend gesprek)
//  - contentSid + contentVariables: een door WhatsApp goedgekeurd sjabloon
//    (verplicht voor proactieve berichten in productie)

interface SendArgs {
  to: string; // E.164, bv. +316...
  body?: string;
  contentSid?: string;
  contentVariables?: Record<string, string>;
}

interface SendResult {
  ok: boolean;
  sid?: string;
  error?: string;
}

export async function sendWhatsApp(args: SendArgs): Promise<SendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  let from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    return { ok: false, error: "Twilio is nog niet geconfigureerd (env vars ontbreken)." };
  }
  if (!from.startsWith("whatsapp:")) from = `whatsapp:${from}`;

  const params = new URLSearchParams();
  params.set("From", from);
  params.set("To", `whatsapp:${args.to}`);

  if (args.contentSid) {
    params.set("ContentSid", args.contentSid);
    if (args.contentVariables) {
      params.set("ContentVariables", JSON.stringify(args.contentVariables));
    }
  } else if (args.body) {
    params.set("Body", args.body);
  } else {
    return { ok: false, error: "Geen berichtinhoud opgegeven." };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) {
      return { ok: false, error: data?.message || `Twilio-fout (${res.status})` };
    }
    return { ok: true, sid: data?.sid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout bij verzenden." };
  }
}

// Standaard Nederlandse reminder-tekst (voor sandbox/vrije tekst). In productie
// vervangt het goedgekeurde sjabloon (TWILIO_CONTENT_SID) deze tekst.
export function reminderBody(naam: string, tijd: string): string {
  const aanhef = naam ? `Hallo ${naam}` : "Hallo";
  return `${aanhef}, je hebt vandaag om ${tijd} een belafspraak met Mammoetgras Wereldwijd. Tot zo! 🌱`;
}
