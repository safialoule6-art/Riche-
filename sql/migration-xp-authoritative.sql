-- SECURITY: server-authoritative XP awards.
create table if not exists public.xp_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  awarded integer not null default 0,
  primary key (user_id, day)
);
alter table public.xp_daily enable row level security;
revoke all on table public.xp_daily from anon, authenticated;

create or replace function public.award_xp(p_amount integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  today date := current_date;
  current_awarded integer;
  current_xp integer;
  allowed integer;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Only the rewards the application actually uses are accepted.
  if p_amount not in (3, 5, 6, 10) then
    raise exception 'invalid_xp_reward';
  end if;

  insert into public.xp_daily(user_id, day, awarded)
  values (uid, today, 0)
  on conflict (user_id, day) do nothing;

  select awarded into current_awarded
  from public.xp_daily
  where user_id = uid and day = today
  for update;

  -- Hard daily ceiling for client-triggered rewards.
  allowed := greatest(0, least(p_amount, 300 - current_awarded));
  if allowed = 0 then
    select coalesce(xp, 0) into current_xp from public.user_state where user_id = uid;
    return current_xp;
  end if;

  update public.xp_daily
  set awarded = awarded + allowed
  where user_id = uid and day = today;

  insert into public.user_state(user_id, xp, updated_at)
  values (uid, allowed, now())
  on conflict (user_id)
  do update set xp = least(coalesce(public.user_state.xp, 0) + excluded.xp, 10000000),
                updated_at = now()
  returning xp into current_xp;

  return current_xp;
end;
$$;

revoke execute on function public.award_xp(integer) from public, anon;
grant execute on function public.award_xp(integer) to authenticated;
