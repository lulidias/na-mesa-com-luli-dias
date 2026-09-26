-- Reprovado na análise automática NÃO é comunicado ao confrade: vai primeiro ao conselho, que decide.
-- Para o confrade (e nos e-mails para ele), um "inapto" sem decisão aparece como "com o conselho", sem os critérios.
-- O painel continua vendo "inapto" (wlr_situacao), com o motivo.
create or replace function wlr_situacao_confrade(g wlr_garrafas) returns text
language sql stable as $$
  select case when wlr_situacao(g) = 'inapto' and g.decisao is null then 'em_analise' else wlr_situacao(g) end;
$$;

create or replace function wlr_minhas_garrafas(p_participante uuid)
 returns table(id uuid, vinho text, produtor text, regiao text, safra text, formato text, litros numeric, vagas integer, tipo text, subtipo text, pais text, membros text[], sou_criador boolean, foto_url text, foto_ok boolean, situacao text, analise_status text, analise jsonb, decisao_motivo text, decisao_por text, pedido_excecao boolean)
 language sql security definer set search_path to 'public'
as $function$
  select g.id, g.vinho, g.produtor, g.regiao, g.safra, g.formato, g.litros, g.vagas, g.tipo, g.subtipo, g.pais,
         coalesce(array_agg(p2.nome order by p2.nome) filter (where p2.nome is not null), '{}'),
         g.criado_por = p_participante, g.foto_url, g.foto_ok,
         wlr_situacao_confrade(g),
         case when wlr_situacao(g) = 'inapto' and g.decisao is null then 'conselho' else g.analise_status end,
         case when wlr_situacao(g) = 'inapto' and g.decisao is null then null else g.analise end,
         g.decisao_motivo, g.decisao_por, g.pedido_excecao
  from wlr_garrafas g
  join wlr_garrafa_membros m on m.garrafa_id = g.id and m.participante_id = p_participante
  left join wlr_garrafa_membros m2 on m2.garrafa_id = g.id
  left join wlr_participantes p2 on p2.id = m2.participante_id
  group by g.id;
$function$;

-- lembretes por e-mail: mesma regra
CREATE OR REPLACE FUNCTION public.wlr_enqueue_lembrete(p_quando text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select wlr_email_enqueue('lembrete', p.email, jsonb_build_object('nome', p.nome, 'participante_id', p.id,
    'pago', p.pago, 'quando', p_quando,
    'garrafas', coalesce((select jsonb_agg(jsonb_build_object('vinho', g.vinho, 'safra', g.safra, 'formato', g.formato, 'situacao', wlr_situacao_confrade(g)))
      from wlr_garrafa_membros m join wlr_garrafas g on g.id = m.garrafa_id where m.participante_id = p.id), '[]'::jsonb)))
  from wlr_participantes p where p.confirmado;
$function$;
