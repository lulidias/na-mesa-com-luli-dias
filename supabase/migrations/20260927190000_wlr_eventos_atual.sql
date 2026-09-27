-- eventos: a Magnum Fest do ano corrente entra na linha do tempo com a data e o lugar da wlr_config
create or replace function wlr_p_eventos(p_id uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return jsonb_build_object(
    'eventos', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'tipo', e.tipo, 'ano', coalesce(e.ano, extract(year from e.data)::int), 'data', e.data,
        'titulo', e.titulo, 'local', e.local, 'texto', e.texto, 'vinhos', e.vinhos, 'dados', coalesce(e.vinhos_dados, '[]'::jsonb),
        'presentes', coalesce(to_jsonb(e.presentes), '[]'::jsonb),
        'n_fotos', (select count(*) from wlr_album a where a.ref = 'ev-' || e.id)) order by coalesce(e.ano, extract(year from e.data)::int) desc nulls last, e.data desc nulls last, e.criado_em)
      from wlr_eventos e), '[]'::jsonb),
    'magnum', coalesce((select jsonb_agg(jsonb_build_object('ano', m.ano, 'data', m.data, 'local', m.local, 'vinhos', m.vinhos,
        'n', coalesce(jsonb_array_length(m.vinhos_dados), 0), 'tem_foto', m.foto is not null,
        'n_galeria', (select count(*) from wlr_edicao_fotos f where f.ano = m.ano),
        'n_fotos', (select count(*) from wlr_album a where a.ref = 'mf-' || m.ano)) order by m.ano desc)
      from wlr_edicoes m), '[]'::jsonb),
    'atual', (select jsonb_build_object('ano', extract(year from evento_em at time zone 'America/Recife')::int,
        'data', (evento_em at time zone 'America/Recife')::date, 'local', local_nome) from wlr_config where id = 1),
    'fotos_por_ref', coalesce((select jsonb_object_agg(ref, n) from (select ref, count(*) n from wlr_album group by ref) x), '{}'::jsonb),
    'siglas', coalesce((select jsonb_object_agg(s, c.nome) from wlr_confrades c, unnest(c.siglas) s), '{}'::jsonb));
end $$;
