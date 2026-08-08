-- A Confra das Confras — minhas garrafas com foto (para confirmação no painel)

drop function if exists public.confras_minhas_garrafas(uuid);
create function public.confras_minhas_garrafas(p_participante uuid)
returns table (id uuid, vinho text, produtor text, regiao text, safra text, formato text,
               litros numeric, vagas int, membros text[], sou_criador boolean,
               foto_url text, foto_ok boolean)
language sql security definer set search_path = public as $$
  select g.id, g.vinho, g.produtor, g.regiao, g.safra, g.formato, g.litros, g.vagas,
         coalesce(array_agg(p2.nome order by p2.nome) filter (where p2.nome is not null), '{}'),
         g.criado_por = p_participante, g.foto_url, g.foto_ok
  from confras_garrafas g
  join confras_garrafa_membros m on m.garrafa_id = g.id and m.participante_id = p_participante
  left join confras_garrafa_membros m2 on m2.garrafa_id = g.id
  left join confras_participantes p2 on p2.id = m2.participante_id
  group by g.id;
$$;
grant execute on function public.confras_minhas_garrafas(uuid) to anon, authenticated;
