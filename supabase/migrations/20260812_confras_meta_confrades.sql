-- Meta de confrades configurável (termômetro do site)
alter table confras_config add column if not exists meta_confrades int;
update confras_config set meta_confrades = 80 where id = 1 and meta_confrades is null;

create or replace view confras_config_publica as
  select chave_pix, nome_pix, valor_rateio, rsvp_aberto, votacao_aberta,
         resultados_publicos, premio1, premio2, premio3, meta_confrades
  from confras_config;

drop function if exists confras_admin_config(text, text, text, numeric, boolean, boolean, boolean, text, text, text);
create or replace function confras_admin_config(
  p_token text, p_chave_pix text, p_nome_pix text, p_valor numeric, p_aberto boolean,
  p_votacao boolean default null, p_resultados boolean default null,
  p_premio1 text default null, p_premio2 text default null, p_premio3 text default null,
  p_meta int default null
) returns void
language plpgsql security definer set search_path to 'public'
as $fn$
begin
  perform confras_admin_check(p_token);
  update confras_config
  set chave_pix = p_chave_pix, nome_pix = p_nome_pix, valor_rateio = p_valor, rsvp_aberto = p_aberto,
      votacao_aberta = coalesce(p_votacao, votacao_aberta),
      resultados_publicos = coalesce(p_resultados, resultados_publicos),
      premio1 = coalesce(nullif(trim(coalesce(p_premio1, '')), ''), case when p_premio1 is not null then null else premio1 end),
      premio2 = coalesce(nullif(trim(coalesce(p_premio2, '')), ''), case when p_premio2 is not null then null else premio2 end),
      premio3 = coalesce(nullif(trim(coalesce(p_premio3, '')), ''), case when p_premio3 is not null then null else premio3 end),
      meta_confrades = case when p_meta is null then meta_confrades when p_meta <= 0 then null else p_meta end
  where id = 1;
end $fn$;
