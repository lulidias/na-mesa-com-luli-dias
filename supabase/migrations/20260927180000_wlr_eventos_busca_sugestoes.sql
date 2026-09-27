-- Página de eventos: busca em todas as listas (inclui as Magnum Fests) e "sei a data / tenho fotos" dos confrades.

-- o que os confrades sabem de um encontro (data, lugar, quem estava…) e o conselho confere no painel
create table if not exists wlr_evento_sugestoes (
  id bigserial primary key,
  ref text not null,                 -- 'mf-2019' ou 'ev-<uuid>'
  autor_id uuid references wlr_participantes(id) on delete set null,
  autor_nome text,
  texto text not null,
  criado_em timestamptz not null default now(),
  resolvida boolean not null default false,
  resolvida_em timestamptz,
  resolvida_por text
);
alter table wlr_evento_sugestoes enable row level security;

create or replace function wlr_p_evento_sugerir(p_id uuid, p_ref text, p_texto text) returns void
language plpgsql security definer set search_path = public as $$
declare v_nome text; v_t text := btrim(coalesce(p_texto, ''));
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  if v_t = '' then raise exception 'Escreva o que você sabe sobre o encontro'; end if;
  if length(v_t) > 1500 then raise exception 'Texto muito longo'; end if;
  if not (p_ref ~ '^mf-\d{4}$' and exists (select 1 from wlr_edicoes where ano = substr(p_ref, 4)::int)
       or p_ref ~ '^ev-[0-9a-f-]{36}$' and exists (select 1 from wlr_eventos where id = substr(p_ref, 4)::uuid)) then
    raise exception 'Encontro não encontrado';
  end if;
  if (select count(*) from wlr_evento_sugestoes where autor_id = p_id and criado_em > now() - interval '1 hour') >= 20 then
    raise exception 'Muitas mensagens seguidas. Tente de novo mais tarde.';
  end if;
  select coalesce(c.nome, p.nome) into v_nome from wlr_participantes p left join wlr_confrades c on c.participante_id = p.id where p.id = p_id;
  insert into wlr_evento_sugestoes (ref, autor_id, autor_nome, texto) values (p_ref, p_id, v_nome, v_t);
end $$;

create or replace function wlr_admin_sugestoes(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'ref', s.ref, 'autor', s.autor_nome, 'texto', s.texto, 'criado_em', s.criado_em,
      'resolvida', s.resolvida, 'evento', case when s.ref like 'mf-%' then 'Magnum Fest ' || substr(s.ref, 4)
        else (select coalesce(e.titulo, 'Encontro') || coalesce(' (' || coalesce(e.ano, extract(year from e.data)::int) || ')', '') from wlr_eventos e where 'ev-' || e.id = s.ref) end)
      order by s.resolvida, s.criado_em desc)
    from wlr_evento_sugestoes s where not s.resolvida or s.resolvida_em > now() - interval '30 days'), '[]'::jsonb);
end $$;

create or replace function wlr_admin_sugestao_resolver(p_token text, p_sugestao bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_quem text;
begin
  v_quem := wlr_admin_check(p_token);
  update wlr_evento_sugestoes set resolvida = true, resolvida_em = now(), resolvida_por = v_quem where id = p_sugestao;
end $$;

-- eventos: as Magnum Fests passam a trazer a lista (para a busca) e o mapa sigla → nome
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
    'fotos_por_ref', coalesce((select jsonb_object_agg(ref, n) from (select ref, count(*) n from wlr_album group by ref) x), '{}'::jsonb),
    'siglas', coalesce((select jsonb_object_agg(s, c.nome) from wlr_confrades c, unnest(c.siglas) s), '{}'::jsonb));
end $$;
