-- Confra das Confras — entrar no painel só com o WhatsApp (o telefone é a identidade)

create or replace function public.confras_entrar(p_whatsapp text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_dig text;
begin
  v_dig := right(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), 8);
  if length(v_dig) < 8 then
    raise exception 'Informe um WhatsApp válido, com DDD';
  end if;
  select id into v_id from confras_participantes
  where right(regexp_replace(whatsapp, '\D', '', 'g'), 8) = v_dig
  limit 1;
  if v_id is null then
    raise exception 'Não encontrei esse WhatsApp — confirme sua presença primeiro';
  end if;
  return v_id;
end $$;
grant execute on function public.confras_entrar(text) to anon, authenticated;
