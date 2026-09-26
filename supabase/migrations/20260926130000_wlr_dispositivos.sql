-- Magnum Fest: acesso por telefone + aprovação do dispositivo por e-mail.
-- O telefone identifica o membro; o e-mail comprova que é ele. Cada navegador guarda um segredo
-- (wlr_disp) e só recebe a "sessão" (id do membro) depois que aquele dispositivo for aprovado.

create table if not exists wlr_dispositivos (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references wlr_participantes(id) on delete cascade,
  disp_hash text not null,                 -- sha256 do segredo do navegador
  aparelho text,                           -- descrição amigável (ex.: iPhone · Safari)
  aprovado boolean not null default false,
  token_aprov text unique,                 -- vai no link do e-mail
  token_expira timestamptz,
  pedido_em timestamptz not null default now(),
  aprovado_em timestamptz,
  ultimo_uso timestamptz,
  unique (participante_id, disp_hash)
);
alter table wlr_dispositivos enable row level security;

create or replace function wlr_hash(t text) returns text language sql immutable as $$
  select encode(sha256(convert_to(coalesce(t, ''), 'UTF8')), 'hex');
$$;

create or replace function wlr_mascara_email(e text) returns text language sql immutable as $$
  select case when e is null or position('@' in e) = 0 then null
    else left(e, 1) || repeat('•', greatest(position('@' in e) - 2, 1)) || substr(e, position('@' in e)) end;
$$;

create or replace function wlr__membro_por_telefone(p_whatsapp text) returns wlr_participantes
language sql stable security definer set search_path = public as $$
  select p.* from wlr_participantes p
  where length(wlr_dig8(p_whatsapp)) = 8
    and (wlr_na_lista(p.whatsapp_lista, wlr_dig8(p_whatsapp)) or wlr_dig8(p.whatsapp) = wlr_dig8(p_whatsapp))
  order by (wlr_dig8(p.whatsapp) = wlr_dig8(p_whatsapp)) desc
  limit 1;
$$;
revoke execute on function wlr__membro_por_telefone(text) from public, anon, authenticated;

-- cria/renova o pedido de aprovação e manda o e-mail (no máximo 1 e-mail por minuto por dispositivo)
create or replace function wlr__pedir_aprovacao(p wlr_participantes, p_disp text, p_aparelho text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v wlr_dispositivos; v_token text;
begin
  select * into v from wlr_dispositivos where participante_id = p.id and disp_hash = wlr_hash(p_disp);
  if v.id is not null and v.token_expira > now() and v.pedido_em > now() - interval '60 seconds' then
    return jsonb_build_object('estado', 'aguardando', 'email', wlr_mascara_email(p.email), 'reenviado', false);
  end if;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into wlr_dispositivos (participante_id, disp_hash, aparelho, token_aprov, token_expira, pedido_em)
  values (p.id, wlr_hash(p_disp), left(p_aparelho, 80), v_token, now() + interval '30 minutes', now())
  on conflict (participante_id, disp_hash) do update
    set token_aprov = excluded.token_aprov, token_expira = excluded.token_expira, pedido_em = now(), aparelho = excluded.aparelho;
  perform wlr_email_enqueue('aprovar-dispositivo', p.email, jsonb_build_object(
    'nome', p.nome, 'participante_id', p.id, 'token', v_token, 'aparelho', left(p_aparelho, 80), 'idioma', p.idioma));
  return jsonb_build_object('estado', 'aguardando', 'email', wlr_mascara_email(p.email), 'reenviado', true);
end $$;
revoke execute on function wlr__pedir_aprovacao(wlr_participantes, text, text) from public, anon, authenticated;

-- porta de entrada: telefone + segredo do navegador
create or replace function wlr_porta(p_whatsapp text, p_disp text, p_aparelho text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p wlr_participantes; v wlr_dispositivos;
begin
  if length(wlr_dig8(p_whatsapp)) < 8 then raise exception 'Informe um WhatsApp válido, com DDD'; end if;
  if length(coalesce(p_disp, '')) < 20 then raise exception 'Dispositivo inválido — recarregue a página'; end if;
  p := wlr__membro_por_telefone(p_whatsapp);
  if p.id is null then
    raise exception 'Este WhatsApp não está na lista de membros da Wine Lovers Recife. Fale com o organizador.';
  end if;
  select * into v from wlr_dispositivos where participante_id = p.id and disp_hash = wlr_hash(p_disp) and aprovado;
  if v.id is not null then
    update wlr_dispositivos set ultimo_uso = now() where id = v.id;
    return jsonb_build_object('estado', 'ok', 'id', p.id);
  end if;
  if p.email is null then
    return jsonb_build_object('estado', 'cadastro', 'nome', p.nome);
  end if;
  return wlr__pedir_aprovacao(p, p_disp, p_aparelho);
end $$;

-- primeira vez: o membro informa o e-mail (e os dados) e recebe o pedido de aprovação
create or replace function wlr_porta_cadastro(p_whatsapp text, p_disp text, p_aparelho text, p_email text,
  p_obs text default null, p_idioma text default 'pt') returns jsonb
language plpgsql security definer set search_path = public as $$
declare p wlr_participantes;
begin
  p := wlr__membro_por_telefone(p_whatsapp);
  if p.id is null then raise exception 'Este WhatsApp não está na lista de membros da Wine Lovers Recife. Fale com o organizador.'; end if;
  if p.email is not null then return wlr_porta(p_whatsapp, p_disp, p_aparelho); end if;
  if coalesce(trim(p_email), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Informe um e-mail válido'; end if;
  update wlr_participantes set email = lower(trim(p_email)),
    obs = coalesce(nullif(trim(coalesce(p_obs, '')), ''), obs),
    idioma = case when p_idioma in ('pt', 'es', 'en') then p_idioma else idioma end
  where id = p.id returning * into p;
  return wlr__pedir_aprovacao(p, p_disp, p_aparelho);
end $$;

-- a tela que espera pergunta se já foi aprovado
create or replace function wlr_porta_status(p_whatsapp text, p_disp text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p wlr_participantes;
begin
  p := wlr__membro_por_telefone(p_whatsapp);
  if p.id is null then return jsonb_build_object('estado', 'erro'); end if;
  if exists (select 1 from wlr_dispositivos where participante_id = p.id and disp_hash = wlr_hash(p_disp) and aprovado) then
    return jsonb_build_object('estado', 'ok', 'id', p.id);
  end if;
  return jsonb_build_object('estado', 'aguardando');
end $$;

-- o botão do e-mail
create or replace function wlr_aprovar_dispositivo(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v wlr_dispositivos; v_nome text;
begin
  select * into v from wlr_dispositivos where token_aprov = p_token;
  if v.id is null then raise exception 'Link de aprovação inválido ou já usado'; end if;
  if v.token_expira < now() then raise exception 'Este link expirou — digite o seu WhatsApp de novo para receber outro'; end if;
  update wlr_dispositivos set aprovado = true, aprovado_em = now(), token_aprov = null, token_expira = null where id = v.id;
  select nome into v_nome from wlr_participantes where id = v.participante_id;
  return jsonb_build_object('ok', true, 'nome', v_nome, 'aparelho', v.aparelho);
end $$;

-- links dos e-mails do sistema (?id=) chegam só na caixa do membro: valem como aprovação deste navegador
create or replace function wlr_disp_pelo_link(p_id uuid, p_disp text, p_aparelho text default null) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from wlr_participantes where id = p_id) or length(coalesce(p_disp, '')) < 20 then return false; end if;
  insert into wlr_dispositivos (participante_id, disp_hash, aparelho, aprovado, aprovado_em, ultimo_uso)
  values (p_id, wlr_hash(p_disp), left(p_aparelho, 80), true, now(), now())
  on conflict (participante_id, disp_hash) do update set aprovado = true, aprovado_em = coalesce(wlr_dispositivos.aprovado_em, now()), ultimo_uso = now();
  return true;
end $$;

-- identidade de quem já entrou (com a sessão)
drop function if exists wlr_quem(uuid);
create or replace function wlr_quem(p_id uuid) returns table(nome text, confirmado boolean, email text, obs text, idioma text)
language sql stable security definer set search_path = public as $$
  select nome, confirmado, email, obs, idioma from wlr_participantes where id = p_id;
$$;

-- confirmar presença com a sessão (substitui o antigo wlr_rsvp por nome + telefone)
create or replace function wlr_confirmar(p_id uuid, p_email text default null, p_obs text default null, p_idioma text default 'pt') returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if not (select rsvp_aberto from wlr_config where id = 1) then raise exception 'Confirmações encerradas'; end if;
  update wlr_participantes set
    email = coalesce(nullif(lower(trim(coalesce(p_email, ''))), ''), email),
    obs = coalesce(nullif(trim(coalesce(p_obs, '')), ''), obs),
    idioma = case when p_idioma in ('pt', 'es', 'en') then p_idioma else idioma end,
    confirmado = true, confirmado_em = coalesce(confirmado_em, now())
  where id = p_id;
  if not found then raise exception 'Sessão inválida — entre de novo'; end if;
  return p_id;
end $$;

-- as portas antigas (só telefone, ou nome + telefone) deixam de existir para o público
revoke execute on function wlr_acesso(text) from public, anon, authenticated;
revoke execute on function wlr_entrar(text) from public, anon, authenticated;
revoke execute on function wlr_rsvp(text, text, text, text, text) from public, anon, authenticated;

-- painel: aparelhos de cada membro, desconectar e corrigir e-mail
create or replace function wlr_admin_dispositivos(p_token text) returns table(participante_id uuid, aprovados bigint, ultimo timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return query select d.participante_id, count(*) filter (where d.aprovado), max(d.ultimo_uso)
    from wlr_dispositivos d group by d.participante_id;
end $$;

create or replace function wlr_admin_desconectar(p_token text, p_participante uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  delete from wlr_dispositivos where participante_id = p_participante;
end $$;

create or replace function wlr_admin_email(p_token text, p_participante uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  if nullif(trim(coalesce(p_email, '')), '') is not null and trim(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido'; end if;
  update wlr_participantes set email = nullif(lower(trim(coalesce(p_email, ''))), '') where id = p_participante;
  -- e-mail trocado = aparelhos antigos precisam de nova aprovação
  delete from wlr_dispositivos where participante_id = p_participante;
end $$;
