-- ============================================================================
-- Sunami — Persistance de la saga & de l'état joueur (à exécuter dans Supabase)
-- ----------------------------------------------------------------------------
-- Corrige : (1) l'histoire qui "repart au hasard" -> on persiste l'historique
-- + un résumé glissant ("recap") par (user, langue) ; (2) tout ce qui s'efface
-- à la déconnexion -> XP, vocabulaire, personnages, lieux, succès en base.
-- Idempotent : peut être ré-exécuté sans risque.
-- ============================================================================

-- ========================= SAGA (une par user + langue) =====================
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

-- Colonnes ajoutées après coup (idempotent) : cover d'épisode + teaser de cliffhanger
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

-- ==================== ÉTAT JOUEUR (durable, multi-appareils) =================
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
-- Ajouts : jaquette/titre de saga + abonnements push (rappels d'épisode)
-- Idempotent — ré-exécutable sans risque.
-- ============================================================================

-- Colonne titre de saga (jaquette de série)
alter table public.saga add column if not exists title       text;

-- Abonnements push (écrits par le serveur via service_role ; RLS verrouillé)
create table if not exists public.push_subscriptions (
  id           bigint generated always as identity primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  endpoint     text unique not null,
  subscription jsonb not null,
  created_at   timestamptz default now()
);
alter table public.push_subscriptions enable row level security;
-- Aucune policy publique : seul le service_role (côté serveur) peut lire/écrire.
