-- ============================================================================
-- Sunami — Analytics "first-party" : table d'evenements + retention.
-- Ecrite par le serveur (api/track.js, service key -> contourne la RLS).
-- Lue par l'admin uniquement. Idempotent.
-- ============================================================================

create table if not exists public.events (
  id          bigint generated always as identity primary key,
  ts          timestamptz not null default now(),
  event       text not null,
  visitor_id  text,
  session_id  text,
  user_id     uuid,
  path        text,
  referrer    text,
  props       jsonb default '{}'::jsonb
);

create index if not exists events_event_idx    on public.events (event);
create index if not exists events_ts_idx        on public.events (ts);
create index if not exists events_visitor_idx   on public.events (visitor_id);
create index if not exists events_user_idx      on public.events (user_id);

alter table public.events enable row level security;
-- Aucune policy publique : seul le service_role (serveur) ecrit. Lecture admin.
drop policy if exists "events_admin_select" on public.events;
create policy "events_admin_select" on public.events
  for select using ((auth.jwt() ->> 'email') = 'ahmedyas09020@gmail.com');

-- ============================================================================
-- Requetes utiles (a lancer dans le SQL editor Supabase)
-- ----------------------------------------------------------------------------
-- 1) Funnel d'acquisition des 7 derniers jours :
--    select event, count(*) as n, count(distinct visitor_id) as visitors
--    from public.events where ts > now() - interval '7 days'
--    group by event order by n desc;
--
-- 2) Activation (visiteurs ayant lu >= 1 chapitre le jour de leur 1re visite) :
--    with firsts as (
--      select visitor_id, min(ts::date) as d0 from public.events group by visitor_id)
--    select f.d0,
--           count(distinct f.visitor_id) as visiteurs,
--           count(distinct e.visitor_id) filter (where e.event = 'chapter_complete') as actives
--    from firsts f
--    left join public.events e on e.visitor_id = f.visitor_id and e.ts::date = f.d0
--    group by f.d0 order by f.d0 desc;
--
-- 3) Retention J1 / J7 (par cohorte de 1re visite) :
--    with firsts as (
--      select visitor_id, min(ts::date) as d0 from public.events group by visitor_id),
--    days as (
--      select distinct visitor_id, ts::date as d from public.events)
--    select f.d0 as cohorte,
--           count(distinct f.visitor_id) as taille,
--           count(distinct case when d.d = f.d0 + 1 then f.visitor_id end) as j1,
--           count(distinct case when d.d = f.d0 + 7 then f.visitor_id end) as j7
--    from firsts f left join days d on d.visitor_id = f.visitor_id
--    group by f.d0 order by f.d0 desc;
-- ============================================================================
