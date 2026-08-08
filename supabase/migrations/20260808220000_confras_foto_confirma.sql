-- A Confra das Confras — upload de foto pelo confrade + confirmação da foto automática
-- foto_ok: null = automática aguardando confirmação · true = confirmada/própria · false = rejeitada

alter table public.confras_garrafas add column if not exists foto_ok boolean;

drop view if exists public.confras_vinhos_publico;
create view public.confras_vinhos_publico as
  select g.id, g.vinho, g.produtor, g.regiao, g.safra, g.formato, g.tipo, g.pais, g.litros, g.vagas,
         g.foto_url, g.foto_ok,
         coalesce(array_agg(p.nome order by p.nome) filter (where p.nome is not null), '{}') as membros,
         g.vagas - count(m.participante_id)::int as vagas_restantes
  from public.confras_garrafas g
  left join public.confras_garrafa_membros m on m.garrafa_id = g.id
  left join public.confras_participantes p on p.id = m.participante_id
  group by g.id
  order by g.litros desc, g.criado_em;
grant select on public.confras_vinhos_publico to anon, authenticated;

-- upload próprio: membro da garrafa define a foto (vale como confirmada)
create or replace function public.confras_set_foto_garrafa(p_participante uuid, p_garrafa uuid, p_url text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from confras_garrafa_membros
                 where garrafa_id = p_garrafa and participante_id = p_participante) then
    raise exception 'Só quem leva a garrafa pode definir a foto';
  end if;
  update confras_garrafas set foto_url = nullif(trim(p_url), ''), foto_ok = true where id = p_garrafa;
end $$;
grant execute on function public.confras_set_foto_garrafa(uuid, uuid, text) to anon, authenticated;

-- confirmação da foto encontrada automaticamente
create or replace function public.confras_avalia_foto(p_participante uuid, p_garrafa uuid, p_ok boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from confras_garrafa_membros
                 where garrafa_id = p_garrafa and participante_id = p_participante) then
    raise exception 'Só quem leva a garrafa pode avaliar a foto';
  end if;
  if p_ok then
    update confras_garrafas set foto_ok = true where id = p_garrafa;
  else
    update confras_garrafas set foto_url = '', foto_ok = false where id = p_garrafa;
  end if;
end $$;
grant execute on function public.confras_avalia_foto(uuid, uuid, boolean) to anon, authenticated;

-- admin definir foto marca como confirmada
create or replace function public.confras_admin_set_foto(p_token text, p_garrafa uuid, p_url text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform confras_admin_check(p_token);
  update confras_garrafas set foto_url = nullif(trim(p_url), ''),
    foto_ok = case when nullif(trim(p_url), '') is null then null else true end
  where id = p_garrafa;
end $$;

-- storage: fotos de garrafas enviadas pelos confrades
drop policy if exists "confras upload foto vinho" on storage.objects;
create policy "confras upload foto vinho" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'confras' and (storage.foldername(name))[1] = 'fotos-vinhos');
