-- ============================================================================
-- Sunami — Correctifs de sécurité (Supabase Advisor). Idempotent.
-- Les écritures se font côté SERVEUR via la service key (contourne la RLS).
-- Ces règles verrouillent l'accès public sans casser l'app.
-- ============================================================================

-- 1) refund_requests : écrit par le serveur ; lu par l'admin (compte connecté)
alter table public.refund_requests enable row level security;
drop policy if exists "refunds_admin_select" on public.refund_requests;
create policy "refunds_admin_select" on public.refund_requests
  for select using ((auth.jwt() ->> 'email') = 'ahmedyas09020@gmail.com');

-- 2) referrals : accédé côté serveur ; lecture "own" en défense en profondeur
alter table public.referrals enable row level security;
drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own" on public.referrals
  for select using (auth.uid() = user_id);

-- 3) affiliate_summary : la vue respecte la RLS de l'appelant (plus de SECURITY DEFINER)
alter view public.affiliate_summary set (security_invoker = on);

-- 4) progress : données personnelles (streak, langue, niveau, plan) — chaque
--    utilisateur n'accède qu'à SA ligne. Sans ces règles, la clé anon publique
--    permettrait de lire/écrire la progression de TOUS les comptes.
alter table public.progress enable row level security;
drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own" on public.progress
  for select using (auth.uid() = user_id);
drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own" on public.progress
  for insert with check (auth.uid() = user_id);
drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own" on public.progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5) leads : emails capturés sur la landing (utilisateur non connecté).
--    On autorise seulement l'INSERT ; aucune policy SELECT → les emails ne sont
--    JAMAIS lisibles via la clé anon (lecture réservée au service key / dashboard).
alter table public.leads enable row level security;
drop policy if exists "leads_insert_public" on public.leads;
create policy "leads_insert_public" on public.leads
  for insert with check (true);
