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
