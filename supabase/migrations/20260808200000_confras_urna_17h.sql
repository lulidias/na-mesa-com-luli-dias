-- A Confra das Confras — urna encerra às 17h (BRT) do dia do evento

create or replace function public.confras_votar(p_participante uuid, p_categoria uuid, p_garrafa uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_filtro text; v_tipo text;
begin
  if not (select votacao_aberta from confras_config where id = 1) then
    raise exception 'A votação não está aberta';
  end if;
  -- trava dura: 18/11/2026 17:00 BRT = 20:00 UTC
  if now() > timestamptz '2026-11-18 20:00:00+00' then
    raise exception 'A votação encerrou às 17h';
  end if;
  if not exists (select 1 from confras_participantes where id = p_participante) then
    raise exception 'Participante não encontrado';
  end if;
  select tipo_filtro into v_filtro from confras_categorias where id = p_categoria;
  select tipo into v_tipo from confras_garrafas where id = p_garrafa;
  if v_tipo is null then raise exception 'Garrafa não encontrada'; end if;
  if v_filtro is not null and v_tipo <> v_filtro then
    raise exception 'Este vinho não concorre nesta categoria';
  end if;
  insert into confras_votos (categoria_id, participante_id, garrafa_id)
  values (p_categoria, p_participante, p_garrafa)
  on conflict (categoria_id, participante_id) do update set garrafa_id = excluded.garrafa_id, votado_em = now();
end $$;
