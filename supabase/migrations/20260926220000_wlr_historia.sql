-- Página da confraria: a história (texto do fundador, assinatura e a foto do primeiro encontro).
alter table wlr_config add column if not exists historia_texto text, add column if not exists historia_assinatura text,
  add column if not exists historia_foto text, add column if not exists historia_legenda text;

create or replace function wlr__confraria(p_com_foto boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'texto', c.confraria_texto, 'normas', c.confraria_normas, 'playlist', c.playlist_url,
    'historia', c.historia_texto, 'historia_assinatura', c.historia_assinatura, 'historia_legenda', c.historia_legenda,
    'historia_tem_foto', c.historia_foto is not null,
    'edicoes', coalesce((select jsonb_agg(jsonb_build_object('ano', e.ano, 'data', e.data, 'local', e.local, 'texto', e.texto,
        'vinhos', e.vinhos, 'tem_foto', e.foto is not null,
        'n_fotos', (select count(*) from wlr_edicao_fotos f where f.ano = e.ano)) order by e.ano desc) from wlr_edicoes e), '[]'::jsonb))
  from wlr_config c where c.id = 1;
$$;
revoke execute on function wlr__confraria(boolean) from public, anon, authenticated;

create or replace function wlr_p_historia_foto(p_id uuid) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return (select historia_foto from wlr_config where id = 1);
end $$;

create or replace function wlr_admin_historia_foto(p_token text) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return (select historia_foto from wlr_config where id = 1);
end $$;

-- p_foto: null = mantém; '' = remove; data URL = troca
create or replace function wlr_admin_historia_salvar(p_token text, p_texto text, p_assinatura text, p_legenda text, p_foto text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  if p_foto is not null and p_foto <> '' and p_foto !~ '^data:image/(jpeg|png|webp);base64,' then raise exception 'Foto inválida'; end if;
  if p_foto is not null and length(p_foto) > 3000000 then raise exception 'Foto grande demais'; end if;
  update wlr_config set historia_texto = nullif(trim(coalesce(p_texto, '')), ''),
    historia_assinatura = nullif(trim(coalesce(p_assinatura, '')), ''), historia_legenda = nullif(trim(coalesce(p_legenda, '')), ''),
    historia_foto = case when p_foto is null then historia_foto else nullif(p_foto, '') end where id = 1;
end $$;

update wlr_config set
  historia_texto = $h$Começou assim de forma despretensiosa, em torno do vinho.
O tempo foi passando e outros foram chegando.
Em cada encontro uma cumplicidade. Em cada vinho uma descoberta.
A cada degustação nosso propósito e harmonia vão se fortalecendo em torno do vinho.
Vamos assim, de taça em taça, embebedando nossa fraternidade.
Não buscamos notoriedade nem holofotes o que temos mesmo é muita sede...$h$,
  historia_assinatura = 'Álvaro Mendonça Neto, fundador',
  historia_legenda = 'O primeiro encontro · 28 de julho de 2016'
where id = 1 and historia_texto is null;

update wlr_presidentes set periodo = 'Fundador · de 2016 a 2025' where nome = 'Álvaro Mendonça Neto' and periodo = 'Da fundação a 2025';
