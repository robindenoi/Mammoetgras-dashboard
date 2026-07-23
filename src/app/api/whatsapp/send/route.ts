import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp, reminderBody } from "@/lib/twilio";
import { toE164NL } from "@/lib/phone";
import { formatTime } from "@/lib/time";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Handmatig versturen ("Nu appen"-knop). Alleen voor ingelogde gebruikers.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { appointmentId } = (await req.json().catch(() => ({}))) as {
    appointmentId?: string;
  };
  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId ontbreekt" }, { status: 400 });
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, starts_at, leads(full_name, phone, whatsapp_opt_in)")
    .eq("id", appointmentId)
    .single();

  const lead = (appt as unknown as {
    starts_at: string;
    leads: { full_name: string | null; phone: string | null; whatsapp_opt_in: boolean } | null;
  } | null)?.leads;

  if (!appt || !lead) {
    return NextResponse.json({ error: "Afspraak of lead niet gevonden" }, { status: 404 });
  }
  if (lead.whatsapp_opt_in === false) {
    return NextResponse.json({ error: "Deze lead heeft geen WhatsApp-toestemming" }, { status: 400 });
  }
  const to = toE164NL(lead.phone);
  if (!to) {
    return NextResponse.json({ error: "Geen geldig telefoonnummer" }, { status: 400 });
  }

  const tijd = formatTime((appt as unknown as { starts_at: string }).starts_at);
  const naam = lead.full_name ?? "";
  const contentSid = process.env.TWILIO_CONTENT_SID;
  const send = contentSid
    ? await sendWhatsApp({ to, contentSid, contentVariables: { "1": naam, "2": tijd } })
    : await sendWhatsApp({ to, body: reminderBody(naam, tijd) });

  if (!send.ok) {
    return NextResponse.json({ error: send.error }, { status: 502 });
  }

  // Markeer als verstuurd, zodat de automatische reminder niet dubbel stuurt.
  try {
    const admin = createAdminClient();
    await admin
      .from("appointments")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", appointmentId);
  } catch {
    // Service-role niet geconfigureerd → bericht is wél verstuurd, alleen niet
    // gemarkeerd. Niet fataal voor de gebruiker.
  }

  return NextResponse.json({ ok: true });
}
