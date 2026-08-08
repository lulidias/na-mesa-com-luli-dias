-- A Confra das Confras — foto da garrafa (busca automática + ajuste manual)

alter table public.confras_garrafas add column if not exists foto_url text;

drop view if exists public.confras_vinhos_publico;
create view public.confras_vinhos_publico as
  select g.id, g.vinho, g.produtor, g.safra, g.formato, g.tipo, g.pais, g.litros, g.vagas, g.foto_url,
         coalesce(array_agg(p.nome order by p.nome) filter (where p.nome is not null), '{}') as membros,
         g.vagas - count(m.participante_id)::int as vagas_restantes
  from public.confras_garrafas g
  left join public.confras_garrafa_membros m on m.garrafa_id = g.id
  left join public.confras_participantes p on p.id = m.participante_id
  group by g.id
  order by g.litros desc, g.criado_em;
grant select on public.confras_vinhos_publico to anon, authenticated;

create or replace function public.confras_admin_set_foto(p_token text, p_garrafa uuid, p_url text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform confras_admin_check(p_token);
  update confras_garrafas set foto_url = nullif(trim(p_url), '') where id = p_garrafa;
end $$;
grant execute on function public.confras_admin_set_foto(text, uuid, text) to anon, authenticated;
