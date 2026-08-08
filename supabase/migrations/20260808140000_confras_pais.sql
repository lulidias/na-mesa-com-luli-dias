-- A Confra das Confras — país da garrafa (organização da carta)

alter table public.confras_garrafas add column if not exists pais text;

drop view if exists public.confras_vinhos_publico;
create view public.confras_vinhos_publico as
  select g.id, g.vinho, g.produtor, g.safra, g.formato, g.tipo, g.pais, g.litros, g.vagas,
         coalesce(array_agg(p.nome order by p.nome) filter (where p.nome is not null), '{}') as membros,
         g.vagas - count(m.participante_id)::int as vagas_restantes
  from public.confras_garrafas g
  left join public.confras_garrafa_membros m on m.garrafa_id = g.id
  left join public.confras_participantes p on p.id = m.participante_id
  group by g.id
  order by g.litros desc, g.criado_em;
grant select on public.confras_vinhos_publico to anon, authenticated;

drop function if exists public.confras_add_garrafa(uuid, text, text, text, text, numeric, int, text);
create or replace function public.confras_add_garrafa(
  p_participante uuid, p_vinho text, p_produtor text, p_safra text,
  p_formato text, p_litros numeric, p_vagas int,
  p_tipo text default 'Tinto', p_pais text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not exists (select 1 from confras_participantes where id = p_participante) then
    raise exception 'Participante não encontrado';
  end if;
  if coalesce(trim(p_vinho), '') = '' then raise exception 'Informe o vinho'; end if;
  insert into confras_garrafas (vinho, produtor, safra, formato, litros, vagas, tipo, pais, criado_por)
  values (trim(p_vinho), nullif(trim(p_produtor), ''), nullif(trim(p_safra), ''),
          p_formato, p_litros, greatest(p_vagas, 1), coalesce(nullif(trim(p_tipo), ''), 'Tinto'),
          nullif(trim(coalesce(p_pais, '')), ''), p_participante)
  returning id into v_id;
  insert into confras_garrafa_membros (garrafa_id, participante_id) values (v_id, p_participante);
  return v_id;
end $$;
grant execute on function public.confras_add_garrafa(uuid, text, text, text, text, numeric, int, text, text) to anon, authenticated;
