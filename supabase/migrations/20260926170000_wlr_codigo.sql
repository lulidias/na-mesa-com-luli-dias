-- Magnum Fest: o e-mail de aprovação leva também um código de 6 dígitos.
-- Digitado na tela que espera, libera AQUELE navegador — resolve o caso do link abrir em outro app/aba.
alter table wlr_dispositivos add column if not exists codigo_hash text, add column if not exists tentativas int not null default 0;

create or replace function wlr__pedir_aprovacao(p wlr_participantes, p_disp text, p_aparelho text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v wlr_dispositivos; v_token text; v_codigo text;
begin
  select * into v from wlr_dispositivos where participante_id = p.id and disp_hash = wlr_hash(p_disp);
  if v.id is not null and v.token_expira > now() and v.pedido_em > now() - interval '60 seconds' then
    return jsonb_build_object('estado', 'aguardando', 'email', wlr_mascara_email(p.email), 'reenviado', false);
  end if;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_codigo := lpad((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0');
  insert into wlr_dispositivos (participante_id, disp_hash, aparelho, token_aprov, token_expira, pedido_em, codigo_hash, tentativas)
  values (p.id, wlr_hash(p_disp), left(p_aparelho, 80), v_token, now() + interval '30 minutes', now(), wlr_hash(v_codigo), 0)
  on conflict (participante_id, disp_hash) do update
    set token_aprov = excluded.token_aprov, token_expira = excluded.token_expira, pedido_em = now(), aparelho = excluded.aparelho,
        codigo_hash = excluded.codigo_hash, tentativas = 0;
  perform wlr_email_enqueue('aprovar-dispositivo', p.email, jsonb_build_object(
    'nome', p.nome, 'participante_id', p.id, 'token', v_token, 'codigo', v_codigo, 'aparelho', left(p_aparelho, 80), 'idioma', p.idioma));
  return jsonb_build_object('estado', 'aguardando', 'email', wlr_mascara_email(p.email), 'reenviado', true);
end $$;
revoke execute on function wlr__pedir_aprovacao(wlr_participantes, text, text) from public, anon, authenticated;

-- o código do e-mail, digitado na tela que espera: aprova o navegador onde foi digitado
create or replace function wlr_porta_codigo(p_whatsapp text, p_disp text, p_codigo text, p_aparelho text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p wlr_participantes; v wlr_dispositivos;
begin
  if length(coalesce(p_disp, '')) < 20 then raise exception 'Dispositivo inválido — recarregue a página'; end if;
  p := wlr__membro_por_telefone(p_whatsapp);
  if p.id is null then raise exception 'Este WhatsApp não está na lista de membros da Wine Lovers Recife. Fale com o organizador.'; end if;
  -- o pedido mais recente ainda válido deste membro (o código vale para qualquer aba/app do mesmo aparelho)
  select * into v from wlr_dispositivos where participante_id = p.id and codigo_hash is not null and token_expira > now()
    order by pedido_em desc limit 1;
  if v.id is null then raise exception 'Código expirado — toque em Reenviar e-mail'; end if;
  if v.tentativas >= 5 then raise exception 'Muitas tentativas — toque em Reenviar e-mail'; end if;
  if v.codigo_hash <> wlr_hash(regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g')) then
    -- devolve em vez de raise: um raise desfaria a contagem de tentativas
    update wlr_dispositivos set tentativas = tentativas + 1 where id = v.id;
    return jsonb_build_object('estado', 'erro', 'msg', 'Código incorreto');
  end if;
  update wlr_dispositivos set aprovado = true, aprovado_em = now(), token_aprov = null, token_expira = null, codigo_hash = null where id = v.id;
  insert into wlr_dispositivos (participante_id, disp_hash, aparelho, aprovado, aprovado_em, ultimo_uso)
  values (p.id, wlr_hash(p_disp), left(coalesce(p_aparelho, v.aparelho), 80), true, now(), now())
  on conflict (participante_id, disp_hash) do update set aprovado = true, aprovado_em = coalesce(wlr_dispositivos.aprovado_em, now()), ultimo_uso = now();
  return jsonb_build_object('estado', 'ok', 'id', p.id);
end $$;

-- o link do e-mail também invalida o código
create or replace function wlr_aprovar_dispositivo(p_token text, p_disp text default null, p_aparelho text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v wlr_dispositivos; v_nome text;
begin
  select * into v from wlr_dispositivos where token_aprov = p_token;
  if v.id is null then raise exception 'Link de aprovação inválido ou já usado'; end if;
  if v.token_expira < now() then raise exception 'Este link expirou — digite o seu WhatsApp de novo para receber outro'; end if;
  update wlr_dispositivos set aprovado = true, aprovado_em = now(), token_aprov = null, token_expira = null, codigo_hash = null where id = v.id;
  if length(coalesce(p_disp, '')) >= 20 then
    insert into wlr_dispositivos (participante_id, disp_hash, aparelho, aprovado, aprovado_em, ultimo_uso)
    values (v.participante_id, wlr_hash(p_disp), left(coalesce(p_aparelho, 'link do e-mail'), 80), true, now(), now())
    on conflict (participante_id, disp_hash) do update set aprovado = true, aprovado_em = coalesce(wlr_dispositivos.aprovado_em, now()), ultimo_uso = now();
  end if;
  select nome into v_nome from wlr_participantes where id = v.participante_id;
  return jsonb_build_object('ok', true, 'nome', v_nome, 'aparelho', v.aparelho,
    'id', case when length(coalesce(p_disp, '')) >= 20 then v.participante_id end);
end $$;

-- o texto do e-mail passa a mostrar o código
update wlr_email_modelos set textos = jsonb_set(jsonb_set(jsonb_set(textos,
  '{pt,corpo}', to_jsonb('Recebemos um pedido para entrar no site da Magnum Fest com o seu WhatsApp, a partir de: **{aparelho}**.

Se foi você, digite este código na tela que está esperando: **{codigo}**

Ou toque no botão abaixo — você entra direto, e este aparelho fica liberado daqui em diante.

Se não foi você, ignore este e-mail: ninguém entra sem essa aprovação. O código e o link valem por 30 minutos.'::text)),
  '{es,corpo}', to_jsonb('Recibimos una solicitud para entrar al sitio de la Magnum Fest con tu WhatsApp, desde: **{aparelho}**.

Si fuiste tú, escribe este código en la pantalla que está esperando: **{codigo}**

O toca el botón de abajo: entras directamente y este dispositivo queda habilitado desde ahora.

Si no fuiste tú, ignora este e-mail: nadie entra sin esta aprobación. El código y el enlace valen por 30 minutos.'::text)),
  '{en,corpo}', to_jsonb('We received a request to sign in to the Magnum Fest site with your WhatsApp number, from: **{aparelho}**.

If it was you, type this code on the waiting screen: **{codigo}**

Or tap the button below: you sign in right away, and this device will be approved from now on.

If it was not you, ignore this email: nobody gets in without this approval. The code and the link are valid for 30 minutes.'::text)),
  atualizado_em = now()
where tipo = 'aprovar-dispositivo';
