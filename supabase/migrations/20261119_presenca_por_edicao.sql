-- 19/11/2026 — a página inicial vira a casa da edição 2027:
-- presença ("Quem já vem") e garrafas do painel passam a ser por edição.
-- A memória de 2026 vive em /confras/2026/ (view pública de vinhos continua
-- entregando todas as edições; o filtro é do cliente).

alter table confras_participantes
  add column if not exists edicao_confirmada int not null default 2026;

-- Quem já vem = quem confirmou NA edição atual
create or replace view confras_confirmados as
  select nome, confrarias, pago, criado_em
  from confras_participantes
  where aprovado is true
    and edicao_confirmada >= (select edicao_atual from confras_config where id = 1)
  order by criado_em;

-- O RSVP carimba a edição atual (reconfirmação de veterano reaparece na hora;
-- novato segue o fluxo normal de aprovação)
create or replace function public.confras_rsvp(p_nome text, p_whatsapp text, p_email text, p_confrarias text[], p_obs text default null::text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid; v_digitos text; v_ed int;
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

  select edicao_atual into v_ed from confras_config where id = 1;

  select id into v_id from confras_participantes
  where right(regexp_replace(whatsapp, '\D', '', 'g'), 8) = v_digitos
  limit 1;

  if v_id is not null then
    update confras_participantes
    set nome = trim(p_nome),
        email = coalesce(nullif(trim(p_email), ''), email),
        confrarias = p_confrarias,
        obs = coalesce(nullif(trim(p_obs), ''), obs),
        edicao_confirmada = v_ed
    where id = v_id;
    return v_id;
  end if;

  insert into confras_participantes (nome, whatsapp, email, confrarias, obs, edicao_confirmada)
  values (trim(p_nome), trim(p_whatsapp), nullif(trim(p_email), ''), p_confrarias, nullif(trim(p_obs), ''), v_ed)
  returning id into v_id;
  return v_id;
end $function$;

-- O painel lista só garrafas da edição atual (as de 2026 são memória)
create or replace function public.confras_minhas_garrafas(p_participante uuid)
returns table(id uuid, vinho text, produtor text, regiao text, safra text, formato text, litros numeric, vagas integer, membros text[], sou_criador boolean, foto_url text, foto_ok boolean)
language sql
security definer
set search_path to 'public'
as $function$
  select g.id, g.vinho, g.produtor, g.regiao, g.safra, g.formato, g.litros, g.vagas,
         coalesce(array_agg(p2.nome order by p2.nome) filter (where p2.nome is not null), '{}'),
         g.criado_por = p_participante, g.foto_url, g.foto_ok
  from confras_garrafas g
  join confras_garrafa_membros m on m.garrafa_id = g.id and m.participante_id = p_participante
  left join confras_garrafa_membros m2 on m2.garrafa_id = g.id
  left join confras_participantes p2 on p2.id = m2.participante_id
  where coalesce(g.edicao, 2026) >= (select edicao_atual from confras_config where id = 1)
  group by g.id;
$function$;
