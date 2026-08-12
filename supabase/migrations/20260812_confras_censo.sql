-- Censo dos membros de cada confraria (listas dos presidentes) — admin only
create table if not exists confras_censo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  confraria text not null,
  obs text,
  criado_em timestamptz default now(),
  unique (nome, confraria)
);
alter table confras_censo enable row level security;

create or replace function confras_admin_censo(p_token text)
returns table(nome text, confraria text, obs text)
language plpgsql security definer set search_path to 'public'
as $fn$
begin
  perform confras_admin_check(p_token);
  return query select c.nome, c.confraria, c.obs from confras_censo c order by c.nome, c.confraria;
end $fn$;

create or replace function confras_admin_censo_add(p_token text, p_nome text, p_confraria text, p_obs text default null)
returns void
language plpgsql security definer set search_path to 'public'
as $fn$
begin
  perform confras_admin_check(p_token);
  insert into confras_censo (nome, confraria, obs)
  values (confras_titulo(trim(p_nome)), p_confraria, nullif(trim(coalesce(p_obs, '')), ''))
  on conflict (nome, confraria) do nothing;
end $fn$;

create or replace function confras_admin_censo_del(p_token text, p_nome text, p_confraria text)
returns void
language plpgsql security definer set search_path to 'public'
as $fn$
begin
  perform confras_admin_check(p_token);
  delete from confras_censo where nome = p_nome and confraria = p_confraria;
end $fn$;
