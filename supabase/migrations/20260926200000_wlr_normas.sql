-- Página da confraria: normas e deveres dos membros (uma por linha, editável no painel).
alter table wlr_config add column if not exists confraria_normas text;

create or replace function wlr__confraria(p_com_foto boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'texto', (select confraria_texto from wlr_config where id = 1),
    'normas', (select confraria_normas from wlr_config where id = 1),
    'playlist', (select playlist_url from wlr_config where id = 1),
    'edicoes', coalesce((select jsonb_agg(jsonb_build_object('ano', e.ano, 'data', e.data, 'local', e.local, 'texto', e.texto,
        'vinhos', e.vinhos, 'tem_foto', e.foto is not null,
        'n_fotos', (select count(*) from wlr_edicao_fotos f where f.ano = e.ano)) order by e.ano desc) from wlr_edicoes e), '[]'::jsonb));
$$;
revoke execute on function wlr__confraria(boolean) from public, anon, authenticated;

create or replace function wlr_admin_normas_salvar(p_token text, p_normas text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  update wlr_config set confraria_normas = nullif(trim(coalesce(p_normas, '')), '') where id = 1;
end $$;

update wlr_config set confraria_normas = $n$Gostar muito de vinho.
Respeitar o confrade WLR sempre.
Comparecer sempre que puder aos encontros.
Ser desprendido ao compartilhar seu vinho.
Cuidado ao divulgar o WLR, para não expor a si próprio e a um confrade.
Evitar usar palavras de baixo calão no chat.
Abastecer a confraria com informações sobre o vinho e seu universo.
Ter sensibilidade e cuidado com as postagens e comentários da confraria.
Ao discutir e discorrer sobre o vinho de um confrade, sempre procurar o respeito e a educação como mote.
Procurar sempre que a harmonia seja o ambiente da confraria.$n$
where id = 1 and confraria_normas is null;
