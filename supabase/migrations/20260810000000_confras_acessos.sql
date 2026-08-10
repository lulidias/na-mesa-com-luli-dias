-- Confra das Confras — registro de acessos à página (visível só no admin)

create table if not exists public.confras_acessos (
  id bigint generated always as identity primary key,
  participante_id uuid references public.confras_participantes(id) on delete set null,
  criado_em timestamptz not null default now()
);
alter table public.confras_acessos enable row level security;
revoke all on public.confras_acessos from anon, authenticated;

create or replace function public.confras_ping(p_participante uuid default null)
returns void language sql security definer set search_path = public as $$
  insert into confras_acessos (participante_id)
  select p_participante
  where p_participante is null
     or exists (select 1 from confras_participantes where id = p_participante);
$$;
grant execute on function public.confras_ping(uuid) to anon, authenticated;

create or replace function public.confras_admin_acessos(p_token text)
returns table (nome text, quando timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform confras_admin_check(p_token);
  return query
    select coalesce(p.nome, 'Visitante'), a.criado_em
    from confras_acessos a
    left join confras_participantes p on p.id = a.participante_id
    order by a.criado_em desc
    limit 60;
end $$;

create or replace function public.confras_admin_acessos_resumo(p_token text)
returns table (hoje bigint, semana bigint, total bigint, identificados bigint)
language plpgsql security definer set search_path = public as $$
begin
  perform confras_admin_check(p_token);
  return query select
    (select count(*) from confras_acessos where criado_em > date_trunc('day', now() at time zone 'America/Recife') at time zone 'America/Recife'),
    (select count(*) from confras_acessos where criado_em > now() - interval '7 days'),
    (select count(*) from confras_acessos),
    (select count(*) from confras_acessos where participante_id is not null);
end $$;

grant execute on function public.confras_admin_acessos(text),
  public.confras_admin_acessos_resumo(text) to anon, authenticated;
