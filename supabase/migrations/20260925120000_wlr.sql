-- Magnum Fest Licínio Dias 2026 — Wine Lovers Recife (lulidias.com/wlr/)
-- Clone do Confras (confras_*) com prefixo wlr_, membros pré-cadastrados,
-- conselho com token individual e análise dos vinhos pelos critérios da MFLD.
-- Placeholders substituídos na aplicação (repo público — nunca commitar):
--   __WLR_SECRET__  = secret WLR_CRON_SECRET do worker
--   __ADMIN_TOKEN__ = token mestre do organizador

-- ── tabelas ─────────────────────────────────────────────────────────────
create table if not exists wlr_config (
  id int primary key default 1 check (id = 1),
  chave_pix text, nome_pix text, valor_rateio numeric,
  rsvp_aberto boolean not null default true,
  admin_token text not null,
  votacao_aberta boolean not null default false,
  resultados_publicos boolean not null default false,
  premio1 text,
  evento_em timestamptz not null default '2026-12-11 20:00-03',
  hora_confirmada boolean not null default false,
  local_nome text default 'Restaurante Ruizito',
  local_detalhe text default 'Shopping RioMar · Recife',
  urna_fecha_em timestamptz,
  meta_confrades int,
  email_tesoureiro text,
  site_url text not null default 'https://lulidias.com/wlr/',
  lim_espumantes int not null default 3,
  lim_espumante_rose int not null default 1,
  lim_doces int not null default 2
);

create table if not exists wlr_conselho (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  token text not null unique,
  mestre boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists wlr_participantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  whatsapp text,
  email text,
  obs text,
  produtor_de text,            -- cláusula 6.2: confrade produtor apresenta os próprios vinhos
  confirmado boolean not null default false,
  confirmado_em timestamptz,
  pago boolean not null default false,
  pago_em timestamptz,
  comprovante_url text,
  criado_em timestamptz not null default now()
);

create table if not exists wlr_garrafas (
  id uuid primary key default gen_random_uuid(),
  vinho text not null,
  produtor text, regiao text, safra text,
  formato text not null, litros numeric not null,
  vagas int not null default 1,
  tipo text not null default 'Tinto',
  subtipo text,                -- Espumante: Brut | Rosé · Fortificado/Doce: Porto Vintage | Porto Tawny | Sauternes | Tokaj | Outro
  pais text,
  foto_url text, foto_ok boolean,
  sigla text,                  -- vinhos importados da lista do conselho sem dono identificado
  criado_por uuid references wlr_participantes(id) on delete set null,
  criado_em timestamptz not null default now(),
  -- análise automática (worker wlr-worker)
  analise_status text not null default 'pendente'
    check (analise_status in ('pendente','processando','apto','conselho','inapto','erro')),
  analise jsonb,
  analise_em timestamptz,
  analise_tentativas int not null default 0,
  requer_conselho boolean not null default false,
  pedido_excecao boolean not null default false,
  -- decisão do conselho (prevalece sobre a análise)
  decisao text check (decisao in ('aprovado','recusado')),
  decisao_por text, decisao_motivo text, decisao_em timestamptz
);

create table if not exists wlr_garrafa_membros (
  garrafa_id uuid not null references wlr_garrafas(id) on delete cascade,
  participante_id uuid not null references wlr_participantes(id) on delete cascade,
  primary key (garrafa_id, participante_id)
);
create table if not exists wlr_garrafa_pedidos (
  garrafa_id uuid not null references wlr_garrafas(id) on delete cascade,
  participante_id uuid not null references wlr_participantes(id) on delete cascade,
  status text not null default 'pendente',
  criado_em timestamptz not null default now(),
  primary key (garrafa_id, participante_id)
);
create table if not exists wlr_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null, tipo_filtro text, ordem int not null default 0
);
create table if not exists wlr_votos (
  categoria_id uuid not null references wlr_categorias(id) on delete cascade,
  participante_id uuid not null references wlr_participantes(id) on delete cascade,
  garrafa_id uuid not null references wlr_garrafas(id) on delete cascade,
  votado_em timestamptz not null default now(),
  primary key (categoria_id, participante_id)
);
create table if not exists wlr_emails (
  id uuid primary key default gen_random_uuid(),
  tipo text not null, para text not null,
  dados jsonb not null default '{}',
  status text not null default 'pendente',
  tentativas int not null default 0, erro text,
  criado_em timestamptz not null default now(), enviado_em timestamptz
);
create table if not exists wlr_acessos (
  id bigint generated always as identity primary key,
  participante_id uuid references wlr_participantes(id) on delete set null,
  criado_em timestamptz not null default now()
);

alter table wlr_config enable row level security;
alter table wlr_conselho enable row level security;
alter table wlr_participantes enable row level security;
alter table wlr_garrafas enable row level security;
alter table wlr_garrafa_membros enable row level security;
alter table wlr_garrafa_pedidos enable row level security;
alter table wlr_categorias enable row level security;
alter table wlr_votos enable row level security;
alter table wlr_emails enable row level security;
alter table wlr_acessos enable row level security;

-- ── helpers ─────────────────────────────────────────────────────────────
create or replace function wlr_titulo(t text) returns text language sql immutable as $$
  select public.confras_titulo(t);
$$;

-- situação pública de uma garrafa: decisão do conselho > análise automática
create or replace function wlr_situacao(g wlr_garrafas) returns text language sql stable as $$
  select case
    when g.decisao = 'aprovado' then 'aprovado'
    when g.decisao = 'recusado' then 'recusado'
    when g.analise_status = 'apto' and not g.requer_conselho then 'aprovado'
    when g.analise_status = 'inapto' and not g.pedido_excecao then 'inapto'
    else 'em_analise' end;
$$;

create or replace function wlr_email_enqueue(p_tipo text, p_para text, p_dados jsonb)
returns void language sql security definer set search_path = public as $$
  insert into wlr_emails (tipo, para, dados)
  select p_tipo, p_para, coalesce(p_dados, '{}') where coalesce(trim(p_para), '') <> '';
$$;

create or replace function wlr_cutuca(p_task text default 'fila', p_garrafa uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://saotncritqxuchsvvnzi.supabase.co/functions/v1/wlr-worker',
    headers := '{"Content-Type":"application/json","x-wlr-secret":"__WLR_SECRET__"}'::jsonb,
    body := jsonb_build_object('task', p_task, 'garrafa', p_garrafa));
end $$;

-- ── views públicas (sem PII) ────────────────────────────────────────────
create or replace view wlr_config_publica as
  select chave_pix, nome_pix, valor_rateio, rsvp_aberto, votacao_aberta, resultados_publicos,
         premio1, evento_em, hora_confirmada, local_nome, local_detalhe, urna_fecha_em,
         meta_confrades, lim_espumantes, lim_espumante_rose, lim_doces
  from wlr_config;

create or replace view wlr_membros as
  select nome, confirmado from wlr_participantes order by nome;

create or replace view wlr_confirmados as
  select nome, pago, coalesce(confirmado_em, criado_em) as criado_em
  from wlr_participantes where confirmado order by confirmado_em;

create or replace view wlr_categorias_publicas as
  select id, nome, tipo_filtro, ordem from wlr_categorias order by ordem, nome;

create or replace view wlr_vinhos_publico as
  select g.id, g.vinho, g.produtor, g.regiao, g.safra, g.formato, g.tipo, g.subtipo, g.pais,
         g.litros, g.vagas, g.foto_url, g.foto_ok, g.sigla,
         wlr_situacao(g) as situacao,
         g.analise -> 'publico' as selo,
         coalesce(array_agg(p.nome order by p.nome) filter (where p.nome is not null), '{}') as membros,
         g.vagas - count(m.participante_id)::int as vagas_restantes
  from wlr_garrafas g
  left join wlr_garrafa_membros m on m.garrafa_id = g.id
  left join wlr_participantes p on p.id = m.participante_id
  where wlr_situacao(g) in ('aprovado', 'em_analise')
  group by g.id
  order by g.litros desc, g.criado_em;

grant select on wlr_config_publica, wlr_membros, wlr_confirmados, wlr_categorias_publicas, wlr_vinhos_publico to anon, authenticated;

-- ── confrade ────────────────────────────────────────────────────────────
-- confirma presença escolhendo o nome na lista de membros (só membros entram)
create or replace function wlr_rsvp(p_nome text, p_whatsapp text, p_email text, p_obs text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v record; v_dig text; v_outro uuid;
begin
  if not (select rsvp_aberto from wlr_config where id = 1) then raise exception 'Confirmações encerradas'; end if;
  v_dig := right(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), 8);
  if length(v_dig) < 8 then raise exception 'Informe um WhatsApp válido, com DDD'; end if;
  select * into v from wlr_participantes where nome = p_nome;
  if v is null then raise exception 'Escolha o seu nome na lista de membros'; end if;
  if v.confirmado and v.whatsapp is not null
     and right(regexp_replace(v.whatsapp, '\D', '', 'g'), 8) <> v_dig then
    raise exception 'Este nome já foi confirmado com outro WhatsApp — fale com o organizador';
  end if;
  select id into v_outro from wlr_participantes
   where id <> v.id and right(regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g'), 8) = v_dig limit 1;
  if v_outro is not null then raise exception 'Este WhatsApp já está ligado a outro confrade'; end if;
  update wlr_participantes set
    whatsapp = trim(p_whatsapp),
    email = coalesce(nullif(trim(p_email), ''), email),
    obs = coalesce(nullif(trim(coalesce(p_obs, '')), ''), obs),
    confirmado = true,
    confirmado_em = coalesce(confirmado_em, now())
  where id = v.id;
  return v.id;
end $$;

create or replace function wlr_entrar(p_whatsapp text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_dig text;
begin
  v_dig := right(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), 8);
  if length(v_dig) < 8 then raise exception 'Informe um WhatsApp válido, com DDD'; end if;
  select id into v_id from wlr_participantes
   where confirmado and right(regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g'), 8) = v_dig limit 1;
  if v_id is null then raise exception 'Não encontrei esse WhatsApp — confirme sua presença primeiro'; end if;
  return v_id;
end $$;

create or replace function wlr_meu(p_id uuid)
returns table(id uuid, nome text, whatsapp text, email text, pago boolean, comprovante_url text, produtor_de text)
language sql security definer set search_path = public as $$
  select id, nome, whatsapp, email, pago, comprovante_url, produtor_de
  from wlr_participantes where id = p_id and confirmado;
$$;

create or replace function wlr_add_garrafa(p_participante uuid, p_vinho text, p_produtor text, p_safra text,
  p_formato text, p_litros numeric, p_vagas int, p_tipo text default 'Tinto', p_pais text default null,
  p_regiao text default null, p_subtipo text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not exists (select 1 from wlr_participantes where id = p_participante and confirmado) then
    raise exception 'Confirme sua presença primeiro';
  end if;
  if coalesce(trim(p_vinho), '') = '' then raise exception 'Informe o vinho'; end if;
  insert into wlr_garrafas (vinho, produtor, regiao, safra, formato, litros, vagas, tipo, subtipo, pais, criado_por)
  values (trim(p_vinho), nullif(trim(coalesce(p_produtor, '')), ''), nullif(trim(coalesce(p_regiao, '')), ''),
          nullif(trim(coalesce(p_safra, '')), ''), p_formato, p_litros, greatest(p_vagas, 1),
          coalesce(nullif(trim(p_tipo), ''), 'Tinto'), nullif(trim(coalesce(p_subtipo, '')), ''),
          nullif(trim(coalesce(p_pais, '')), ''), p_participante)
  returning id into v_id;
  insert into wlr_garrafa_membros (garrafa_id, participante_id) values (v_id, p_participante);
  return v_id;
end $$;

create or replace function wlr_edit_garrafa(p_participante uuid, p_garrafa uuid, p_vinho text, p_produtor text,
  p_safra text, p_formato text, p_litros numeric, p_vagas int, p_tipo text default 'Tinto',
  p_pais text default null, p_regiao text default null, p_subtipo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_membros int; v_old wlr_garrafas;
begin
  select * into v_old from wlr_garrafas where id = p_garrafa and criado_por = p_participante;
  if v_old is null then raise exception 'Só quem registrou a garrafa pode editá-la'; end if;
  if coalesce(trim(p_vinho), '') = '' then raise exception 'Informe o vinho'; end if;
  select count(*) into v_membros from wlr_garrafa_membros where garrafa_id = p_garrafa;
  if greatest(p_vagas, 1) < v_membros then
    raise exception 'A garrafa já tem % confrades — não dá para reduzir para %', v_membros, p_vagas;
  end if;
  update wlr_garrafas set
    vinho = trim(p_vinho),
    produtor = nullif(trim(coalesce(p_produtor, '')), ''),
    regiao = nullif(trim(coalesce(p_regiao, '')), ''),
    safra = nullif(trim(coalesce(p_safra, '')), ''),
    formato = p_formato, litros = p_litros, vagas = greatest(p_vagas, 1),
    tipo = coalesce(nullif(trim(p_tipo), ''), 'Tinto'),
    subtipo = nullif(trim(coalesce(p_subtipo, '')), ''),
    pais = nullif(trim(coalesce(p_pais, '')), '')
  where id = p_garrafa;
  -- mudou o vinho → nova análise (a decisão do conselho valia para o vinho anterior)
  if v_old.vinho is distinct from wlr_titulo(trim(p_vinho)) or v_old.safra is distinct from nullif(trim(coalesce(p_safra, '')), '')
     or v_old.tipo is distinct from p_tipo or v_old.subtipo is distinct from nullif(trim(coalesce(p_subtipo, '')), '')
     or v_old.produtor is distinct from wlr_titulo(nullif(trim(coalesce(p_produtor, '')), '')) then
    update wlr_garrafas set analise_status = 'pendente', analise = null, analise_tentativas = 0,
      requer_conselho = false, pedido_excecao = false,
      decisao = null, decisao_por = null, decisao_motivo = null, decisao_em = null
    where id = p_garrafa;
    perform wlr_cutuca('analise', p_garrafa);
  end if;
end $$;

create or replace function wlr_minhas_garrafas(p_participante uuid)
returns table(id uuid, vinho text, produtor text, regiao text, safra text, formato text, litros numeric,
  vagas int, tipo text, subtipo text, pais text, membros text[], sou_criador boolean, foto_url text, foto_ok boolean,
  situacao text, analise_status text, analise jsonb, decisao_motivo text, decisao_por text, pedido_excecao boolean)
language sql security definer set search_path = public as $$
  select g.id, g.vinho, g.produtor, g.regiao, g.safra, g.formato, g.litros, g.vagas, g.tipo, g.subtipo, g.pais,
         coalesce(array_agg(p2.nome order by p2.nome) filter (where p2.nome is not null), '{}'),
         g.criado_por = p_participante, g.foto_url, g.foto_ok,
         wlr_situacao(g), g.analise_status, g.analise, g.decisao_motivo, g.decisao_por, g.pedido_excecao
  from wlr_garrafas g
  join wlr_garrafa_membros m on m.garrafa_id = g.id and m.participante_id = p_participante
  left join wlr_garrafa_membros m2 on m2.garrafa_id = g.id
  left join wlr_participantes p2 on p2.id = m2.participante_id
  group by g.id;
$$;

-- cláusula 6.1: o confrade pede que o conselho avalie um vinho que não passou nos critérios
create or replace function wlr_pedir_excecao(p_participante uuid, p_garrafa uuid, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_g wlr_garrafas; v_nome text;
begin
  select * into v_g from wlr_garrafas where id = p_garrafa and criado_por = p_participante;
  if v_g is null then raise exception 'Só quem registrou a garrafa pode pedir a exceção'; end if;
  select nome into v_nome from wlr_participantes where id = p_participante;
  update wlr_garrafas set pedido_excecao = true,
    analise = coalesce(analise, '{}') || jsonb_build_object('motivo_excecao', nullif(trim(coalesce(p_motivo, '')), ''))
  where id = p_garrafa;
  perform wlr_email_enqueue('conselho-avaliar', c.email, jsonb_build_object(
    'conselheiro', c.nome, 'token', c.token, 'garrafa_id', v_g.id, 'vinho', v_g.vinho, 'safra', v_g.safra,
    'confrade', v_nome, 'motivo', 'Pedido de exceção (cláusula 6.1): ' || coalesce(nullif(trim(p_motivo), ''), 'sem justificativa')))
  from wlr_conselho c where c.email is not null;
end $$;

create or replace function wlr_join_garrafa(p_participante uuid, p_garrafa uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from wlr_participantes where id = p_participante and confirmado) then
    raise exception 'Participante não encontrado';
  end if;
  if (select vagas - (select count(*) from wlr_garrafa_membros where garrafa_id = p_garrafa)
      from wlr_garrafas where id = p_garrafa) <= 0 then raise exception 'Esta garrafa já está completa'; end if;
  insert into wlr_garrafa_membros values (p_garrafa, p_participante) on conflict do nothing;
end $$;

create or replace function wlr_leave_garrafa(p_participante uuid, p_garrafa uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from wlr_garrafa_membros where garrafa_id = p_garrafa and participante_id = p_participante;
  delete from wlr_garrafas g where g.id = p_garrafa and g.sigla is null
    and not exists (select 1 from wlr_garrafa_membros m where m.garrafa_id = g.id);
end $$;

create or replace function wlr_pedir_garrafa(p_participante uuid, p_garrafa uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_sol record; v_g record; v_dono record;
begin
  select * into v_sol from wlr_participantes where id = p_participante and confirmado;
  if v_sol is null then raise exception 'Confirme sua presença primeiro'; end if;
  select * into v_g from wlr_garrafas where id = p_garrafa;
  if v_g is null then raise exception 'Garrafa não encontrada'; end if;
  if v_g.criado_por = p_participante then raise exception 'Você já é o dono desta garrafa'; end if;
  if exists (select 1 from wlr_garrafa_membros where garrafa_id = p_garrafa and participante_id = p_participante) then
    raise exception 'Você já está nesta garrafa';
  end if;
  if (select v_g.vagas - count(*) from wlr_garrafa_membros where garrafa_id = p_garrafa) <= 0 then
    raise exception 'Esta garrafa já está completa';
  end if;
  insert into wlr_garrafa_pedidos (garrafa_id, participante_id) values (p_garrafa, p_participante)
  on conflict (garrafa_id, participante_id) do update set status = 'pendente', criado_em = now();
  select * into v_dono from wlr_participantes where id = v_g.criado_por;
  if v_dono.email is not null then
    perform wlr_email_enqueue('pedido-garrafa', v_dono.email, jsonb_build_object(
      'nome', v_dono.nome, 'participante_id', v_dono.id, 'solicitante', v_sol.nome, 'solicitante_zap', v_sol.whatsapp,
      'vinho', v_g.vinho, 'safra', v_g.safra, 'formato', v_g.formato));
  end if;
end $$;

create or replace function wlr_meus_pedidos(p_participante uuid)
returns table(garrafa_id uuid, status text) language sql security definer set search_path = public as $$
  select garrafa_id, status from wlr_garrafa_pedidos where participante_id = p_participante;
$$;

create or replace function wlr_pedidos_recebidos(p_participante uuid)
returns table(garrafa_id uuid, vinho text, solicitante_id uuid, solicitante text, whatsapp text)
language sql security definer set search_path = public as $$
  select g.id, g.vinho, p.id, p.nome, p.whatsapp
  from wlr_garrafa_pedidos pd
  join wlr_garrafas g on g.id = pd.garrafa_id and g.criado_por = p_participante
  join wlr_participantes p on p.id = pd.participante_id
  where pd.status = 'pendente' order by pd.criado_em;
$$;

create or replace function wlr_responder_pedido(p_criador uuid, p_garrafa uuid, p_solicitante uuid, p_aceitar boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_g record; v_sol record;
begin
  select * into v_g from wlr_garrafas where id = p_garrafa;
  if v_g is null or v_g.criado_por is distinct from p_criador then raise exception 'Só o dono da garrafa pode responder pedidos'; end if;
  if not exists (select 1 from wlr_garrafa_pedidos where garrafa_id = p_garrafa and participante_id = p_solicitante and status = 'pendente') then
    raise exception 'Pedido não encontrado';
  end if;
  select * into v_sol from wlr_participantes where id = p_solicitante;
  if p_aceitar then
    if (select v_g.vagas - count(*) from wlr_garrafa_membros where garrafa_id = p_garrafa) <= 0 then
      raise exception 'A garrafa já está completa';
    end if;
    insert into wlr_garrafa_membros values (p_garrafa, p_solicitante) on conflict do nothing;
    update wlr_garrafa_pedidos set status = 'aceito' where garrafa_id = p_garrafa and participante_id = p_solicitante;
    perform wlr_email_enqueue('pedido-aceito', v_sol.email, jsonb_build_object(
      'nome', v_sol.nome, 'participante_id', v_sol.id, 'vinho', v_g.vinho, 'safra', v_g.safra, 'formato', v_g.formato));
  else
    update wlr_garrafa_pedidos set status = 'recusado' where garrafa_id = p_garrafa and participante_id = p_solicitante;
    perform wlr_email_enqueue('pedido-recusado', v_sol.email, jsonb_build_object(
      'nome', v_sol.nome, 'participante_id', v_sol.id, 'vinho', v_g.vinho));
  end if;
end $$;

create or replace function wlr_set_foto_garrafa(p_participante uuid, p_garrafa uuid, p_url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from wlr_garrafa_membros where garrafa_id = p_garrafa and participante_id = p_participante) then
    raise exception 'Só quem leva a garrafa pode definir a foto';
  end if;
  update wlr_garrafas set foto_url = nullif(trim(p_url), ''), foto_ok = true where id = p_garrafa;
end $$;

create or replace function wlr_avalia_foto(p_participante uuid, p_garrafa uuid, p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from wlr_garrafa_membros where garrafa_id = p_garrafa and participante_id = p_participante) then
    raise exception 'Só quem leva a garrafa pode avaliar a foto';
  end if;
  if p_ok then update wlr_garrafas set foto_ok = true where id = p_garrafa;
  else update wlr_garrafas set foto_url = '', foto_ok = false where id = p_garrafa; end if;
end $$;

create or replace function wlr_set_comprovante(p_participante uuid, p_url text) returns void
language sql security definer set search_path = public as $$
  update wlr_participantes set comprovante_url = p_url where id = p_participante and confirmado;
$$;

create or replace function wlr_ping(p_participante uuid default null) returns void
language sql security definer set search_path = public as $$
  insert into wlr_acessos (participante_id) select p_participante
  where p_participante is null or exists (select 1 from wlr_participantes where id = p_participante);
$$;

-- ── votação ─────────────────────────────────────────────────────────────
create or replace function wlr_votar(p_participante uuid, p_categoria uuid, p_garrafa uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_filtro text; v_g wlr_garrafas; v_fecha timestamptz;
begin
  select urna_fecha_em into v_fecha from wlr_config where id = 1;
  if not (select votacao_aberta from wlr_config where id = 1) then raise exception 'A votação não está aberta'; end if;
  if v_fecha is not null and now() > v_fecha then raise exception 'A votação já encerrou'; end if;
  if not exists (select 1 from wlr_participantes where id = p_participante and confirmado) then
    raise exception 'Participante não encontrado';
  end if;
  select tipo_filtro into v_filtro from wlr_categorias where id = p_categoria;
  select * into v_g from wlr_garrafas where id = p_garrafa;
  if v_g is null or wlr_situacao(v_g) <> 'aprovado' then raise exception 'Garrafa não encontrada'; end if;
  if v_filtro is not null and v_g.tipo <> v_filtro then raise exception 'Este vinho não concorre nesta categoria'; end if;
  insert into wlr_votos (categoria_id, participante_id, garrafa_id) values (p_categoria, p_participante, p_garrafa)
  on conflict (categoria_id, participante_id) do update set garrafa_id = excluded.garrafa_id, votado_em = now();
end $$;

create or replace function wlr_meus_votos(p_participante uuid)
returns table(categoria_id uuid, garrafa_id uuid) language sql security definer set search_path = public as $$
  select categoria_id, garrafa_id from wlr_votos where participante_id = p_participante;
$$;

create or replace function wlr__resultados()
returns table(categoria_id uuid, categoria text, garrafa_id uuid, vinho text, safra text, tipo text, formato text, membros text[], votos bigint)
language sql security definer set search_path = public as $$
  select c.id, c.nome, g.id, g.vinho, g.safra, g.tipo, g.formato,
         coalesce((select array_agg(p.nome order by p.nome) from wlr_garrafa_membros m
                   join wlr_participantes p on p.id = m.participante_id where m.garrafa_id = g.id), '{}'),
         count(v.participante_id)
  from wlr_categorias c
  join wlr_votos v on v.categoria_id = c.id
  join wlr_garrafas g on g.id = v.garrafa_id
  group by c.id, c.nome, c.ordem, g.id
  order by c.ordem, count(v.participante_id) desc, g.vinho;
$$;
revoke execute on function wlr__resultados() from anon, authenticated, public;

create or replace function wlr_resultados()
returns table(categoria_id uuid, categoria text, garrafa_id uuid, vinho text, safra text, tipo text, formato text, membros text[], votos bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not (select resultados_publicos from wlr_config where id = 1) then
    raise exception 'Os resultados ainda não foram divulgados';
  end if;
  return query select * from wlr__resultados();
end $$;

-- ── conselho / admin ────────────────────────────────────────────────────
-- devolve o nome de quem está operando (fica registrado nas decisões)
create or replace function wlr_admin_check(p_token text) returns text
language plpgsql security definer set search_path = public as $$
declare v_nome text;
begin
  if coalesce(p_token, '') = '' then raise exception 'Token inválido'; end if;
  if exists (select 1 from wlr_config where id = 1 and admin_token = p_token) then return 'Luli Dias'; end if;
  select nome into v_nome from wlr_conselho where token = p_token;
  if v_nome is null then raise exception 'Token inválido'; end if;
  return v_nome;
end $$;

create or replace function wlr_admin_quem(p_token text) returns table(nome text, mestre boolean)
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  v := wlr_admin_check(p_token);
  return query select v, exists (select 1 from wlr_config where id = 1 and admin_token = p_token)
                        or exists (select 1 from wlr_conselho c where c.token = p_token and c.mestre);
end $$;

create or replace function wlr_admin_mestre(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (exists (select 1 from wlr_config where id = 1 and admin_token = p_token)
          or exists (select 1 from wlr_conselho where token = p_token and mestre)) then
    raise exception 'Restrito ao organizador';
  end if;
end $$;

create or replace function wlr_admin_lista(p_token text) returns setof wlr_participantes
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return query select * from wlr_participantes order by confirmado desc, confirmado_em, nome;
end $$;

create or replace function wlr_admin_garrafas(p_token text)
returns table(id uuid, vinho text, produtor text, regiao text, safra text, formato text, litros numeric, vagas int,
  tipo text, subtipo text, pais text, foto_url text, sigla text, criado_por uuid, criado_em timestamptz,
  membros text[], situacao text, analise_status text, analise jsonb, requer_conselho boolean, pedido_excecao boolean,
  decisao text, decisao_por text, decisao_motivo text, decisao_em timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return query
    select g.id, g.vinho, g.produtor, g.regiao, g.safra, g.formato, g.litros, g.vagas, g.tipo, g.subtipo, g.pais,
           g.foto_url, g.sigla, g.criado_por, g.criado_em,
           coalesce((select array_agg(p.nome order by p.nome) from wlr_garrafa_membros m
                     join wlr_participantes p on p.id = m.participante_id where m.garrafa_id = g.id), '{}'),
           wlr_situacao(g), g.analise_status, g.analise, g.requer_conselho, g.pedido_excecao,
           g.decisao, g.decisao_por, g.decisao_motivo, g.decisao_em
    from wlr_garrafas g order by g.criado_em;
end $$;

-- decisão do conselho: 'aprovado' | 'recusado' | null (volta para a análise automática)
create or replace function wlr_admin_decidir(p_token text, p_garrafa uuid, p_decisao text, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_quem text; v_g wlr_garrafas;
begin
  v_quem := wlr_admin_check(p_token);
  if p_decisao is not null and p_decisao not in ('aprovado', 'recusado') then raise exception 'Decisão inválida'; end if;
  update wlr_garrafas set decisao = p_decisao,
    decisao_por = case when p_decisao is null then null else v_quem end,
    decisao_motivo = nullif(trim(coalesce(p_motivo, '')), ''),
    decisao_em = case when p_decisao is null then null else now() end
  where id = p_garrafa returning * into v_g;
  if v_g is null then raise exception 'Garrafa não encontrada'; end if;
  if p_decisao is not null then
    perform wlr_email_enqueue('decisao-conselho', p.email, jsonb_build_object(
      'nome', p.nome, 'participante_id', p.id, 'vinho', v_g.vinho, 'safra', v_g.safra,
      'decisao', p_decisao, 'motivo', v_g.decisao_motivo, 'por', v_quem))
    from wlr_garrafa_membros m join wlr_participantes p on p.id = m.participante_id
    where m.garrafa_id = p_garrafa;
  end if;
end $$;

create or replace function wlr_admin_reanalisar(p_token text, p_garrafa uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  update wlr_garrafas set analise_status = 'pendente', analise_tentativas = 0 where id = p_garrafa;
  perform wlr_cutuca('analise', p_garrafa);
end $$;

-- define/troca o dono de uma garrafa (vinhos importados só com a sigla)
create or replace function wlr_admin_garrafa_dono(p_token text, p_garrafa uuid, p_nome text) returns void
language plpgsql security definer set search_path = public as $$
declare v_pid uuid;
begin
  perform wlr_admin_check(p_token);
  select id into v_pid from wlr_participantes where nome = p_nome;
  if v_pid is null then raise exception 'Membro não encontrado'; end if;
  delete from wlr_garrafa_membros m using wlr_garrafas g
   where m.garrafa_id = g.id and g.id = p_garrafa and m.participante_id = g.criado_por;
  update wlr_garrafas set criado_por = v_pid, sigla = null where id = p_garrafa;
  insert into wlr_garrafa_membros values (p_garrafa, v_pid) on conflict do nothing;
end $$;

create or replace function wlr_admin_membro_add(p_token text, p_nome text, p_produtor_de text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  if coalesce(trim(p_nome), '') = '' then raise exception 'Informe o nome'; end if;
  insert into wlr_participantes (nome, produtor_de) values (wlr_titulo(trim(p_nome)), nullif(trim(coalesce(p_produtor_de, '')), ''))
  on conflict (nome) do nothing;
end $$;

create or replace function wlr_admin_marca_pago(p_token text, p_participante uuid, p_pago boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  update wlr_participantes set pago = p_pago, pago_em = case when p_pago then now() end where id = p_participante;
end $$;

-- "remover" desfaz a confirmação (o membro continua na lista) e apaga as garrafas que ficaram vazias
create or replace function wlr_admin_remove(p_token text, p_participante uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  delete from wlr_garrafa_membros where participante_id = p_participante;
  delete from wlr_votos where participante_id = p_participante;
  update wlr_participantes set confirmado = false, confirmado_em = null, whatsapp = null, pago = false,
    pago_em = null, comprovante_url = null where id = p_participante;
  delete from wlr_garrafas g where g.sigla is null
    and not exists (select 1 from wlr_garrafa_membros m where m.garrafa_id = g.id);
end $$;

create or replace function wlr_admin_config(p_token text, p_chave_pix text, p_nome_pix text, p_valor numeric,
  p_aberto boolean, p_votacao boolean default null, p_resultados boolean default null, p_premio1 text default null,
  p_meta int default null, p_evento_em timestamptz default null, p_hora_confirmada boolean default null,
  p_local_nome text default null, p_local_detalhe text default null, p_urna_fecha_em timestamptz default null,
  p_email_tesoureiro text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  update wlr_config set chave_pix = p_chave_pix, nome_pix = p_nome_pix, valor_rateio = p_valor, rsvp_aberto = p_aberto,
    votacao_aberta = coalesce(p_votacao, votacao_aberta),
    resultados_publicos = coalesce(p_resultados, resultados_publicos),
    premio1 = case when p_premio1 is null then premio1 else nullif(trim(p_premio1), '') end,
    meta_confrades = case when p_meta is null then meta_confrades when p_meta <= 0 then null else p_meta end,
    evento_em = coalesce(p_evento_em, evento_em),
    hora_confirmada = coalesce(p_hora_confirmada, hora_confirmada),
    local_nome = coalesce(nullif(trim(p_local_nome), ''), local_nome),
    local_detalhe = coalesce(nullif(trim(p_local_detalhe), ''), local_detalhe),
    urna_fecha_em = coalesce(p_urna_fecha_em, urna_fecha_em),
    email_tesoureiro = case when p_email_tesoureiro is null then email_tesoureiro else nullif(trim(p_email_tesoureiro), '') end
  where id = 1;
end $$;

create or replace function wlr_admin_categoria_add(p_token text, p_nome text, p_tipo text, p_ordem int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  insert into wlr_categorias (nome, tipo_filtro, ordem) values (trim(p_nome), nullif(trim(coalesce(p_tipo, '')), ''), coalesce(p_ordem, 99));
end $$;

create or replace function wlr_admin_categoria_del(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  delete from wlr_categorias where id = p_id;
end $$;

create or replace function wlr_admin_resultados(p_token text)
returns table(categoria_id uuid, categoria text, garrafa_id uuid, vinho text, safra text, tipo text, formato text, membros text[], votos bigint)
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return query select * from wlr__resultados();
end $$;

create or replace function wlr_admin_votantes(p_token text) returns bigint
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return (select count(distinct participante_id) from wlr_votos);
end $$;

create or replace function wlr_admin_quem_votou(p_token text) returns table(nome text)
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return query select distinct p.nome from wlr_votos v join wlr_participantes p on p.id = v.participante_id order by p.nome;
end $$;

create or replace function wlr_admin_set_foto(p_token text, p_garrafa uuid, p_url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  update wlr_garrafas set foto_url = nullif(trim(p_url), ''),
    foto_ok = case when nullif(trim(p_url), '') is null then null else true end where id = p_garrafa;
end $$;

create or replace function wlr_admin_acessos(p_token text) returns table(nome text, quando timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_mestre(p_token);
  return query select coalesce(p.nome, 'Visitante'), a.criado_em from wlr_acessos a
    left join wlr_participantes p on p.id = a.participante_id order by a.criado_em desc limit 60;
end $$;

create or replace function wlr_admin_acessos_resumo(p_token text)
returns table(hoje bigint, semana bigint, total bigint, identificados bigint)
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_mestre(p_token);
  return query select
    (select count(*) from wlr_acessos where criado_em > date_trunc('day', now() at time zone 'America/Recife') at time zone 'America/Recife'),
    (select count(*) from wlr_acessos where criado_em > now() - interval '7 days'),
    (select count(*) from wlr_acessos),
    (select count(*) from wlr_acessos where participante_id is not null);
end $$;

create or replace function wlr_admin_conselho(p_token text)
returns table(id uuid, nome text, email text, token text, mestre boolean)
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_mestre(p_token);
  return query select c.id, c.nome, c.email, c.token, c.mestre from wlr_conselho c order by c.mestre desc, c.nome;
end $$;

create or replace function wlr_admin_conselho_email(p_token text, p_id uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_mestre(p_token);
  update wlr_conselho set email = nullif(trim(p_email), '') where id = p_id;
end $$;

create or replace function wlr_enqueue_lembrete(p_quando text default null) returns void
language sql security definer set search_path = public as $$
  select wlr_email_enqueue('lembrete', p.email, jsonb_build_object('nome', p.nome, 'participante_id', p.id,
    'pago', p.pago, 'quando', p_quando,
    'garrafas', coalesce((select jsonb_agg(jsonb_build_object('vinho', g.vinho, 'safra', g.safra, 'formato', g.formato, 'situacao', wlr_situacao(g)))
      from wlr_garrafa_membros m join wlr_garrafas g on g.id = m.garrafa_id where m.participante_id = p.id), '[]'::jsonb)))
  from wlr_participantes p where p.confirmado;
$$;

-- ── triggers ────────────────────────────────────────────────────────────
create or replace function wlr_trg_titulo_participante() returns trigger language plpgsql as $$
begin new.nome := wlr_titulo(new.nome); return new; end $$;
create or replace function wlr_trg_titulo_garrafa() returns trigger language plpgsql as $$
begin
  new.vinho := wlr_titulo(new.vinho); new.produtor := wlr_titulo(new.produtor); new.regiao := wlr_titulo(new.regiao);
  return new;
end $$;

create or replace function wlr_trg_confirmou() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.confirmado and not old.confirmado then
    perform wlr_email_enqueue('boas-vindas', new.email, jsonb_build_object('nome', new.nome, 'participante_id', new.id));
  end if;
  return new;
end $$;

create or replace function wlr_trg_garrafa_nova() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_email text; v_nome text;
begin
  select email, nome into v_email, v_nome from wlr_participantes where id = new.criado_por;
  perform wlr_email_enqueue('garrafa-registrada', v_email, jsonb_build_object('nome', v_nome, 'participante_id', new.criado_por,
    'vinho', new.vinho, 'safra', new.safra, 'formato', new.formato, 'litros', new.litros, 'tipo', new.tipo));
  perform wlr_cutuca('analise', new.id);
  return new;
end $$;

create or replace function wlr_trg_cutuca_fila() returns trigger
language plpgsql security definer set search_path = public as $$
begin perform wlr_cutuca('fila'); return null; end $$;

create or replace function wlr_trg_comprovante() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_tes text;
begin
  if new.comprovante_url is not null and new.comprovante_url is distinct from old.comprovante_url then
    perform wlr_email_enqueue('comprovante-recebido', new.email, jsonb_build_object('nome', new.nome, 'participante_id', new.id));
    select email_tesoureiro into v_tes from wlr_config where id = 1;
    perform wlr_email_enqueue('comprovante-tesoureiro', v_tes, jsonb_build_object(
      'nome', new.nome, 'url', new.comprovante_url, 'participante_id', new.id));
  end if;
  return new;
end $$;

create or replace function wlr_trg_pago() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pago and not old.pago then
    perform wlr_email_enqueue('pagamento-confirmado', new.email, jsonb_build_object('nome', new.nome, 'participante_id', new.id));
  end if;
  return new;
end $$;

create or replace function wlr_trg_config() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.chave_pix is not null and new.valor_rateio is not null and (old.chave_pix is null or old.valor_rateio is null) then
    perform wlr_email_enqueue('rateio-definido', p.email, jsonb_build_object('nome', p.nome, 'participante_id', p.id))
    from wlr_participantes p where p.confirmado and not p.pago;
  end if;
  if new.votacao_aberta and not old.votacao_aberta then
    perform wlr_email_enqueue('votacao-aberta', p.email, jsonb_build_object('nome', p.nome, 'participante_id', p.id))
    from wlr_participantes p where p.confirmado;
  end if;
  if new.resultados_publicos and not old.resultados_publicos then
    perform wlr_email_enqueue('resultados', p.email, jsonb_build_object('nome', p.nome, 'participante_id', p.id))
    from wlr_participantes p where p.confirmado;
  end if;
  return new;
end $$;

drop trigger if exists wlr_aa_titulo on wlr_participantes;
create trigger wlr_aa_titulo before insert or update of nome on wlr_participantes for each row execute function wlr_trg_titulo_participante();
drop trigger if exists wlr_aa_titulo_g on wlr_garrafas;
create trigger wlr_aa_titulo_g before insert or update of vinho, produtor, regiao on wlr_garrafas for each row execute function wlr_trg_titulo_garrafa();
drop trigger if exists wlr_confirmou on wlr_participantes;
create trigger wlr_confirmou after update of confirmado on wlr_participantes for each row execute function wlr_trg_confirmou();
drop trigger if exists wlr_garrafa_nova on wlr_garrafas;
create trigger wlr_garrafa_nova after insert on wlr_garrafas for each row execute function wlr_trg_garrafa_nova();
drop trigger if exists wlr_cutuca_email on wlr_emails;
create trigger wlr_cutuca_email after insert on wlr_emails for each statement execute function wlr_trg_cutuca_fila();
drop trigger if exists wlr_comprovante on wlr_participantes;
create trigger wlr_comprovante after update of comprovante_url on wlr_participantes for each row execute function wlr_trg_comprovante();
drop trigger if exists wlr_pago on wlr_participantes;
create trigger wlr_pago after update on wlr_participantes for each row execute function wlr_trg_pago();
drop trigger if exists wlr_config_email on wlr_config;
create trigger wlr_config_email after update on wlr_config for each row execute function wlr_trg_config();

-- ── storage ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('wlr', 'wlr', true) on conflict (id) do nothing;
drop policy if exists "wlr leitura" on storage.objects;
create policy "wlr leitura" on storage.objects for select to anon, authenticated using (bucket_id = 'wlr');
drop policy if exists "wlr upload comprovante" on storage.objects;
create policy "wlr upload comprovante" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'wlr' and (storage.foldername(name))[1] = 'comprovantes');
drop policy if exists "wlr upload foto vinho" on storage.objects;
create policy "wlr upload foto vinho" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'wlr' and (storage.foldername(name))[1] = 'fotos-vinhos');

-- ── dados iniciais ──────────────────────────────────────────────────────
insert into wlr_config (id, admin_token) values (1, '__ADMIN_TOKEN__') on conflict (id) do nothing;

insert into wlr_categorias (nome, tipo_filtro, ordem) values
  ('Melhor Vinho da Noite', null, 1), ('Melhor Tinto', 'Tinto', 2),
  ('Melhor Branco', 'Branco', 3), ('Melhor Espumante', 'Espumante', 4)
on conflict do nothing;
