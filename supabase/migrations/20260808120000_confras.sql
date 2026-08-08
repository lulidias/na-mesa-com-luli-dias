-- A Confra das Confras 2026 — RSVP, garrafas e rateio
-- Acesso público SÓ via views e funções security definer; tabelas fechadas por RLS.

create table if not exists public.confras_config (
  id int primary key default 1 check (id = 1),
  chave_pix text,
  nome_pix text,
  valor_rateio numeric,          -- null = rateio ainda não definido
  rsvp_aberto boolean not null default true,
  admin_token text not null
);

create table if not exists public.confras_participantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text not null,
  email text,
  confrarias text[] not null check (array_length(confrarias, 1) >= 1),
  obs text,
  pago boolean not null default false,
  pago_em timestamptz,
  comprovante_url text,
  criado_em timestamptz not null default now()
);

create table if not exists public.confras_garrafas (
  id uuid primary key default gen_random_uuid(),
  vinho text not null,
  produtor text,
  safra text,
  formato text not null,
  litros numeric not null check (litros > 0),
  vagas int not null default 1 check (vagas between 1 and 12),
  criado_por uuid references public.confras_participantes(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table if not exists public.confras_garrafa_membros (
  garrafa_id uuid not null references public.confras_garrafas(id) on delete cascade,
  participante_id uuid not null references public.confras_participantes(id) on delete cascade,
  primary key (garrafa_id, participante_id)
);

alter table public.confras_config enable row level security;
alter table public.confras_participantes enable row level security;
alter table public.confras_garrafas enable row level security;
alter table public.confras_garrafa_membros enable row level security;

revoke all on public.confras_config, public.confras_participantes,
  public.confras_garrafas, public.confras_garrafa_membros from anon, authenticated;

-- token real definido diretamente no banco (não versionado — repo é público)
insert into public.confras_config (id, admin_token)
values (1, 'DEFINIR-NO-BANCO')
on conflict (id) do nothing;

-- ── Views públicas (sem PII) ─────────────────────────────────────────────
create or replace view public.confras_config_publica as
  select chave_pix, nome_pix, valor_rateio, rsvp_aberto from public.confras_config;

create or replace view public.confras_confirmados as
  select nome, confrarias, criado_em from public.confras_participantes order by criado_em;

create or replace view public.confras_vinhos_publico as
  select g.id, g.vinho, g.produtor, g.safra, g.formato, g.litros, g.vagas,
         coalesce(array_agg(p.nome order by p.nome) filter (where p.nome is not null), '{}') as membros,
         g.vagas - count(m.participante_id)::int as vagas_restantes
  from public.confras_garrafas g
  left join public.confras_garrafa_membros m on m.garrafa_id = g.id
  left join public.confras_participantes p on p.id = m.participante_id
  group by g.id
  order by g.litros desc, g.criado_em;

grant select on public.confras_config_publica, public.confras_confirmados,
  public.confras_vinhos_publico to anon, authenticated;

-- ── Funções públicas ─────────────────────────────────────────────────────
create or replace function public.confras_rsvp(
  p_nome text, p_whatsapp text, p_email text, p_confrarias text[], p_obs text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not (select rsvp_aberto from confras_config where id = 1) then
    raise exception 'RSVP encerrado';
  end if;
  if coalesce(trim(p_nome), '') = '' or coalesce(trim(p_whatsapp), '') = '' then
    raise exception 'Nome e WhatsApp são obrigatórios';
  end if;
  insert into confras_participantes (nome, whatsapp, email, confrarias, obs)
  values (trim(p_nome), trim(p_whatsapp), nullif(trim(p_email), ''), p_confrarias, nullif(trim(p_obs), ''))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.confras_meu(p_id uuid)
returns table (id uuid, nome text, whatsapp text, email text, confrarias text[],
               pago boolean, comprovante_url text)
language sql security definer set search_path = public as $$
  select id, nome, whatsapp, email, confrarias, pago, comprovante_url
  from confras_participantes where id = p_id;
$$;

create or replace function public.confras_add_garrafa(
  p_participante uuid, p_vinho text, p_produtor text, p_safra text,
  p_formato text, p_litros numeric, p_vagas int
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not exists (select 1 from confras_participantes where id = p_participante) then
    raise exception 'Participante não encontrado';
  end if;
  if coalesce(trim(p_vinho), '') = '' then raise exception 'Informe o vinho'; end if;
  insert into confras_garrafas (vinho, produtor, safra, formato, litros, vagas, criado_por)
  values (trim(p_vinho), nullif(trim(p_produtor), ''), nullif(trim(p_safra), ''),
          p_formato, p_litros, greatest(p_vagas, 1), p_participante)
  returning id into v_id;
  insert into confras_garrafa_membros (garrafa_id, participante_id) values (v_id, p_participante);
  return v_id;
end $$;

create or replace function public.confras_join_garrafa(p_participante uuid, p_garrafa uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from confras_participantes where id = p_participante) then
    raise exception 'Participante não encontrado';
  end if;
  if (select vagas - (select count(*) from confras_garrafa_membros where garrafa_id = p_garrafa)
      from confras_garrafas where id = p_garrafa) <= 0 then
    raise exception 'Esta garrafa já está completa';
  end if;
  insert into confras_garrafa_membros (garrafa_id, participante_id)
  values (p_garrafa, p_participante) on conflict do nothing;
end $$;

create or replace function public.confras_leave_garrafa(p_participante uuid, p_garrafa uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from confras_garrafa_membros where garrafa_id = p_garrafa and participante_id = p_participante;
  -- se o criador saiu e a garrafa ficou vazia, apaga
  delete from confras_garrafas g where g.id = p_garrafa
    and not exists (select 1 from confras_garrafa_membros m where m.garrafa_id = g.id);
end $$;

create or replace function public.confras_minhas_garrafas(p_participante uuid)
returns table (id uuid, vinho text, produtor text, safra text, formato text,
               litros numeric, vagas int, membros text[], sou_criador boolean)
language sql security definer set search_path = public as $$
  select g.id, g.vinho, g.produtor, g.safra, g.formato, g.litros, g.vagas,
         coalesce(array_agg(p2.nome order by p2.nome) filter (where p2.nome is not null), '{}'),
         g.criado_por = p_participante
  from confras_garrafas g
  join confras_garrafa_membros m on m.garrafa_id = g.id and m.participante_id = p_participante
  left join confras_garrafa_membros m2 on m2.garrafa_id = g.id
  left join confras_participantes p2 on p2.id = m2.participante_id
  group by g.id;
$$;

create or replace function public.confras_set_comprovante(p_participante uuid, p_url text)
returns void
language sql security definer set search_path = public as $$
  update confras_participantes set comprovante_url = p_url where id = p_participante;
$$;

-- ── Funções admin (exigem token) ─────────────────────────────────────────
create or replace function public.confras_admin_check(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from confras_config where id = 1 and admin_token = p_token) then
    raise exception 'Token inválido';
  end if;
end $$;

create or replace function public.confras_admin_lista(p_token text)
returns setof public.confras_participantes
language plpgsql security definer set search_path = public as $$
begin
  perform confras_admin_check(p_token);
  return query select * from confras_participantes order by criado_em;
end $$;

create or replace function public.confras_admin_marca_pago(p_token text, p_participante uuid, p_pago boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform confras_admin_check(p_token);
  update confras_participantes
  set pago = p_pago, pago_em = case when p_pago then now() else null end
  where id = p_participante;
end $$;

create or replace function public.confras_admin_remove(p_token text, p_participante uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform confras_admin_check(p_token);
  delete from confras_participantes where id = p_participante;
  delete from confras_garrafas g
    where not exists (select 1 from confras_garrafa_membros m where m.garrafa_id = g.id);
end $$;

create or replace function public.confras_admin_config(
  p_token text, p_chave_pix text, p_nome_pix text, p_valor numeric, p_aberto boolean
) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform confras_admin_check(p_token);
  update confras_config
  set chave_pix = p_chave_pix, nome_pix = p_nome_pix, valor_rateio = p_valor, rsvp_aberto = p_aberto
  where id = 1;
end $$;

grant execute on function
  public.confras_rsvp, public.confras_meu, public.confras_add_garrafa,
  public.confras_join_garrafa, public.confras_leave_garrafa,
  public.confras_minhas_garrafas, public.confras_set_comprovante,
  public.confras_admin_lista(text), public.confras_admin_marca_pago(text, uuid, boolean),
  public.confras_admin_remove(text, uuid),
  public.confras_admin_config(text, text, text, numeric, boolean)
to anon, authenticated;

revoke execute on function public.confras_admin_check(text) from anon, authenticated;

-- ── Storage: comprovantes (nomes de arquivo são uuid, não adivinháveis) ──
insert into storage.buckets (id, name, public)
values ('confras', 'confras', true)
on conflict (id) do nothing;

drop policy if exists "confras upload comprovante" on storage.objects;
create policy "confras upload comprovante" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'confras' and (storage.foldername(name))[1] = 'comprovantes');

drop policy if exists "confras leitura" on storage.objects;
create policy "confras leitura" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'confras');
