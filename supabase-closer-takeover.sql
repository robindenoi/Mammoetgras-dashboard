-- ============================================================
-- Closers mogen elkaars afspraken overnemen
-- Voer dit uit in de Supabase SQL Editor
-- ============================================================

-- Bestaande update-policy vervangen: closers mogen nu ook elkaars
-- afspraken updaten (voor het "overnemen" van afspraken).
drop policy if exists "appointments update" on public.appointments;
create policy "appointments update"
  on public.appointments for update to authenticated
  using (
    owner_id = auth.uid()
    or public.current_role_is('closer')
    or public.is_admin()
  )
  with check (
    owner_id = auth.uid()
    or public.current_role_is('closer')
    or public.is_admin()
  );
