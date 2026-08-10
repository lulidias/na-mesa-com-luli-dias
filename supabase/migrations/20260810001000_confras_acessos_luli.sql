-- Confra das Confras — acessos visíveis SÓ para o token superior (do Luli)
-- token real definido direto no banco (repo é público — placeholder aqui)

alter table public.confras_config add column if not exists acessos_token text;

-- o token superior também vale como token admin comum
create or replace function public.confras_admin_check(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from confras_config
                 where id = 1 and (admin_token = p_token or acessos_token = p_token)) then
    raise exception 'Token inválido';
  end if;
end $$;

create or replace function public.confras_acessos_check(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from confras_config where id = 1 and acessos_token = p_token) then
    raise exception 'Restrito ao organizador';
  end if;
end $$;

create or replace function public.confras_admin_acessos(p_token text)
returns table (nome text, quando timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform confras_acessos_check(p_token);
  return query
    select coalesce(p.nome, 'Visitante'), a.criado_em
    from confras_acessos a
    left join confras_participantes p on p.id = a.participante_id
    order by a.criado_em desc limit 60;
end $$;

create or replace function public.confras_admin_acessos_resumo(p_token text)
returns table (hoje bigint, semana bigint, total bigint, identificados bigint)
language plpgsql security definer set search_path = public as $$
begin
  perform confras_acessos_check(p_token);
  return query select
    (select count(*) from confras_acessos where criado_em > date_trunc('day', now() at time zone 'America/Recife') at time zone 'America/Recife'),
    (select count(*) from confras_acessos where criado_em > now() - interval '7 days'),
    (select count(*) from confras_acessos),
    (select count(*) from confras_acessos where participante_id is not null);
end $$;
