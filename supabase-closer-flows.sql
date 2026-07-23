-- ============================================================
-- Mammoetgras — closer-flows migratie
-- Plak dit volledig in de Supabase SQL-editor en klik "Run".
-- Veilig om meerdere keren te draaien (idempotent).
-- ============================================================

-- 1) Aparte voicemail-teller voor closers (los van de agent-teller).
--    Bij 4x voicemail door een closer gaat de kaart automatisch retour.
alter table public.leads
  add column if not exists closer_voicemail_count int not null default 0;

-- 2) RPC om alle afspraken van een lead naar een nieuwe eigenaar te verplaatsen.
--    SECURITY DEFINER omzeilt de owner-check in de RLS `with check`, maar we
--    controleren zelf dat de aanroeper bij de lead betrokken is (agent/closer/admin).
--    Gebruikt bij: doorzetten (agent→closer), terugpakken en terugsturen (closer→agent).
create or replace function public.move_lead_appointments(
  p_lead_id uuid,
  p_new_owner uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.leads l
    where l.id = p_lead_id
      and (l.agent_id = auth.uid()
           or l.closer_id = auth.uid()
           or public.is_admin())
  ) then
    raise exception 'Geen rechten om afspraken van deze lead te verplaatsen';
  end if;

  update public.appointments
    set owner_id = p_new_owner
    where lead_id = p_lead_id;
end;
$$;

grant execute on function public.move_lead_appointments(uuid, uuid) to authenticated;

-- 3) Closers zien elkaars closing-leads (voor waarneming bij afwezigheid).
--    Additieve SELECT-policy — bestaande policies blijven gewoon gelden.
drop policy if exists "closing leads zichtbaar voor closers" on public.leads;
create policy "closing leads zichtbaar voor closers" on public.leads
  for select to authenticated
  using (funnel = 'closing' and public.current_role_is('closer'));

-- Closers mogen ook elkaars closing-leads bijwerken (overnemen bij nood).
drop policy if exists "closing leads bijwerken door closers" on public.leads;
create policy "closing leads bijwerken door closers" on public.leads
  for update to authenticated
  using (funnel = 'closing' and public.current_role_is('closer'))
  with check (public.current_role_is('closer'));

-- ============================================================
-- OPTIONEEL — bestaande testkaarten hernoemen naar de nieuwe closer-kolommen.
-- Draai dit alleen als je oude closing-kaarten wilt behouden i.p.v. opnieuw
-- te importeren. Nieuwe kolomnamen (punt 8):
--   Overdragen, Voicemail, Nog niet gelezen, Terugbel afspraak,
--   Afgevallen, Inschrijving verzonden, Deal, Inschrijving ontvangen
-- ------------------------------------------------------------
-- update public.leads set stage = 'Overdragen'
--   where funnel = 'closing' and stage = 'Overgedragen';
-- update public.leads set stage = 'Terugbel afspraak'
--   where funnel = 'closing' and stage = 'Closing-afspraak';
-- update public.leads set stage = 'Nog niet gelezen'
--   where funnel = 'closing' and stage = 'Aanvullende info';
-- ============================================================
