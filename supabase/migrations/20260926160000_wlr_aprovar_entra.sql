-- Magnum Fest: o link do e-mail também faz entrar o navegador onde foi aberto
-- (no iPhone o link costuma abrir no navegador do app de e-mail, que não compartilha nada com o Safari).
drop function if exists wlr_aprovar_dispositivo(text);
create or replace function wlr_aprovar_dispositivo(p_token text, p_disp text default null, p_aparelho text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v wlr_dispositivos; v_nome text;
begin
  select * into v from wlr_dispositivos where token_aprov = p_token;
  if v.id is null then raise exception 'Link de aprovação inválido ou já usado'; end if;
  if v.token_expira < now() then raise exception 'Este link expirou — digite o seu WhatsApp de novo para receber outro'; end if;
  update wlr_dispositivos set aprovado = true, aprovado_em = now(), token_aprov = null, token_expira = null where id = v.id;
  -- quem abriu o link do e-mail é o dono do e-mail: este navegador também fica aprovado
  if length(coalesce(p_disp, '')) >= 20 then
    insert into wlr_dispositivos (participante_id, disp_hash, aparelho, aprovado, aprovado_em, ultimo_uso)
    values (v.participante_id, wlr_hash(p_disp), left(coalesce(p_aparelho, 'link do e-mail'), 80), true, now(), now())
    on conflict (participante_id, disp_hash) do update set aprovado = true, aprovado_em = coalesce(wlr_dispositivos.aprovado_em, now()), ultimo_uso = now();
  end if;
  select nome into v_nome from wlr_participantes where id = v.participante_id;
  return jsonb_build_object('ok', true, 'nome', v_nome, 'aparelho', v.aparelho,
    'id', case when length(coalesce(p_disp, '')) >= 20 then v.participante_id end);
end $$;
