-- ============================================================
-- Mammoetgras — Realtime voor afspraken aanzetten
-- Nodig zodat de reminder-pop-up nieuwe/gewijzigde afspraken direct oppikt.
-- Plak in de Supabase SQL-editor en klik "Run".
-- (Als de tabel er al in zit, geeft Postgres een nette melding — geen probleem.)
-- ============================================================

alter publication supabase_realtime add table public.appointments;
