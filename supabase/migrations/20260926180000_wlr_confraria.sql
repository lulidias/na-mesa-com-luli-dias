-- Wine Lovers Recife: página da confraria (texto, playlist e edições anteriores da Magnum Fest).
-- Só membros com sessão; tudo editável pelo conselho no painel. As fotos ficam no banco
-- (data URL) de propósito: o repositório e o Storage são públicos, e a foto é só dos membros.

alter table wlr_config add column if not exists confraria_texto text, add column if not exists playlist_url text;

create table if not exists wlr_edicoes (
  ano int primary key,
  data date,
  local text,
  texto text,
  vinhos text,          -- uma garrafa por linha: "SIGLA - Vinho safra"
  foto text,            -- data:image/jpeg;base64,… (≤ 1600 px)
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);
alter table wlr_edicoes enable row level security;

create or replace function wlr__confraria(p_com_foto boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'texto', (select confraria_texto from wlr_config where id = 1),
    'playlist', (select playlist_url from wlr_config where id = 1),
    'edicoes', coalesce((select jsonb_agg(jsonb_build_object('ano', ano, 'data', data, 'local', local, 'texto', texto,
        'vinhos', vinhos, 'tem_foto', foto is not null) || case when p_com_foto then jsonb_build_object('foto', foto) else '{}'::jsonb end
      order by ano desc) from wlr_edicoes), '[]'::jsonb));
$$;
revoke execute on function wlr__confraria(boolean) from public, anon, authenticated;

-- membros
create or replace function wlr_p_confraria(p_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return wlr__confraria(false);
end $$;

create or replace function wlr_p_edicao_foto(p_id uuid, p_ano int) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return (select foto from wlr_edicoes where ano = p_ano);
end $$;

-- painel
create or replace function wlr_admin_confraria(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return wlr__confraria(false);
end $$;

create or replace function wlr_admin_edicao_foto(p_token text, p_ano int) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return (select foto from wlr_edicoes where ano = p_ano);
end $$;

create or replace function wlr_admin_confraria_salvar(p_token text, p_texto text, p_playlist text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  if nullif(trim(coalesce(p_playlist, '')), '') is not null and trim(p_playlist) !~ '^https://' then
    raise exception 'O link da playlist deve começar com https://';
  end if;
  update wlr_config set confraria_texto = nullif(trim(coalesce(p_texto, '')), ''),
    playlist_url = nullif(trim(coalesce(p_playlist, '')), '') where id = 1;
end $$;

-- p_foto: null = mantém a atual; '' = remove; data URL = troca
create or replace function wlr_admin_edicao_salvar(p_token text, p_ano int, p_data date, p_local text, p_texto text,
  p_vinhos text, p_foto text default null, p_ano_antigo int default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_quem text;
begin
  v_quem := wlr_admin_check(p_token);
  if p_ano is null or p_ano < 2000 or p_ano > 2100 then raise exception 'Informe o ano da edição'; end if;
  if p_foto is not null and p_foto <> '' and p_foto !~ '^data:image/(jpeg|png|webp);base64,' then raise exception 'Foto inválida'; end if;
  if p_foto is not null and length(p_foto) > 3000000 then raise exception 'Foto grande demais'; end if;
  if p_ano_antigo is not null and p_ano_antigo <> p_ano then
    if exists (select 1 from wlr_edicoes where ano = p_ano) then raise exception 'Já existe a edição de %', p_ano; end if;
    update wlr_edicoes set ano = p_ano where ano = p_ano_antigo;
  end if;
  insert into wlr_edicoes (ano, data, local, texto, vinhos, foto, atualizado_em, atualizado_por)
  values (p_ano, p_data, nullif(trim(coalesce(p_local, '')), ''), nullif(trim(coalesce(p_texto, '')), ''),
    nullif(trim(coalesce(p_vinhos, '')), ''), nullif(p_foto, ''), now(), v_quem)
  on conflict (ano) do update set data = excluded.data, local = excluded.local, texto = excluded.texto, vinhos = excluded.vinhos,
    foto = case when p_foto is null then wlr_edicoes.foto else nullif(p_foto, '') end,
    atualizado_em = now(), atualizado_por = v_quem;
end $$;

create or replace function wlr_admin_edicao_apagar(p_token text, p_ano int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  delete from wlr_edicoes where ano = p_ano;
end $$;
