-- Magnum Fest: fluxo de e-mails editável pelo painel do conselho.
-- Cada e-mail é um modelo (assunto/título/corpo/botão em PT, ES e EN). O worker monta o e-mail
-- a partir do modelo, no idioma do confrade, trocando {campos} e {{blocos}} pelos dados.

alter table wlr_participantes add column if not exists idioma text not null default 'pt';
alter table wlr_config add column if not exists email_resposta text;

create table if not exists wlr_email_modelos (
  tipo text primary key,
  nome text not null,
  quando text not null,             -- descrição do gatilho, para o painel
  publico text not null,            -- confirmados | sem_magnum | conselho | um | automatico
  ordem int not null default 0,
  ativo boolean not null default true,
  automatico boolean not null default false,   -- disparado por evento do sistema (não por agenda)
  textos jsonb not null default '{}',          -- { pt: {assunto,titulo,corpo,botao}, es: {...}, en: {...} }
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);
alter table wlr_email_modelos enable row level security;

-- ── confirmação guarda o idioma escolhido no site ────────────────────────
drop function if exists wlr_rsvp(text, text, text, text);
create or replace function wlr_rsvp(p_nome text, p_whatsapp text, p_email text, p_obs text default null, p_idioma text default 'pt')
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
    idioma = case when p_idioma in ('pt', 'es', 'en') then p_idioma else idioma end,
    confirmado = true,
    confirmado_em = coalesce(confirmado_em, now())
  where id = v.id;
  return v.id;
end $$;

-- o painel lembra o idioma de quem já confirmou e troca de língua depois
create or replace function wlr_set_idioma(p_participante uuid, p_idioma text) returns void
language sql security definer set search_path = public as $$
  update wlr_participantes set idioma = p_idioma where id = p_participante and p_idioma in ('pt', 'es', 'en');
$$;

-- ── painel: modelos e envios ─────────────────────────────────────────────
create or replace function wlr_admin_modelos(p_token text)
returns table(tipo text, nome text, quando text, publico text, ordem int, ativo boolean, automatico boolean,
  textos jsonb, atualizado_em timestamptz, atualizado_por text, enviados bigint, pendentes bigint, ultimo_envio timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  return query
    select m.tipo, m.nome, m.quando, m.publico, m.ordem, m.ativo, m.automatico, m.textos, m.atualizado_em, m.atualizado_por,
           (select count(*) from wlr_emails e where e.tipo = m.tipo and e.status = 'enviado'),
           (select count(*) from wlr_emails e where e.tipo = m.tipo and e.status = 'pendente'),
           (select max(e.enviado_em) from wlr_emails e where e.tipo = m.tipo)
    from wlr_email_modelos m order by m.ordem;
end $$;

create or replace function wlr_admin_modelo_salvar(p_token text, p_tipo text, p_idioma text, p_textos jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_quem text;
begin
  v_quem := wlr_admin_check(p_token);
  if p_idioma not in ('pt', 'es', 'en') then raise exception 'Idioma inválido'; end if;
  update wlr_email_modelos set textos = jsonb_set(textos, array[p_idioma], p_textos, true),
    atualizado_em = now(), atualizado_por = v_quem
  where tipo = p_tipo;
  if not found then raise exception 'Modelo não encontrado'; end if;
end $$;

create or replace function wlr_admin_modelo_ativo(p_token text, p_tipo text, p_ativo boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wlr_admin_check(p_token);
  update wlr_email_modelos set ativo = p_ativo where tipo = p_tipo;
end $$;

-- ── agenda do fluxo (chama o worker; ele respeita "ativo" e o público do modelo) ──
select cron.unschedule(jobname) from cron.job
 where jobname in ('wlr-resumo-semanal', 'wlr-lembrete-1mes', 'wlr-lembrete-1semana', 'wlr-lembrete-hoje');
