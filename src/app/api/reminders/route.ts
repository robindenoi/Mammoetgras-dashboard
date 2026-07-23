import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp, reminderBody } from "@/lib/twilio";
import { toE164NL } from "@/lib/phone";
import { formatTime } from "@/lib/time";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Automatische taak: verstuurt WhatsApp-reminders voor belafspraken die binnen
// hun reminder-venster vallen. Wordt periodiek aangeroepen (Vercel Cron of een
// externe cron), elke minuut. Beveiligd met CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const offset = parseInt(process.env.REMINDER_OFFSET_MINUTES ?? "30", 10);
  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  const horizonISO = new Date(now + 24 * 60 * 60 * 1000).toISOString();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, lead_id, leads(full_name, phone, whatsapp_opt_in)"
    )
    .is("reminder_sent_at", null)
    .eq("reminder_enabled", true)
    .not("lead_id", "is", null)
    .gt("starts_at", nowISO)
    .lte("starts_at", horizonISO);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contentSid = process.env.TWILIO_CONTENT_SID;
  const results: Array<Record<string, unknown>> = [];

  for (const row of (data ?? []) as unknown as Array<{
    id: string;
    starts_at: string;
    leads: { full_name: string | null; phone: string | null; whatsapp_opt_in: boolean } | null;
  }>) {
    // Alleen versturen zodra we binnen het "offset"-venster vóór de afspraak zitten.
    const dueAt = new Date(row.starts_at).getTime() - offset * 60000;
    if (now < dueAt) continue;

    const lead = row.leads;
    if (!lead) continue;
    if (lead.whatsapp_opt_in === false) {
      results.push({ id: row.id, skipped: "geen toestemming" });
      continue;
    }
    const to = toE164NL(lead.phone);
    if (!to) {
      results.push({ id: row.id, skipped: "geen telefoonnummer" });
      continue;
    }

    const tijd = formatTime(row.starts_at);
    const naam = lead.full_name ?? "";
    const send = contentSid
      ? await sendWhatsApp({ to, contentSid, contentVariables: { "1": naam, "2": tijd } })
      : await sendWhatsApp({ to, body: reminderBody(naam, tijd) });

    if (send.ok) {
      await supabase
        .from("appointments")
        .update({ reminder_sent_at: nowISO })
        .eq("id", row.id);
      results.push({ id: row.id, sent: true });
    } else {
      results.push({ id: row.id, error: send.error });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
