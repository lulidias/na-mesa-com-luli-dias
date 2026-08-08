-- A Confra das Confras — lembretes com marco temporal (1 mês / 1 semana / é hoje)

drop function if exists public.confras_enqueue_lembrete();
create function public.confras_enqueue_lembrete(p_quando text default null)
returns void language sql security definer set search_path = public as $$
  select public.confras_email_enqueue('lembrete', p.email,
    jsonb_build_object('nome', p.nome, 'participante_id', p.id, 'pago', p.pago,
      'quando', p_quando,
      'garrafas', coalesce((
        select jsonb_agg(jsonb_build_object('vinho', g.vinho, 'safra', g.safra, 'formato', g.formato))
        from confras_garrafa_membros m join confras_garrafas g on g.id = m.garrafa_id
        where m.participante_id = p.id), '[]'::jsonb)))
  from confras_participantes p;
$$;
