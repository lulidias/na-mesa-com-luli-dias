-- Confra das Confras — dividir garrafa agora exige aprovação do dono
-- (o acerto financeiro é combinado no privado; o site só organiza os pedidos)

create table if not exists public.confras_garrafa_pedidos (
  garrafa_id uuid not null references public.confras_garrafas(id) on delete cascade,
  participante_id uuid not null references public.confras_participantes(id) on delete cascade,
  status text not null default 'pendente',   -- pendente | aceito | recusado
  criado_em timestamptz not null default now(),
  primary key (garrafa_id, participante_id)
);
alter table public.confras_garrafa_pedidos enable row level security;
revoke all on public.confras_garrafa_pedidos from anon, authenticated;

-- pedir para dividir (não ocupa vaga; avisa o dono por e-mail com o WhatsApp do solicitante)
create or replace function public.confras_pedir_garrafa(p_participante uuid, p_garrafa uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_sol record; v_g record; v_dono record;
begin
  select * into v_sol from confras_participantes where id = p_participante;
  if v_sol is null then raise exception 'Confirme sua presença primeiro'; end if;
  select * into v_g from confras_garrafas where id = p_garrafa;
  if v_g is null then raise exception 'Garrafa não encontrada'; end if;
  if v_g.criado_por = p_participante then raise exception 'Você já é o dono desta garrafa'; end if;
  if exists (select 1 from confras_garrafa_membros where garrafa_id = p_garrafa and participante_id = p_participante) then
    raise exception 'Você já está nesta garrafa';
  end if;
  if (select v_g.vagas - count(*) from confras_garrafa_membros where garrafa_id = p_garrafa) <= 0 then
    raise exception 'Esta garrafa já está completa';
  end if;
  insert into confras_garrafa_pedidos (garrafa_id, participante_id)
  values (p_garrafa, p_participante)
  on conflict (garrafa_id, participante_id) do update set status = 'pendente', criado_em = now();

  select * into v_dono from confras_participantes where id = v_g.criado_por;
  if v_dono.email is not null then
    perform confras_email_enqueue('pedido-garrafa', v_dono.email, jsonb_build_object(
      'nome', v_dono.nome, 'participante_id', v_dono.id,
      'solicitante', v_sol.nome, 'solicitante_zap', v_sol.whatsapp,
      'vinho', v_g.vinho, 'safra', v_g.safra, 'formato', v_g.formato));
  end if;
end $$;
grant execute on function public.confras_pedir_garrafa(uuid, uuid) to anon, authenticated;

-- dono responde: aceitar entra no grupo; recusar libera com aviso gentil
create or replace function public.confras_responder_pedido(p_criador uuid, p_garrafa uuid, p_solicitante uuid, p_aceitar boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare v_g record; v_sol record;
begin
  select * into v_g from confras_garrafas where id = p_garrafa;
  if v_g is null or v_g.criado_por is distinct from p_criador then
    raise exception 'Só o dono da garrafa pode responder pedidos';
  end if;
  if not exists (select 1 from confras_garrafa_pedidos
                 where garrafa_id = p_garrafa and participante_id = p_solicitante and status = 'pendente') then
    raise exception 'Pedido não encontrado';
  end if;
  select * into v_sol from confras_participantes where id = p_solicitante;
  if p_aceitar then
    if (select v_g.vagas - count(*) from confras_garrafa_membros where garrafa_id = p_garrafa) <= 0 then
      raise exception 'A garrafa já está completa';
    end if;
    insert into confras_garrafa_membros (garrafa_id, participante_id)
    values (p_garrafa, p_solicitante) on conflict do nothing;
    update confras_garrafa_pedidos set status = 'aceito'
    where garrafa_id = p_garrafa and participante_id = p_solicitante;
    if v_sol.email is not null then
      perform confras_email_enqueue('pedido-aceito', v_sol.email, jsonb_build_object(
        'nome', v_sol.nome, 'participante_id', v_sol.id,
        'vinho', v_g.vinho, 'safra', v_g.safra, 'formato', v_g.formato));
    end if;
  else
    update confras_garrafa_pedidos set status = 'recusado'
    where garrafa_id = p_garrafa and participante_id = p_solicitante;
    if v_sol.email is not null then
      perform confras_email_enqueue('pedido-recusado', v_sol.email, jsonb_build_object(
        'nome', v_sol.nome, 'participante_id', v_sol.id, 'vinho', v_g.vinho));
    end if;
  end if;
end $$;
grant execute on function public.confras_responder_pedido(uuid, uuid, uuid, boolean) to anon, authenticated;

-- pedidos que EU fiz (para o card mostrar "aguardando")
create or replace function public.confras_meus_pedidos(p_participante uuid)
returns table (garrafa_id uuid, status text)
language sql security definer set search_path = public as $$
  select garrafa_id, status from confras_garrafa_pedidos where participante_id = p_participante;
$$;
grant execute on function public.confras_meus_pedidos(uuid) to anon, authenticated;

-- pedidos pendentes das MINHAS garrafas (com o WhatsApp do solicitante — só o dono vê)
create or replace function public.confras_pedidos_recebidos(p_participante uuid)
returns table (garrafa_id uuid, vinho text, solicitante_id uuid, solicitante text, whatsapp text)
language sql security definer set search_path = public as $$
  select g.id, g.vinho, p.id, p.nome, p.whatsapp
  from confras_garrafa_pedidos pd
  join confras_garrafas g on g.id = pd.garrafa_id and g.criado_por = p_participante
  join confras_participantes p on p.id = pd.participante_id
  where pd.status = 'pendente'
  order by pd.criado_em;
$$;
grant execute on function public.confras_pedidos_recebidos(uuid) to anon, authenticated;
