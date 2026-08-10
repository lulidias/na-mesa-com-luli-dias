-- Confra das Confras — presidente pode NEGAR um cadastro (exclui, salvo se já aprovado)

create or replace function public.confras_negar(p_participante uuid, p_confraria text, p_chave text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_nome text; v_aprovado boolean;
begin
  if p_chave is distinct from md5(p_participante::text || p_confraria ||
      (select admin_token from confras_config where id = 1)) then
    raise exception 'Link inválido';
  end if;
  select nome, aprovado into v_nome, v_aprovado from confras_participantes where id = p_participante;
  if v_nome is null then raise exception 'Cadastro não encontrado (talvez já excluído)'; end if;
  if v_aprovado is true then
    return v_nome || ' já foi aprovado por outro presidente — nada foi excluído';
  end if;
  delete from confras_participantes where id = p_participante;
  delete from confras_garrafas g
    where not exists (select 1 from confras_garrafa_membros m where m.garrafa_id = g.id);
  return v_nome || ' foi excluído do evento';
end $$;
grant execute on function public.confras_negar(uuid, text, text) to anon, authenticated;
