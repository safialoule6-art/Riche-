-- ============================================================================
--  SUNAMI — Configuration Supabase (à exécuter UNE FOIS)
--  ----------------------------------------------------------------------------
--  COMMENT FAIRE :
--    1. Ouvre ton projet sur https://supabase.com
--    2. Menu de gauche → "SQL Editor" → "New query"
--    3. Colle TOUT ce fichier
--    4. Clique "Run" (en bas à droite)
--
--  Ce script active :
--    • la sauvegarde de la saga + le "cliffhanger" (relance du lendemain)
--    • la reprise multi-appareils (saga + état joueur)
--    • les abonnements push (rappels d'épisode)
--    • la sécurité (RLS) sur progress / leads / referrals / refund_requests
--
--  100% idempotent : tu peux le relancer autant de fois que tu veux, sans rien casser.
-- ============================================================================


-- ============================================================================
-- 0) TABLES DE BASE (garde-fous). "if not exists" = ne touche pas à l'existant.
-- ============================================================================

create table if not exists public.progress (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  season      integer default 1,
  episode     integer default 1,
  streak      integer default 0,
  last_active date,
  language    text,
  level       text,
  plan        text default 'free',
  updated_at  timestamptz default now()
);

create table if not exists public.leads (
  id         bigint generated always as identity primary key,
  email      text,
  source     text,
  created_at timestamptz default now()
);

create table if not exists public.referrals (
  id                bigint generated always as identity primary key,
  user_id           uuid,
  code              text,
  referred_user_id  uuid,
  status            text default 'active',
  created_at        timestamptz default now()
);

create table if not exists public.refund_requests (
  id         bigint generated always as identity primary key,
  email      text,
  reason     text,
  status     text default 'pending',
  created_at timestamptz default now()
);


-- ============================================================================
-- 1) SAGA (une par utilisateur + langue) — historique + résumé + cliffhanger
-- ============================================================================

create table if not exists public.saga (
  user_id     uuid not null references auth.users(id) on delete cascade,
  language    text not null,
  level       text,
  protagonist text,
  setting     text,
  title       text,
  recap       text default '',
  characters  jsonb default '[]'::jsonb,
  episode     integer default 1,
  chapter     integer default 0,
  history     jsonb default '[]'::jsonb,
  updated_at  timestamptz default now(),
  primary key (user_id, language)
);

-- Colonnes ajoutées après coup (jaquette + teaser de cliffhanger)
alter table public.saga add column if not exists title       text;
alter table public.saga add column if not exists cover       text;
alter table public.saga add column if not exists cover_style text;
alter table public.saga add column if not exists cliffhanger text;

alter table public.saga enable row level security;

drop policy if exists "saga_select_own" on public.saga;
drop policy if exists "saga_insert_own" on public.saga;
drop policy if exists "saga_update_own" on public.saga;
drop policy if exists "saga_delete_own" on public.saga;

create policy "saga_select_own" on public.saga
  for select using (auth.uid() = user_id);
create policy "saga_insert_own" on public.saga
  for insert with check (auth.uid() = user_id);
create policy "saga_update_own" on public.saga
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saga_delete_own" on public.saga
  for delete using (auth.uid() = user_id);


-- ============================================================================
-- 2) ÉTAT JOUEUR (durable, multi-appareils) — XP, vocab, perso, succès
-- ============================================================================

create table if not exists public.user_state (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  xp           integer default 0,
  words        jsonb default '[]'::jsonb,
  characters   jsonb default '[]'::jsonb,
  locations    jsonb default '[]'::jsonb,
  achievements jsonb default '[]'::jsonb,
  stats        jsonb default '{}'::jsonb,
  updated_at   timestamptz default now()
);

alter table public.user_state enable row level security;

drop policy if exists "user_state_select_own" on public.user_state;
drop policy if exists "user_state_insert_own" on public.user_state;
drop policy if exists "user_state_update_own" on public.user_state;

create policy "user_state_select_own" on public.user_state
  for select using (auth.uid() = user_id);
create policy "user_state_insert_own" on public.user_state
  for insert with check (auth.uid() = user_id);
create policy "user_state_update_own" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================================================
-- 3) ABONNEMENTS PUSH (rappels d'épisode) — écrits côté serveur (service_role)
-- ============================================================================

create table if not exists public.push_subscriptions (
  id           bigint generated always as identity primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  endpoint     text unique not null,
  subscription jsonb not null,
  created_at   timestamptz default now()
);
alter table public.push_subscriptions enable row level security;
-- Aucune policy publique : seul le service_role (serveur) peut lire/écrire.


-- ============================================================================
-- 4) AFFILIATION / PARRAINAGE (clics, retraits, vue de synthèse)
-- ============================================================================

alter table if exists public.referrals
  add column if not exists status        text        default 'active',
  add column if not exists converted_at  timestamptz,
  add column if not exists updated_at     timestamptz default now(),
  add column if not exists plan           text,
  add column if not exists amount_eur     numeric(10,2);

create index if not exists referrals_user_id_idx       on public.referrals (user_id);
create index if not exists referrals_referred_user_idx on public.referrals (referred_user_id);
create index if not exists referrals_code_idx          on public.referrals (code);

create table if not exists public.referral_clicks (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null,
  code        text        not null,
  ip_hash     text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists referral_clicks_user_id_idx on public.referral_clicks (user_id);
create index if not exists referral_clicks_code_idx    on public.referral_clicks (code);
create index if not exists referral_clicks_created_idx on public.referral_clicks (created_at);

create table if not exists public.payout_requests (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null,
  amount      numeric(10,2) not null default 0,
  method      text,
  destination text,
  status      text        not null default 'requested',
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);
create index if not exists payout_requests_user_id_idx on public.payout_requests (user_id);
create index if not exists payout_requests_status_idx  on public.payout_requests (status);

alter table public.referral_clicks enable row level security;
alter table public.payout_requests enable row level security;

drop policy if exists "clicks_select_own" on public.referral_clicks;
create policy "clicks_select_own" on public.referral_clicks
  for select using (auth.uid() = user_id);

drop policy if exists "payouts_select_own" on public.payout_requests;
create policy "payouts_select_own" on public.payout_requests
  for select using (auth.uid() = user_id);

drop policy if exists "payouts_insert_own" on public.payout_requests;
create policy "payouts_insert_own" on public.payout_requests
  for insert with check (auth.uid() = user_id);

create or replace view public.affiliate_summary as
select
  r.user_id,
  count(distinct c.id)                                                             as clicks,
  count(distinct r.referred_user_id) filter (where r.referred_user_id is not null) as signups,
  count(*) filter (where r.status = 'converted')                                   as sales,
  coalesce(sum(r.amount_eur) filter (where r.status = 'converted'), 0)             as revenue_eur
from public.referrals r
left join public.referral_clicks c on c.user_id = r.user_id
group by r.user_id;


-- ============================================================================
-- 5) SÉCURITÉ (RLS) — verrouille l'accès public aux données sensibles
-- ============================================================================

-- refund_requests : lu uniquement par l'admin (ton compte)
alter table public.refund_requests enable row level security;
drop policy if exists "refunds_admin_select" on public.refund_requests;
create policy "refunds_admin_select" on public.refund_requests
  for select using ((auth.jwt() ->> 'email') = 'ahmedyas09020@gmail.com');

-- referrals : chacun lit ses propres lignes
alter table public.referrals enable row level security;
drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own" on public.referrals
  for select using (auth.uid() = user_id);

-- affiliate_summary : la vue respecte la RLS de l'appelant
alter view public.affiliate_summary set (security_invoker = on);

-- progress : chaque utilisateur n'accède qu'à SA ligne
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

-- leads : insertion publique autorisée, AUCUNE lecture publique (emails protégés)
alter table public.leads enable row level security;
drop policy if exists "leads_insert_public" on public.leads;
create policy "leads_insert_public" on public.leads
  for insert with check (true);

-- ============================================================================
--  FIN. Après "Run", tu dois voir "Success. No rows returned".
--  Recharge l'app : la saga se sauvegarde, reprend sur tous tes appareils,
--  et le push du lendemain reprend le cliffhanger.
-- ============================================================================
