-- Magnum Fest: sem rateio antecipado — o restaurante cobra no dia.
-- O site mostra só o valor por pessoa e o cardápio (texto livre), editáveis no painel do conselho.
alter table wlr_config add column if not exists valor_no_dia numeric;
alter table wlr_config add column if not exists cardapio text;

drop view if exists wlr_config_publica;
create view wlr_config_publica as
  select rsvp_aberto, votacao_aberta, resultados_publicos, premio1, evento_em, hora_confirmada,
         local_nome, local_detalhe, urna_fecha_em, meta_confrades, lim_espumantes, lim_espumante_rose, lim_doces,
         valor_no_dia, cardapio
  from wlr_config;
grant select on wlr_config_publica to anon, authenticated;

drop function if exists wlr_admin_config(text, text, text, numeric, boolean, boolean, boolean, text, int, timestamptz, boolean, text, text, timestamptz, text);
create or replace function wlr_admin_config(p_token text, p_aberto boolean, p_votacao boolean default null,
  p_resultados boolean default null, p_premio1 text default null, p_meta int default null,
  p_evento_em timestamptz default null, p_hora_confirmada boolean default null, p_local_nome text default null,
  p_local_detalhe text default null, p_urna_fecha_em timestamptz default null,
  p_valor_no_dia numeric default null, p_cardapio text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  update wlr_config set rsvp_aberto = p_aberto,
    votacao_aberta = coalesce(p_votacao, votacao_aberta),
    resultados_publicos = coalesce(p_resultados, resultados_publicos),
    premio1 = case when p_premio1 is null then premio1 else nullif(trim(p_premio1), '') end,
    meta_confrades = case when p_meta is null then meta_confrades when p_meta <= 0 then null else p_meta end,
    evento_em = coalesce(p_evento_em, evento_em),
    hora_confirmada = coalesce(p_hora_confirmada, hora_confirmada),
    local_nome = coalesce(nullif(trim(p_local_nome), ''), local_nome),
    local_detalhe = coalesce(nullif(trim(p_local_detalhe), ''), local_detalhe),
    urna_fecha_em = coalesce(p_urna_fecha_em, urna_fecha_em),
    valor_no_dia = case when p_valor_no_dia is null or p_valor_no_dia <= 0 then null else p_valor_no_dia end,
    cardapio = nullif(trim(coalesce(p_cardapio, '')), '')
  where id = 1;
end $$;

-- "Meu Painel": quem foi confirmado pelo organizador ainda não tem WhatsApp ligado — orientar a usar o formulário
create or replace function wlr_entrar(p_whatsapp text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_dig text;
begin
  v_dig := right(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), 8);
  if length(v_dig) < 8 then raise exception 'Informe um WhatsApp válido, com DDD'; end if;
  select id into v_id from wlr_participantes
   where confirmado and right(regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g'), 8) = v_dig limit 1;
  if v_id is null then
    raise exception 'Primeira vez aqui? Feche esta janela, escolha o seu nome no formulário e informe o WhatsApp — o painel abre na hora';
  end if;
  return v_id;
end $$;
