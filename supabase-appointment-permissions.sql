-- ============================================================
-- Mammoetgras — afspraken beheren door iedereen die bij de lead hoort
-- Plak in de Supabase SQL-editor en klik "Run". Idempotent.
--
-- Probleem: bewerken/verwijderen van een afspraak mocht alleen door de
-- EIGENAAR (owner_id). Na een doorzet/terugpak is de eigenaar vaak een ander
-- dan wie de lead nu beheert, waardoor bewerken/verwijderen niet lukt.
--
-- Oplossing: de agent én de closer van de gekoppelde lead (plus closers en
-- admins) mogen de afspraken van die lead bewerken en verwijderen.
-- ============================================================

-- Helper: is de huidige gebruiker de agent of closer van deze lead?
-- SECURITY DEFINER → omzeilt RLS van leads, vaste search_path.
create or replace function public.is_involved_in_lead(p_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.leads l
    where l.id = p_lead_id
      and (l.agent_id = auth.uid() or l.closer_id = auth.uid())
  );
$$;

grant execute on function public.is_involved_in_lead(uuid) to authenticated;

-- UPDATE: eigenaar, betrokken bij de lead, closer, of admin.
drop policy if exists "appointments update" on public.appointments;
create policy "appointments update"
  on public.appointments for update to authenticated
  using (
    owner_id = auth.uid()
    or public.is_admin()
    or public.current_role_is('closer')
    or public.is_involved_in_lead(lead_id)
  )
  with check (
    owner_id = auth.uid()
    or public.is_admin()
    or public.current_role_is('closer')
    or public.is_involved_in_lead(lead_id)
  );

-- DELETE: eigenaar, betrokken bij de lead, closer, of admin.
drop policy if exists "appointments delete" on public.appointments;
create policy "appointments delete"
  on public.appointments for delete to authenticated
  using (
    owner_id = auth.uid()
    or public.is_admin()
    or public.current_role_is('closer')
    or public.is_involved_in_lead(lead_id)
  );
