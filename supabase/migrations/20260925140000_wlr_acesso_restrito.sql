-- Magnum Fest: site só para membros. Cada membro tem o WhatsApp da lista do grupo (whatsapp_lista);
-- com acesso_restrito ligado, só entra quem digitar um número da lista, e os dados (carta, confirmados,
-- membros) deixam de sair por views públicas — só por RPC com a "sessão" (id do membro).

alter table wlr_participantes add column if not exists whatsapp_lista text;
alter table wlr_config add column if not exists acesso_restrito boolean not null default false;

drop view if exists wlr_config_publica;
create view wlr_config_publica as
  select rsvp_aberto, votacao_aberta, resultados_publicos, premio1, evento_em, hora_confirmada,
         local_nome, local_detalhe, urna_fecha_em, meta_confrades, lim_espumantes, lim_espumante_rose, lim_doces,
         valor_no_dia, cardapio, acesso_restrito
  from wlr_config;
grant select on wlr_config_publica to anon, authenticated;

-- as views com nomes/vinhos saem do acesso anônimo; o site passa a usar as RPCs abaixo
revoke select on wlr_vinhos_publico, wlr_confirmados, wlr_membros from anon, authenticated;

create or replace function wlr_dig8(t text) returns text language sql immutable as $$
  select right(regexp_replace(coalesce(t, ''), '\D', '', 'g'), 8);
$$;

-- a sessão vale se o site estiver aberto, ou se o id for de um membro
create or replace function wlr_sessao_ok(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not (select acesso_restrito from wlr_config where id = 1)
      or exists (select 1 from wlr_participantes where id = p_id);
$$;

-- porta de entrada: WhatsApp da lista (ou o já ligado na confirmação) → id do membro
create or replace function wlr_acesso(p_whatsapp text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_dig text;
begin
  v_dig := wlr_dig8(p_whatsapp);
  if length(v_dig) < 8 then raise exception 'Informe um WhatsApp válido, com DDD'; end if;
  select id into v_id from wlr_participantes
   where wlr_dig8(whatsapp_lista) = v_dig or wlr_dig8(whatsapp) = v_dig
   order by (wlr_dig8(whatsapp) = v_dig) desc limit 1;
  if v_id is null then
    raise exception 'Este WhatsApp não está na lista de membros da Wine Lovers Recife. Fale com o organizador.';
  end if;
  return v_id;
end $$;

create or replace function wlr_p_vinhos(p_id uuid default null) returns setof wlr_vinhos_publico
language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return query select * from wlr_vinhos_publico;
end $$;

create or replace function wlr_p_confirmados(p_id uuid default null) returns setof wlr_confirmados
language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return query select * from wlr_confirmados;
end $$;

create or replace function wlr_p_membros(p_id uuid default null) returns setof wlr_membros
language plpgsql stable security definer set search_path = public as $$
begin
  if not wlr_sessao_ok(p_id) then raise exception 'Acesso restrito aos membros'; end if;
  return query select * from wlr_membros;
end $$;

-- identidade do membro que entrou pelo WhatsApp (sem exigir confirmação)
create or replace function wlr_quem(p_id uuid) returns table(nome text, confirmado boolean)
language sql stable security definer set search_path = public as $$
  select nome, confirmado from wlr_participantes where id = p_id;
$$;

-- confirmação: com o site fechado, o nome tem de bater com o WhatsApp da lista
create or replace function wlr_rsvp(p_nome text, p_whatsapp text, p_email text, p_obs text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v record; v_dig text; v_outro uuid; v_restrito boolean;
begin
  if not (select rsvp_aberto from wlr_config where id = 1) then raise exception 'Confirmações encerradas'; end if;
  select acesso_restrito into v_restrito from wlr_config where id = 1;
  v_dig := wlr_dig8(p_whatsapp);
  if length(v_dig) < 8 then raise exception 'Informe um WhatsApp válido, com DDD'; end if;
  select * into v from wlr_participantes where nome = p_nome;
  if v is null then raise exception 'Escolha o seu nome na lista de membros'; end if;
  if v_restrito and v.whatsapp_lista is not null and not wlr_na_lista(v.whatsapp_lista, v_dig) then
    raise exception 'Este WhatsApp não é o de % na lista do grupo', v.nome;
  end if;
  if v.confirmado and v.whatsapp is not null and wlr_dig8(v.whatsapp) <> v_dig then
    raise exception 'Este nome já foi confirmado com outro WhatsApp — fale com o organizador';
  end if;
  select id into v_outro from wlr_participantes where id <> v.id and wlr_dig8(whatsapp) = v_dig limit 1;
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

-- painel: WhatsApp da lista de cada membro + chave liga/desliga
create or replace function wlr_admin_whatsapp_lista(p_token text, p_nome text, p_whatsapp text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  update wlr_participantes set whatsapp_lista = nullif(trim(coalesce(p_whatsapp, '')), '') where nome = p_nome;
  if not found then raise exception 'Membro não encontrado: %', p_nome; end if;
end $$;

create or replace function wlr_admin_acesso_restrito(p_token text, p_ligado boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_mestre(p_token);
  update wlr_config set acesso_restrito = p_ligado where id = 1;
end $$;

-- whatsapp_lista pode ter vários números separados por ";" (a agenda tem mais de um por pessoa)
create or replace function wlr_na_lista(p_lista text, p_dig text) returns boolean language sql immutable as $$
  select exists (select 1 from unnest(string_to_array(coalesce(p_lista, ''), ';')) n where wlr_dig8(n) = p_dig and length(p_dig) = 8);
$$;

create or replace function wlr_acesso(p_whatsapp text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_dig text;
begin
  v_dig := wlr_dig8(p_whatsapp);
  if length(v_dig) < 8 then raise exception 'Informe um WhatsApp válido, com DDD'; end if;
  select id into v_id from wlr_participantes
   where wlr_na_lista(whatsapp_lista, v_dig) or wlr_dig8(whatsapp) = v_dig
   order by (wlr_dig8(whatsapp) = v_dig) desc limit 1;
  if v_id is null then
    raise exception 'Este WhatsApp não está na lista de membros da Wine Lovers Recife. Fale com o organizador.';
  end if;
  return v_id;
end $$;
