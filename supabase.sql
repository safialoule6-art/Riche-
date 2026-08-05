-- supabase.sql
-- À exécuter une fois dans Supabase → SQL Editor pour activer l'entitlement "Sunami Super"
-- de façon fiable côté serveur (via le webhook InflowPay).

-- 1) Colonnes premium sur la table de progression existante
alter table if exists progress add column if not exists premium boolean default false;
alter table if exists progress add column if not exists premium_until timestamptz;

-- 2) Table de correspondance paiement -> utilisateur (remplie par /api/create-payment,
--    lue et mise à jour par /api/inflow-webhook)
create table if not exists payments (
  id         text primary key,        -- paymentId (ou sessionId) renvoyé par InflowPay
  user_id    uuid,
  status     text default 'pending',  -- pending | paid
  created_at timestamptz default now()
);

-- 3) RLS : ces tables ne sont écrites que par la clé service_role (webhook/serveur),
--    qui contourne RLS. On autorise juste l'utilisateur à LIRE sa propre ligne payments si besoin.
alter table payments enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'payments' and policyname = 'read own payments') then
    create policy "read own payments" on payments for select using (auth.uid() = user_id);
  end if;
end $$;

-- NB : la lecture du statut premium se fait via la table `progress` que le client lit déjà
-- (assure-toi que la policy SELECT de `progress` autorise l'utilisateur à lire sa propre ligne).
