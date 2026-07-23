-- ============================================================
-- Agents mogen closing-board inzien + owner history
-- Voer dit uit in de Supabase SQL Editor
-- ============================================================

-- 1. Owner history kolom op leads
alter table public.leads
  add column if not exists owner_history jsonb not null default '[]';

-- 2. Trigger die ownership-wijzigingen logt
create or replace function public.log_owner_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  history jsonb;
  entry jsonb;
begin
  history := coalesce(new.owner_history, '[]'::jsonb);

  -- Doorgezet naar closer
  if new.closer_id is distinct from old.closer_id and new.closer_id is not null then
    entry := jsonb_build_object(
      'action', 'doorgezet',
      'from', old.agent_id,
      'to', new.closer_id,
      'at', now()
    );
    history := history || jsonb_build_array(entry);
  end if;

  -- Teruggenomen van closer
  if old.funnel = 'closing' and new.funnel = 'agent'
     and old.closer_id is not null then
    entry := jsonb_build_object(
      'action', 'teruggenomen',
      'from', old.closer_id,
      'to', new.agent_id,
      'at', now()
    );
    history := history || jsonb_build_array(entry);
  end if;

  new.owner_history := history;
  return new;
end;
$$;

drop trigger if exists trg_log_owner on public.leads;
create trigger trg_log_owner before update on public.leads
  for each row execute function public.log_owner_change();

-- 3. Agents mogen closing-leads ZIEN (read-only via RLS)
drop policy if exists "leads select (eigen/toegewezen/admin)" on public.leads;
create policy "leads select (eigen/toegewezen/admin/agent-closing)"
  on public.leads for select to authenticated
  using (
    agent_id = auth.uid()
    or closer_id = auth.uid()
    or public.is_admin()
    or (funnel = 'closing' and public.current_role_is('agent'))
  );

-- 4. Agents mogen hun EIGEN leads terugpakken (update agent_id=zichzelf, funnel=agent)
--    De bestaande update-policy staat dit al toe (agent_id = auth.uid() mag updaten).
--    Geen wijziging nodig.
