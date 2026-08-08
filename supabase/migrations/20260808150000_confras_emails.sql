-- A Confra das Confras — fluxo de e-mails automáticos + pago na lista pública

-- lista pública de confirmados agora mostra o status de pagamento
drop view if exists public.confras_confirmados;
create view public.confras_confirmados as
  select nome, confrarias, pago, criado_em from public.confras_participantes order by criado_em;
grant select on public.confras_confirmados to anon, authenticated;

-- ── fila de e-mails ──────────────────────────────────────────────────────
create table if not exists public.confras_emails (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,          -- boas-vindas | garrafa-registrada | rateio-definido | pagamento-confirmado | votacao-aberta | resultados | lembrete
  para text not null,
  dados jsonb not null default '{}',
  status text not null default 'pendente',   -- pendente | enviado | erro
  tentativas int not null default 0,
  erro text,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz
);
alter table public.confras_emails enable row level security;
revoke all on public.confras_emails from anon, authenticated;

create or replace function public.confras_email_enqueue(p_tipo text, p_para text, p_dados jsonb)
returns void language sql security definer set search_path = public as $$
  insert into confras_emails (tipo, para, dados)
  select p_tipo, p_para, coalesce(p_dados, '{}')
  where coalesce(trim(p_para), '') <> '';
$$;

-- ── gatilhos ─────────────────────────────────────────────────────────────
create or replace function public.confras_trg_participante_novo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform confras_email_enqueue('boas-vindas', new.email,
    jsonb_build_object('nome', new.nome, 'participante_id', new.id));
  return new;
end $$;
drop trigger if exists confras_participante_novo on public.confras_participantes;
create trigger confras_participante_novo after insert on public.confras_participantes
  for each row execute function public.confras_trg_participante_novo();

create or replace function public.confras_trg_pago() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pago and not old.pago then
    perform confras_email_enqueue('pagamento-confirmado', new.email,
      jsonb_build_object('nome', new.nome, 'participante_id', new.id));
  end if;
  return new;
end $$;
drop trigger if exists confras_pago on public.confras_participantes;
create trigger confras_pago after update on public.confras_participantes
  for each row execute function public.confras_trg_pago();

create or replace function public.confras_trg_garrafa_nova() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_email text; v_nome text;
begin
  select email, nome into v_email, v_nome from confras_participantes where id = new.criado_por;
  perform confras_email_enqueue('garrafa-registrada', v_email,
    jsonb_build_object('nome', v_nome, 'participante_id', new.criado_por,
      'vinho', new.vinho, 'safra', new.safra, 'formato', new.formato,
      'litros', new.litros, 'tipo', new.tipo));
  return new;
end $$;
drop trigger if exists confras_garrafa_nova on public.confras_garrafas;
create trigger confras_garrafa_nova after insert on public.confras_garrafas
  for each row execute function public.confras_trg_garrafa_nova();

create or replace function public.confras_trg_config() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- pix completo (chave + valor) pela primeira vez -> avisa quem ainda não pagou
  if new.chave_pix is not null and new.valor_rateio is not null
     and (old.chave_pix is null or old.valor_rateio is null) then
    perform confras_email_enqueue('rateio-definido', p.email,
      jsonb_build_object('nome', p.nome, 'participante_id', p.id))
    from confras_participantes p where not p.pago;
  end if;
  if new.votacao_aberta and not old.votacao_aberta then
    perform confras_email_enqueue('votacao-aberta', p.email,
      jsonb_build_object('nome', p.nome, 'participante_id', p.id))
    from confras_participantes p;
  end if;
  if new.resultados_publicos and not old.resultados_publicos then
    perform confras_email_enqueue('resultados', p.email,
      jsonb_build_object('nome', p.nome, 'participante_id', p.id))
    from confras_participantes p;
  end if;
  return new;
end $$;
drop trigger if exists confras_config_email on public.confras_config;
create trigger confras_config_email after update on public.confras_config
  for each row execute function public.confras_trg_config();

-- ── lembretes agendados (chamados pelo pg_cron) ──────────────────────────
create or replace function public.confras_enqueue_lembrete()
returns void language sql security definer set search_path = public as $$
  select public.confras_email_enqueue('lembrete', p.email,
    jsonb_build_object('nome', p.nome, 'participante_id', p.id, 'pago', p.pago,
      'garrafas', coalesce((
        select jsonb_agg(jsonb_build_object('vinho', g.vinho, 'safra', g.safra, 'formato', g.formato))
        from confras_garrafa_membros m join confras_garrafas g on g.id = m.garrafa_id
        where m.participante_id = p.id), '[]'::jsonb)))
  from confras_participantes p;
$$;
