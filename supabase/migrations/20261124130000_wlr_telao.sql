-- Telão giratório da Magnum Fest: a carta aprovada com litros, vagas, produtor e região
-- (Os Números, Os Gráficos, A Mesa, A Vitrine). Só leitura; o site é restrito, então exige o token do organizador.
create or replace function wlr_telao_vinhos(p_token text)
returns table(id uuid, vinho text, produtor text, regiao text, safra text, formato text, litros numeric,
              vagas int, tipo text, subtipo text, pais text, foto_url text, membros text[])
language plpgsql stable security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return query
    select g.id, g.vinho, g.produtor, g.regiao, g.safra, g.formato, g.litros, g.vagas, g.tipo, g.subtipo, g.pais, g.foto_url,
           coalesce((select array_agg(p.nome order by p.nome) from wlr_garrafa_membros m
                     join wlr_participantes p on p.id = m.participante_id where m.garrafa_id = g.id), '{}')
    from wlr_garrafas g where wlr_situacao(g) = 'aprovado' order by g.vinho;
end $$;
grant execute on function wlr_telao_vinhos(text) to anon, authenticated;
