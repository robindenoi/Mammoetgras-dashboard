-- ============================================================
-- Mammoetgras — WhatsApp-herinneringen
-- Plak dit in de Supabase SQL-editor en klik "Run".
-- Veilig om meerdere keren te draaien (idempotent).
-- ============================================================

-- Per afspraak bijhouden of/wanneer er een reminder is verstuurd.
alter table public.appointments
  add column if not exists reminder_enabled boolean not null default true,
  add column if not exists reminder_sent_at timestamptz;

-- Per lead vastleggen of de klant WhatsApp-berichten mag ontvangen (toestemming).
alter table public.leads
  add column if not exists whatsapp_opt_in boolean not null default true;

-- Index zodat de reminder-taak snel de openstaande afspraken vindt.
create index if not exists appt_reminder_idx
  on public.appointments (starts_at)
  where reminder_sent_at is null and reminder_enabled;
