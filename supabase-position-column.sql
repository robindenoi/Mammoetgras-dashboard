-- ============================================================
-- Mammoetgras — 'position'-kolom garanderen op leads
-- Plak dit in de Supabase SQL-editor en klik "Run".
-- Veilig om meerdere keren te draaien (idempotent).
--
-- Achtergrond: de sleepvolgorde (drag-and-drop) schrijft per kaart een
-- 'position'. In sommige omgevingen ontbreekt deze kolom nog live, waardoor
-- de hele update faalt en een kaart na refresh terugspringt (action-point 1).
-- ============================================================

alter table public.leads
  add column if not exists position double precision not null default 0;
