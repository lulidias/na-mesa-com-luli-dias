-- Confra das Confras — cadastro único por pessoa (chave = telefone)
-- Se o WhatsApp já existe (últimos 8 dígitos), atualiza o cadastro e devolve o id
-- existente em vez de criar duplicata — a pessoa "volta" ao próprio painel.

create or replace function public.confras_rsvp(
  p_nome text, p_whatsapp text, p_email text, p_confrarias text[], p_obs text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_digitos text;
begin
  if not (select rsvp_aberto from confras_config where id = 1) then
    raise exception 'RSVP encerrado';
  end if;
  if coalesce(trim(p_nome), '') = '' or coalesce(trim(p_whatsapp), '') = '' then
    raise exception 'Nome e WhatsApp são obrigatórios';
  end if;

  v_digitos := right(regexp_replace(p_whatsapp, '\D', '', 'g'), 8);
  if length(v_digitos) < 8 then
    raise exception 'Informe um WhatsApp válido, com DDD';
  end if;

  select id into v_id from confras_participantes
  where right(regexp_replace(whatsapp, '\D', '', 'g'), 8) = v_digitos
  limit 1;

  if v_id is not null then
    update confras_participantes
    set nome = trim(p_nome),
        email = coalesce(nullif(trim(p_email), ''), email),
        confrarias = p_confrarias,
        obs = coalesce(nullif(trim(p_obs), ''), obs)
    where id = v_id;
    return v_id;
  end if;

  insert into confras_participantes (nome, whatsapp, email, confrarias, obs)
  values (trim(p_nome), trim(p_whatsapp), nullif(trim(p_email), ''), p_confrarias, nullif(trim(p_obs), ''))
  returning id into v_id;
  return v_id;
end $$;
