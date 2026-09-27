-- capa de cada encontro: uma foto do álbum escolhida no painel (vazio = foto oficial na Magnum Fest; senão a primeira do álbum)
alter table wlr_eventos add column if not exists capa bigint references wlr_album(id) on delete set null;
alter table wlr_edicoes add column if not exists capa bigint references wlr_album(id) on delete set null;

CREATE OR REPLACE FUNCTION public.wlr_p_eventos(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return jsonb_build_object(
    'eventos', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'tipo', e.tipo, 'ano', coalesce(e.ano, extract(year from e.data)::int), 'data', e.data,
        'titulo', e.titulo, 'local', e.local, 'texto', e.texto, 'vinhos', e.vinhos, 'dados', coalesce(e.vinhos_dados, '[]'::jsonb),
        'presentes', coalesce(to_jsonb(e.presentes), '[]'::jsonb), 'capa', e.capa,
        'n_fotos', (select count(*) from wlr_album a where a.ref = 'ev-' || e.id)) order by coalesce(e.ano, extract(year from e.data)::int) desc nulls last, e.data desc nulls last, e.criado_em)
      from wlr_eventos e), '[]'::jsonb),
    'magnum', coalesce((select jsonb_agg(jsonb_build_object('ano', m.ano, 'data', m.data, 'local', m.local, 'vinhos', m.vinhos, 'presentes', coalesce(to_jsonb(m.presentes), '[]'::jsonb), 'capa', m.capa,
        'n', coalesce(jsonb_array_length(m.vinhos_dados), 0), 'tem_foto', m.foto is not null,
        'n_galeria', (select count(*) from wlr_edicao_fotos f where f.ano = m.ano),
        'n_fotos', (select count(*) from wlr_album a where a.ref = 'mf-' || m.ano)) order by m.ano desc)
      from wlr_edicoes m), '[]'::jsonb),
    'atual', (select jsonb_build_object('ano', extract(year from evento_em at time zone 'America/Recife')::int,
        'data', (evento_em at time zone 'America/Recife')::date, 'local', local_nome) from wlr_config where id = 1),
    'fotos_por_ref', coalesce((select jsonb_object_agg(ref, n) from (select ref, count(*) n from wlr_album group by ref) x), '{}'::jsonb),
    'siglas', coalesce((select jsonb_object_agg(s, c.nome) from wlr_confrades c, unnest(c.siglas) s), '{}'::jsonb));
end $function$;

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
        'dados', coalesce(vinhos_dados, '[]'::jsonb), 'presentes', coalesce(to_jsonb(presentes), '[]'::jsonb), 'tem_foto', foto is not null, 'capa', capa,
        'n_galeria', (select count(*) from wlr_edicao_fotos f where f.ano = e.ano),
        'n_album', (select count(*) from wlr_album a where a.ref = 'mf-' || e.ano)) order by ano desc) from wlr_edicoes e), '[]'::jsonb),
    'eventos', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'tipo', tipo, 'ano', ano, 'data', data, 'titulo', titulo, 'local', local,
        'texto', texto, 'vinhos', vinhos, 'dados', coalesce(vinhos_dados, '[]'::jsonb), 'presentes', coalesce(to_jsonb(presentes), '[]'::jsonb), 'capa', capa,
        'n_album', (select count(*) from wlr_album a where a.ref = 'ev-' || ev.id)) order by ano desc nulls last, data desc nulls last, criado_em desc) from wlr_eventos ev), '[]'::jsonb));
end $function$;

create or replace function wlr_admin_capa(p_token text, p_ref text, p_album bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  if p_album is not null and not exists (select 1 from wlr_album where id = p_album and ref = p_ref) then raise exception 'Foto não pertence a este encontro'; end if;
  if p_ref ~ '^mf-\d{4}$' then update wlr_edicoes set capa = p_album where ano = substr(p_ref, 4)::int;
  elsif p_ref ~ '^ev-' then update wlr_eventos set capa = p_album where id = substr(p_ref, 4)::uuid;
  else raise exception 'Encontro inválido'; end if;
end $$;
