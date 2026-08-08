-- A Confra das Confras — votação pós-festa por categorias

alter table public.confras_garrafas add column if not exists tipo text not null default 'Tinto';

alter table public.confras_config add column if not exists votacao_aberta boolean not null default false;
alter table public.confras_config add column if not exists resultados_publicos boolean not null default false;

create table if not exists public.confras_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo_filtro text,              -- null = todos os vinhos concorrem
  ordem int not null default 0
);

create table if not exists public.confras_votos (
  categoria_id uuid not null references public.confras_categorias(id) on delete cascade,
  participante_id uuid not null references public.confras_participantes(id) on delete cascade,
  garrafa_id uuid not null references public.confras_garrafas(id) on delete cascade,
  votado_em timestamptz not null default now(),
  primary key (categoria_id, participante_id)
);

alter table public.confras_categorias enable row level security;
alter table public.confras_votos enable row level security;
revoke all on public.confras_categorias, public.confras_votos from anon, authenticated;

insert into public.confras_categorias (nome, tipo_filtro, ordem)
select v.nome, v.tipo, v.ordem
from (values
  ('Melhor Vinho da Festa', null::text, 1),
  ('Melhor Tinto', 'Tinto', 2),
  ('Melhor Branco', 'Branco', 3),
  ('Melhor Espumante', 'Espumante', 4)
) as v(nome, tipo, ordem)
where not exists (select 1 from public.confras_categorias);

-- views públicas
create or replace view public.confras_categorias_publicas as
  select id, nome, tipo_filtro, ordem from public.confras_categorias order by ordem, nome;

drop view if exists public.confras_vinhos_publico;
create view public.confras_vinhos_publico as
  select g.id, g.vinho, g.produtor, g.safra, g.formato, g.tipo, g.litros, g.vagas,
         coalesce(array_agg(p.nome order by p.nome) filter (where p.nome is not null), '{}') as membros,
         g.vagas - count(m.participante_id)::int as vagas_restantes
  from public.confras_garrafas g
  left join public.confras_garrafa_membros m on m.garrafa_id = g.id
  left join public.confras_participantes p on p.id = m.participante_id
  group by g.id
  order by g.litros desc, g.criado_em;

grant select on public.confras_categorias_publicas, public.confras_vinhos_publico to anon, authenticated;

create or replace view public.confras_config_publica as
  select chave_pix, nome_pix, valor_rateio, rsvp_aberto, votacao_aberta, resultados_publicos
  from public.confras_config;
grant select on public.confras_config_publica to anon, authenticated;

-- add_garrafa agora com tipo (substitui a assinatura antiga)
drop function if exists public.confras_add_garrafa(uuid, text, text, text, text, numeric, int);
create or replace function public.confras_add_garrafa(
  p_participante uuid, p_vinho text, p_produtor text, p_safra text,
  p_formato text, p_litros numeric, p_vagas int, p_tipo text default 'Tinto'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not exists (select 1 from confras_participantes where id = p_participante) then
    raise exception 'Participante não encontrado';
  end if;
  if coalesce(trim(p_vinho), '') = '' then raise exception 'Informe o vinho'; end if;
  insert into confras_garrafas (vinho, produtor, safra, formato, litros, vagas, tipo, criado_por)
  values (trim(p_vinho), nullif(trim(p_produtor), ''), nullif(trim(p_safra), ''),
          p_formato, p_litros, greatest(p_vagas, 1), coalesce(nullif(trim(p_tipo), ''), 'Tinto'), p_participante)
  returning id into v_id;
  insert into confras_garrafa_membros (garrafa_id, participante_id) values (v_id, p_participante);
  return v_id;
end $$;

-- votar (uma vez por categoria; pode trocar enquanto aberta)
create or replace function public.confras_votar(p_participante uuid, p_categoria uuid, p_garrafa uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_filtro text; v_tipo text;
begin
  if not (select votacao_aberta from confras_config where id = 1) then
    raise exception 'A votação não está aberta';
  end if;
  if not exists (select 1 from confras_participantes where id = p_participante) then
    raise exception 'Participante não encontrado';
  end if;
  select tipo_filtro into v_filtro from confras_categorias where id = p_categoria;
  select tipo into v_tipo from confras_garrafas where id = p_garrafa;
  if v_tipo is null then raise exception 'Garrafa não encontrada'; end if;
  if v_filtro is not null and v_tipo <> v_filtro then
    raise exception 'Este vinho não concorre nesta categoria';
  end if;
  insert into confras_votos (categoria_id, participante_id, garrafa_id)
  values (p_categoria, p_participante, p_garrafa)
  on conflict (categoria_id, participante_id) do update set garrafa_id = excluded.garrafa_id, votado_em = now();
end $$;

create or replace function public.confras_meus_votos(p_participante uuid)
returns table (categoria_id uuid, garrafa_id uuid)
language sql security definer set search_path = public as $$
  select categoria_id, garrafa_id from confras_votos where participante_id = p_participante;
$$;

-- resultados: públicos só quando o admin liberar
create or replace function public.confras_resultados()
returns table (categoria_id uuid, categoria text, garrafa_id uuid, vinho text, safra text,
               tipo text, formato text, membros text[], votos bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not (select resultados_publicos from confras_config where id = 1) then
    raise exception 'Os resultados ainda não foram divulgados';
  end if;
  return query
    select c.id, c.nome, g.id, g.vinho, g.safra, g.tipo, g.formato,
           coalesce((select array_agg(p.nome order by p.nome) from confras_garrafa_membros m
                     join confras_participantes p on p.id = m.participante_id
                     where m.garrafa_id = g.id), '{}'),
           count(v.participante_id)
    from confras_categorias c
    join confras_votos v on v.categoria_id = c.id
    join confras_garrafas g on g.id = v.garrafa_id
    group by c.id, c.nome, c.ordem, g.id
    order by c.ordem, count(v.participante_id) desc, g.vinho;
end $$;

create or replace function public.confras_admin_resultados(p_token text)
returns table (categoria_id uuid, categoria text, garrafa_id uuid, vinho text, safra text,
               tipo text, formato text, membros text[], votos bigint)
language plpgsql security definer set search_path = public as $$
begin
  perform confras_admin_check(p_token);
  return query
    select c.id, c.nome, g.id, g.vinho, g.safra, g.tipo, g.formato,
           coalesce((select array_agg(p.nome order by p.nome) from confras_garrafa_membros m
                     join confras_participantes p on p.id = m.participante_id
                     where m.garrafa_id = g.id), '{}'),
           count(v.participante_id)
    from confras_categorias c
    join confras_votos v on v.categoria_id = c.id
    join confras_garrafas g on g.id = v.garrafa_id
    group by c.id, c.nome, c.ordem, g.id
    order by c.ordem, count(v.participante_id) desc, g.vinho;
end $$;

create or replace function public.confras_admin_categoria_add(p_token text, p_nome text, p_tipo text, p_ordem int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform confras_admin_check(p_token);
  insert into confras_categorias (nome, tipo_filtro, ordem) values (trim(p_nome), nullif(trim(coalesce(p_tipo,'')), ''), coalesce(p_ordem, 99));
end $$;

create or replace function public.confras_admin_categoria_del(p_token text, p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform confras_admin_check(p_token);
  delete from confras_categorias where id = p_id;
end $$;

-- votação aberta/resultados no config do admin
-- (drop da assinatura antiga para evitar ambiguidade de overload no PostgREST)
drop function if exists public.confras_admin_config(text, text, text, numeric, boolean);
create or replace function public.confras_admin_config(
  p_token text, p_chave_pix text, p_nome_pix text, p_valor numeric, p_aberto boolean,
  p_votacao boolean default null, p_resultados boolean default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform confras_admin_check(p_token);
  update confras_config
  set chave_pix = p_chave_pix, nome_pix = p_nome_pix, valor_rateio = p_valor, rsvp_aberto = p_aberto,
      votacao_aberta = coalesce(p_votacao, votacao_aberta),
      resultados_publicos = coalesce(p_resultados, resultados_publicos)
  where id = 1;
end $$;

grant execute on function
  public.confras_add_garrafa(uuid, text, text, text, text, numeric, int, text),
  public.confras_votar(uuid, uuid, uuid), public.confras_meus_votos(uuid),
  public.confras_resultados(), public.confras_admin_resultados(text),
  public.confras_admin_categoria_add(text, text, text, int),
  public.confras_admin_categoria_del(text, uuid),
  public.confras_admin_config(text, text, text, numeric, boolean, boolean, boolean)
to anon, authenticated;
