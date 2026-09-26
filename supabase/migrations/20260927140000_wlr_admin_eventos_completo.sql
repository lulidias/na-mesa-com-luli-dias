-- Painel: editor completo de eventos (Magnum Fest + paralela/ordinário/velhinhos), com as garrafas classificadas pelo conselho.
-- vinhos (texto "SIGLA - Vinho") continua sendo o que as páginas leem; vinhos_dados guarda a classificação de cada garrafa (chave = "v").

create or replace function wlr_admin_todos_eventos(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return jsonb_build_object(
    'magnum', coalesce((select jsonb_agg(jsonb_build_object('ano', ano, 'data', data, 'local', local, 'texto', texto, 'vinhos', vinhos,
        'dados', coalesce(vinhos_dados, '[]'::jsonb), 'tem_foto', foto is not null,
        'n_galeria', (select count(*) from wlr_edicao_fotos f where f.ano = e.ano),
        'n_album', (select count(*) from wlr_album a where a.ref = 'mf-' || e.ano)) order by ano desc) from wlr_edicoes e), '[]'::jsonb),
    'eventos', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'tipo', tipo, 'ano', ano, 'data', data, 'titulo', titulo, 'local', local,
        'texto', texto, 'vinhos', vinhos, 'dados', coalesce(vinhos_dados, '[]'::jsonb),
        'n_album', (select count(*) from wlr_album a where a.ref = 'ev-' || ev.id)) order by ano desc nulls last, data desc nulls last, criado_em desc) from wlr_eventos ev), '[]'::jsonb));
end $$;

-- evento (paralela/ordinário/velhinhos) com as garrafas classificadas
create or replace function wlr_admin_evento_gravar(p_token text, p_evento uuid, p_tipo text, p_ano int, p_data date, p_titulo text, p_local text,
  p_texto text, p_vinhos text, p_dados jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  v := wlr_admin_evento_salvar(p_token, p_evento, p_tipo, p_ano, p_data, p_titulo, p_local, p_texto, p_vinhos);
  update wlr_eventos set vinhos_dados = case when jsonb_typeof(p_dados) = 'array' then p_dados else vinhos_dados end where id = v;
  return v;
end $$;

-- Magnum Fest (edição) com as garrafas classificadas; p_foto: null = mantém, '' = remove, data URL = troca
create or replace function wlr_admin_edicao_gravar(p_token text, p_ano int, p_ano_antigo int, p_data date, p_local text, p_texto text,
  p_vinhos text, p_dados jsonb, p_foto text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_edicao_salvar(p_token, p_ano, p_data, p_local, p_texto, p_vinhos, p_foto, p_ano_antigo);
  update wlr_edicoes set vinhos_dados = case when jsonb_typeof(p_dados) = 'array' then p_dados else vinhos_dados end where ano = p_ano;
end $$;

-- confrades e siglas para o seletor do editor
create or replace function wlr_admin_siglas(p_token text) returns table(sigla text, nome text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return query select s, c.nome from wlr_confrades c, unnest(c.siglas) s order by c.nome, s;
end $$;
