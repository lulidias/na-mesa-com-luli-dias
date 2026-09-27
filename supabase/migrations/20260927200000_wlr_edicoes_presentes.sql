-- Magnum Fest também guarda quem esteve (além de quem levou garrafa): conta nos Números, no histórico e nos cards
alter table wlr_edicoes add column if not exists presentes text[];

CREATE OR REPLACE FUNCTION public.wlr_p_bi(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return jsonb_build_object(
    'edicoes', coalesce((select jsonb_agg(jsonb_build_object('ano', ano, 'data', data, 'vinhos', vinhos, 'dados', coalesce(vinhos_dados, '[]'::jsonb), 'presentes', coalesce(to_jsonb(presentes), '[]'::jsonb)) order by ano)
      from wlr_edicoes where vinhos is not null), '[]'::jsonb),
    'eventos', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'tipo', tipo, 'ano', coalesce(ano, extract(year from data)::int), 'titulo', titulo,
        'vinhos', vinhos, 'dados', coalesce(vinhos_dados, '[]'::jsonb), 'presentes', coalesce(to_jsonb(presentes), '[]'::jsonb))
        order by coalesce(ano, extract(year from data)::int), data, criado_em)
      from wlr_eventos where vinhos is not null or presentes is not null), '[]'::jsonb),
    'atual_ano', (select extract(year from evento_em at time zone 'America/Recife')::int from wlr_config where id = 1),
    'atual', coalesce((select jsonb_agg(jsonb_build_object('vinho', v.vinho, 'produtor', v.produtor, 'regiao', v.regiao, 'pais', v.pais,
        'tipo', v.tipo, 'subtipo', v.subtipo, 'safra', v.safra, 'membros', v.membros))
      from wlr_vinhos_publico v where v.situacao = 'aprovado'), '[]'::jsonb));
end $function$

;
CREATE OR REPLACE FUNCTION public.wlr_admin_todos_eventos(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform wlr_admin_check(p_token);
  return jsonb_build_object(
    'magnum', coalesce((select jsonb_agg(jsonb_build_object('ano', ano, 'data', data, 'local', local, 'texto', texto, 'vinhos', vinhos,
        'dados', coalesce(vinhos_dados, '[]'::jsonb), 'presentes', coalesce(to_jsonb(presentes), '[]'::jsonb), 'tem_foto', foto is not null,
        'n_galeria', (select count(*) from wlr_edicao_fotos f where f.ano = e.ano),
        'n_album', (select count(*) from wlr_album a where a.ref = 'mf-' || e.ano)) order by ano desc) from wlr_edicoes e), '[]'::jsonb),
    'eventos', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'tipo', tipo, 'ano', ano, 'data', data, 'titulo', titulo, 'local', local,
        'texto', texto, 'vinhos', vinhos, 'dados', coalesce(vinhos_dados, '[]'::jsonb), 'presentes', coalesce(to_jsonb(presentes), '[]'::jsonb),
        'n_album', (select count(*) from wlr_album a where a.ref = 'ev-' || ev.id)) order by ano desc nulls last, data desc nulls last, criado_em desc) from wlr_eventos ev), '[]'::jsonb));
end $function$

;
create or replace function wlr_p_eventos(p_id uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return jsonb_build_object(
    'eventos', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'tipo', e.tipo, 'ano', coalesce(e.ano, extract(year from e.data)::int), 'data', e.data,
        'titulo', e.titulo, 'local', e.local, 'texto', e.texto, 'vinhos', e.vinhos, 'dados', coalesce(e.vinhos_dados, '[]'::jsonb),
        'presentes', coalesce(to_jsonb(e.presentes), '[]'::jsonb),
        'n_fotos', (select count(*) from wlr_album a where a.ref = 'ev-' || e.id)) order by coalesce(e.ano, extract(year from e.data)::int) desc nulls last, e.data desc nulls last, e.criado_em)
      from wlr_eventos e), '[]'::jsonb),
    'magnum', coalesce((select jsonb_agg(jsonb_build_object('ano', m.ano, 'data', m.data, 'local', m.local, 'vinhos', m.vinhos, 'presentes', coalesce(to_jsonb(m.presentes), '[]'::jsonb),
        'n', coalesce(jsonb_array_length(m.vinhos_dados), 0), 'tem_foto', m.foto is not null,
        'n_galeria', (select count(*) from wlr_edicao_fotos f where f.ano = m.ano),
        'n_fotos', (select count(*) from wlr_album a where a.ref = 'mf-' || m.ano)) order by m.ano desc)
      from wlr_edicoes m), '[]'::jsonb),
    'atual', (select jsonb_build_object('ano', extract(year from evento_em at time zone 'America/Recife')::int,
        'data', (evento_em at time zone 'America/Recife')::date, 'local', local_nome) from wlr_config where id = 1),
    'fotos_por_ref', coalesce((select jsonb_object_agg(ref, n) from (select ref, count(*) n from wlr_album group by ref) x), '{}'::jsonb),
    'siglas', coalesce((select jsonb_object_agg(s, c.nome) from wlr_confrades c, unnest(c.siglas) s), '{}'::jsonb));
end $$;

create or replace function wlr_admin_edicao_presentes(p_token text, p_ano int, p_presentes text[]) returns void
language plpgsql security definer set search_path = public as $$
declare v text[];
begin
  perform wlr_admin_check(p_token);
  select array_agg(distinct btrim(x)) filter (where btrim(x) <> '') into v from unnest(coalesce(p_presentes, '{}')) x;
  update wlr_edicoes set presentes = v where ano = p_ano;
end $$;

-- José Pedroza esteve em 2016, 2017 e 2019 sem garrafa na lista (nas outras edições dele já há linha PDZ)
update wlr_edicoes set presentes = array(select distinct unnest(coalesce(presentes, '{}') || array['José Pedroza'])) where ano in (2016, 2017, 2019);
