-- Diretório dos confrades: cadastro permanente da confraria (a lista da festa do ano continua em wlr_participantes).
-- Contato: só botão de WhatsApp (o número não vai para a tela; é buscado no clique). E-mail nunca aparece.
create table if not exists wlr_confrades (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid unique references wlr_participantes(id) on delete set null,  -- liga ao login (edita o próprio perfil)
  nome text not null,
  apelido text,
  siglas text[] not null default '{}',   -- como aparece nas listas das edições (AMN, JAC…)
  cargo text,                            -- Presidente, Fundador, Conselho…
  membro_desde int,
  no_diretorio boolean not null default true,   -- false = só dá nome à sigla no BI (ex.: quem não é mais membro)
  whatsapp text,                          -- para quem não está na lista da festa
  foto text,
  aniv_dia int check (aniv_dia between 1 and 31),
  aniv_mes int check (aniv_mes between 1 and 12),
  profissao text,
  vinho_favorito text,
  frase text,
  instagram text,
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);
alter table wlr_confrades enable row level security;

create or replace function wlr_p_confrades(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return jsonb_build_object(
    'confrades', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c.id, 'nome', c.nome, 'apelido', c.apelido, 'siglas', c.siglas, 'cargo', c.cargo, 'membro_desde', c.membro_desde,
        'tem_foto', c.foto is not null, 'aniv_dia', c.aniv_dia, 'aniv_mes', c.aniv_mes, 'profissao', c.profissao,
        'vinho_favorito', c.vinho_favorito, 'frase', c.frase, 'instagram', c.instagram,
        'tem_whatsapp', coalesce(c.whatsapp, p.whatsapp, p.whatsapp_lista) is not null,
        'confirmado', coalesce(p.confirmado, false), 'participante', p.nome, 'sou_eu', c.participante_id = p_id)
        order by c.nome) from wlr_confrades c left join wlr_participantes p on p.id = c.participante_id where c.no_diretorio), '[]'::jsonb),
    'siglas', coalesce((select jsonb_object_agg(s, c.nome) from wlr_confrades c, unnest(c.siglas) s), '{}'::jsonb));
end $$;

create or replace function wlr_p_confrade_foto(p_id uuid, p_confrade uuid) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return (select foto from wlr_confrades where id = p_confrade and no_diretorio);
end $$;

-- o número só sai no clique do botão (não fica na tela nem na lista)
create or replace function wlr_p_confrade_whatsapp(p_id uuid, p_confrade uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare v text;
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  select coalesce(c.whatsapp, p.whatsapp, split_part(p.whatsapp_lista, ';', 1)) into v
    from wlr_confrades c left join wlr_participantes p on p.id = c.participante_id where c.id = p_confrade and c.no_diretorio;
  return nullif(regexp_replace(coalesce(v, ''), '\D', '', 'g'), '');
end $$;

-- o próprio confrade atualiza o perfil (p_foto: null = mantém; '' = remove; data URL = troca)
create or replace function wlr_p_meu_perfil(p_id uuid, p_apelido text, p_aniv_dia int, p_aniv_mes int, p_profissao text,
  p_vinho_favorito text, p_frase text, p_instagram text, p_foto text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid; v_nome text;
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  if p_foto is not null and p_foto <> '' and p_foto !~ '^data:image/(jpeg|png|webp);base64,' then raise exception 'Foto inválida'; end if;
  if p_foto is not null and length(p_foto) > 3000000 then raise exception 'Foto grande demais'; end if;
  if (p_aniv_dia is null) <> (p_aniv_mes is null) then raise exception 'Informe o dia e o mês do aniversário'; end if;
  select id into v from wlr_confrades where participante_id = p_id;
  if v is null then
    select nome into v_nome from wlr_participantes where id = p_id;
    insert into wlr_confrades (participante_id, nome) values (p_id, v_nome) returning id into v;
  end if;
  update wlr_confrades set apelido = nullif(trim(coalesce(p_apelido, '')), ''), aniv_dia = p_aniv_dia, aniv_mes = p_aniv_mes,
    profissao = nullif(trim(coalesce(p_profissao, '')), ''), vinho_favorito = nullif(trim(coalesce(p_vinho_favorito, '')), ''),
    frase = nullif(trim(coalesce(p_frase, '')), ''), instagram = nullif(regexp_replace(trim(coalesce(p_instagram, '')), '^(https?://(www\.)?instagram\.com/|@)', ''), ''),
    foto = case when p_foto is null then foto else nullif(p_foto, '') end,
    atualizado_em = now(), atualizado_por = 'o próprio'
  where id = v;
  return v;
end $$;

-- painel do conselho
create or replace function wlr_admin_confrades(p_token text) returns table(id uuid, nome text, apelido text, siglas text[], cargo text,
  membro_desde int, no_diretorio boolean, participante_id uuid, participante text, whatsapp text, tem_foto boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return query select c.id, c.nome, c.apelido, c.siglas, c.cargo, c.membro_desde, c.no_diretorio, c.participante_id, p.nome, c.whatsapp, c.foto is not null
    from wlr_confrades c left join wlr_participantes p on p.id = c.participante_id order by c.no_diretorio desc, c.nome;
end $$;

create or replace function wlr_admin_confrade_foto(p_token text, p_confrade uuid) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return (select foto from wlr_confrades where id = p_confrade);
end $$;

create or replace function wlr_admin_confrade_salvar(p_token text, p_confrade uuid, p_nome text, p_apelido text, p_siglas text[], p_cargo text,
  p_membro_desde int, p_no_diretorio boolean, p_participante uuid, p_whatsapp text, p_foto text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid; v_quem text;
begin
  v_quem := wlr_admin_check(p_token);
  if nullif(trim(coalesce(p_nome, '')), '') is null then raise exception 'Informe o nome'; end if;
  if p_foto is not null and p_foto <> '' and p_foto !~ '^data:image/(jpeg|png|webp);base64,' then raise exception 'Foto inválida'; end if;
  if p_foto is not null and length(p_foto) > 3000000 then raise exception 'Foto grande demais'; end if;
  if p_participante is not null and exists (select 1 from wlr_confrades where participante_id = p_participante and id is distinct from p_confrade) then
    raise exception 'Este membro da lista já está ligado a outro confrade';
  end if;
  if p_confrade is null then
    insert into wlr_confrades (nome) values (trim(p_nome)) returning id into v;
  else v := p_confrade; end if;
  update wlr_confrades set nome = trim(p_nome), apelido = nullif(trim(coalesce(p_apelido, '')), ''),
    siglas = coalesce((select array_agg(distinct trim(s)) from unnest(coalesce(p_siglas, '{}')) s where trim(s) <> ''), '{}'),
    cargo = nullif(trim(coalesce(p_cargo, '')), ''), membro_desde = p_membro_desde, no_diretorio = coalesce(p_no_diretorio, true),
    participante_id = p_participante, whatsapp = nullif(regexp_replace(coalesce(p_whatsapp, ''), '[^\d+]', '', 'g'), ''),
    foto = case when p_foto is null then foto else nullif(p_foto, '') end, atualizado_em = now(), atualizado_por = v_quem
  where id = v;
  return v;
end $$;

create or replace function wlr_admin_confrade_apagar(p_token text, p_confrade uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  delete from wlr_confrades where id = p_confrade;
end $$;
