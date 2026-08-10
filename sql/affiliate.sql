-- ============================================================
--  Sunami — Schéma SQL de l'affiliation / parrainage
--  À exécuter dans Supabase → SQL Editor.
--  Idempotent : peut être relancé sans casser l'existant.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Table existante `referrals` : colonnes complémentaires
--    (le dashboard utilise converted_at / updated_at)
-- ------------------------------------------------------------
alter table if exists public.referrals
  add column if not exists status        text        default 'active',
  add column if not exists converted_at  timestamptz,
  add column if not exists updated_at     timestamptz default now(),
  add column if not exists plan           text,               -- 'sigma' | 'ultra'
  add column if not exists amount_eur     numeric(10,2);      -- montant mensuel de la vente

create index if not exists referrals_user_id_idx        on public.referrals (user_id);
create index if not exists referrals_referred_user_idx  on public.referrals (referred_user_id);
create index if not exists referrals_code_idx           on public.referrals (code);

-- ------------------------------------------------------------
-- 1. Clics sur les liens d'affiliation
-- ------------------------------------------------------------
create table if not exists public.referral_clicks (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null,          -- le parrain (propriétaire du code)
  code        text        not null,
  ip_hash     text,                          -- hash d'IP anti-fraude (optionnel)
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists referral_clicks_user_id_idx on public.referral_clicks (user_id);
create index if not exists referral_clicks_code_idx    on public.referral_clicks (code);
create index if not exists referral_clicks_created_idx on public.referral_clicks (created_at);

-- ------------------------------------------------------------
-- 2. Demandes de retrait (payouts)
-- ------------------------------------------------------------
create table if not exists public.payout_requests (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null,
  amount      numeric(10,2) not null default 0,
  method      text,                          -- 'paypal' | 'bank' | 'mobile_money'
  destination text,                          -- email PayPal / IBAN / numéro
  status      text        not null default 'requested',  -- requested | approved | paid | rejected
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);

create index if not exists payout_requests_user_id_idx on public.payout_requests (user_id);
create index if not exists payout_requests_status_idx  on public.payout_requests (status);

-- ------------------------------------------------------------
-- 3. Row Level Security
--    Le serveur (api/referral.js) écrit via la SERVICE KEY et
--    contourne la RLS. Les policies ci-dessous servent au front
--    (clé publishable) pour que chaque affilié lise SES données.
-- ------------------------------------------------------------
alter table public.referral_clicks enable row level security;
alter table public.payout_requests enable row level security;

-- referral_clicks : chacun lit ses propres clics
drop policy if exists "clicks_select_own" on public.referral_clicks;
create policy "clicks_select_own" on public.referral_clicks
  for select using (auth.uid() = user_id);

-- payout_requests : chacun lit ses propres demandes
drop policy if exists "payouts_select_own" on public.payout_requests;
create policy "payouts_select_own" on public.payout_requests
  for select using (auth.uid() = user_id);

-- payout_requests : chacun peut créer une demande pour lui-même
drop policy if exists "payouts_insert_own" on public.payout_requests;
create policy "payouts_insert_own" on public.payout_requests
  for insert with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. Vue de synthèse par affilié (pratique pour un dashboard admin)
-- ------------------------------------------------------------
create or replace view public.affiliate_summary as
select
  r.user_id,
  count(distinct c.id)                                             as clicks,
  count(distinct r.referred_user_id) filter (where r.referred_user_id is not null) as signups,
  count(*) filter (where r.status = 'converted')                  as sales,
  coalesce(sum(r.amount_eur) filter (where r.status = 'converted'), 0) as revenue_eur
from public.referrals r
left join public.referral_clicks c on c.user_id = r.user_id
group by r.user_id;

-- ============================================================
--  Fin. Rappels :
--   • Passer un referral en status='converted' + converted_at=now()
--     + amount_eur au moment d'un paiement (webhook Stripe/Dodo).
--   • Le hold anti-remboursement (30 j) et la commission (30%)
--     sont calculés côté front dans affiliate.js (objet AFF).
-- ============================================================
