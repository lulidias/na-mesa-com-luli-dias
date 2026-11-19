-- 19/11/2026 (parte 2) — painel ciente da edição:
-- confras_meu devolve edicao_confirmada; registrar garrafa carimba a presença na edição atual.

drop function if exists public.confras_meu(uuid);
create function public.confras_meu(p_id uuid)
returns table(id uuid, nome text, whatsapp text, email text, confrarias text[], pago boolean, comprovante_url text, edicao_confirmada int)
language sql
security definer
set search_path to 'public'
as $function$
  select id, nome, whatsapp, email, confrarias, pago, comprovante_url, edicao_confirmada
  from confras_participantes where id = p_id;
$function$;

create or replace function public.confras_add_garrafa(p_participante uuid, p_vinho text, p_produtor text, p_safra text, p_formato text, p_litros numeric, p_vagas integer, p_tipo text default 'Tinto'::text, p_pais text default null::text, p_regiao text default null::text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid;
begin
  if not exists (select 1 from confras_participantes where id = p_participante) then
    raise exception 'Participante não encontrado';
  end if;
  if coalesce(trim(p_vinho), '') = '' then raise exception 'Informe o vinho'; end if;
  insert into confras_garrafas (vinho, produtor, regiao, safra, formato, litros, vagas, tipo, pais, criado_por, edicao)
  values (trim(p_vinho), nullif(trim(p_produtor), ''), nullif(trim(coalesce(p_regiao, '')), ''),
          nullif(trim(p_safra), ''), p_formato, p_litros, greatest(p_vagas, 1),
          coalesce(nullif(trim(p_tipo), ''), 'Tinto'), nullif(trim(coalesce(p_pais, '')), ''), p_participante,
          (select edicao_atual from confras_config limit 1))
  returning id into v_id;
  insert into confras_garrafa_membros (garrafa_id, participante_id) values (v_id, p_participante);
  -- quem registra garrafa está vindo: carimba a presença na edição atual
  update confras_participantes
  set edicao_confirmada = (select edicao_atual from confras_config limit 1)
  where id = p_participante;
  return v_id;
end $function$;
