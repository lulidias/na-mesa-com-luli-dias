-- A Confra das Confras — edição de garrafa (somente quem registrou)

create or replace function public.confras_edit_garrafa(
  p_participante uuid, p_garrafa uuid, p_vinho text, p_produtor text, p_safra text,
  p_formato text, p_litros numeric, p_vagas int,
  p_tipo text default 'Tinto', p_pais text default null, p_regiao text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_membros int;
begin
  if not exists (select 1 from confras_garrafas where id = p_garrafa and criado_por = p_participante) then
    raise exception 'Só quem registrou a garrafa pode editá-la';
  end if;
  if coalesce(trim(p_vinho), '') = '' then raise exception 'Informe o vinho'; end if;
  select count(*) into v_membros from confras_garrafa_membros where garrafa_id = p_garrafa;
  if greatest(p_vagas, 1) < v_membros then
    raise exception 'A garrafa já tem % confrades — não dá para reduzir para %', v_membros, p_vagas;
  end if;
  update confras_garrafas set
    vinho = trim(p_vinho),
    produtor = nullif(trim(coalesce(p_produtor, '')), ''),
    regiao = nullif(trim(coalesce(p_regiao, '')), ''),
    safra = nullif(trim(coalesce(p_safra, '')), ''),
    formato = p_formato, litros = p_litros, vagas = greatest(p_vagas, 1),
    tipo = coalesce(nullif(trim(p_tipo), ''), 'Tinto'),
    pais = nullif(trim(coalesce(p_pais, '')), '')
  where id = p_garrafa;
end $$;
grant execute on function public.confras_edit_garrafa(uuid, uuid, text, text, text, text, numeric, int, text, text, text) to anon, authenticated;
