-- Magnum Fest em números: dados de todas as edições (classificação em wlr_edicoes.vinhos_dados) + as Magnums aprovadas da edição atual.
alter table wlr_edicoes add column if not exists vinhos_dados jsonb;

create or replace function wlr_p_bi(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return jsonb_build_object(
    'edicoes', coalesce((select jsonb_agg(jsonb_build_object('ano', ano, 'data', data, 'vinhos', vinhos, 'dados', coalesce(vinhos_dados, '[]'::jsonb)) order by ano)
      from wlr_edicoes where vinhos is not null), '[]'::jsonb),
    'atual_ano', (select extract(year from evento_em at time zone 'America/Recife')::int from wlr_config where id = 1),
    'atual', coalesce((select jsonb_agg(jsonb_build_object('vinho', v.vinho, 'produtor', v.produtor, 'regiao', v.regiao, 'pais', v.pais,
        'tipo', v.tipo, 'subtipo', v.subtipo, 'safra', v.safra, 'membros', v.membros))
      from wlr_vinhos_publico v where v.situacao = 'aprovado'), '[]'::jsonb));
end $$;
