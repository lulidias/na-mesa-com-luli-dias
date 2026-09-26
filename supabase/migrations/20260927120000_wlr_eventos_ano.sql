-- eventos: o ano (a data exata muitas vezes não se sabe — a data da nota é a da última edição, não a do evento)
alter table wlr_eventos add column if not exists ano int;
update wlr_eventos set ano = extract(year from data)::int where ano is null and data is not null;

create or replace function wlr_p_eventos(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return jsonb_build_object(
    'eventos', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'tipo', e.tipo, 'ano', coalesce(e.ano, extract(year from e.data)::int), 'data', e.data,
        'titulo', e.titulo, 'local', e.local, 'texto', e.texto, 'vinhos', e.vinhos, 'dados', coalesce(e.vinhos_dados, '[]'::jsonb),
        'n_fotos', (select count(*) from wlr_album a where a.ref = 'ev-' || e.id)) order by coalesce(e.ano, extract(year from e.data)::int) desc nulls last, e.data desc nulls last, e.criado_em)
      from wlr_eventos e), '[]'::jsonb),
    'magnum', coalesce((select jsonb_agg(jsonb_build_object('ano', m.ano, 'data', m.data, 'local', m.local,
        'n', coalesce(jsonb_array_length(m.vinhos_dados), 0), 'tem_foto', m.foto is not null,
        'n_fotos', (select count(*) from wlr_album a where a.ref = 'mf-' || m.ano)) order by m.ano desc)
      from wlr_edicoes m), '[]'::jsonb),
    'fotos_por_ref', coalesce((select jsonb_object_agg(ref, n) from (select ref, count(*) n from wlr_album group by ref) x), '{}'::jsonb));
end $$;

drop function if exists wlr_admin_evento_salvar(text, uuid, text, date, text, text, text, text);
create or replace function wlr_admin_evento_salvar(p_token text, p_evento uuid, p_tipo text, p_ano int, p_data date, p_titulo text, p_local text,
  p_texto text, p_vinhos text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid; v_quem text;
begin
  v_quem := wlr_admin_check(p_token);
  if p_tipo not in ('paralela', 'ordinario', 'velhinhos') then raise exception 'Tipo de evento inválido'; end if;
  if p_evento is null then insert into wlr_eventos (tipo) values (p_tipo) returning id into v; else v := p_evento; end if;
  update wlr_eventos set tipo = p_tipo, ano = coalesce(p_ano, extract(year from p_data)::int), data = p_data,
    titulo = nullif(trim(coalesce(p_titulo, '')), ''), local = nullif(trim(coalesce(p_local, '')), ''),
    texto = nullif(trim(coalesce(p_texto, '')), ''), vinhos = nullif(trim(coalesce(p_vinhos, '')), ''), atualizado_em = now(), atualizado_por = v_quem
  where id = v;
  return v;
end $$;
