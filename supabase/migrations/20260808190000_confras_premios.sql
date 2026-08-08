-- A Confra das Confras — prêmios do pódio (1º, 2º e 3º colocado)

alter table public.confras_config add column if not exists premio1 text;
alter table public.confras_config add column if not exists premio2 text;
alter table public.confras_config add column if not exists premio3 text;

drop view if exists public.confras_config_publica;
create view public.confras_config_publica as
  select chave_pix, nome_pix, valor_rateio, rsvp_aberto, votacao_aberta, resultados_publicos,
         premio1, premio2, premio3
  from public.confras_config;
grant select on public.confras_config_publica to anon, authenticated;

drop function if exists public.confras_admin_config(text, text, text, numeric, boolean, boolean, boolean);
create or replace function public.confras_admin_config(
  p_token text, p_chave_pix text, p_nome_pix text, p_valor numeric, p_aberto boolean,
  p_votacao boolean default null, p_resultados boolean default null,
  p_premio1 text default null, p_premio2 text default null, p_premio3 text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform confras_admin_check(p_token);
  update confras_config
  set chave_pix = p_chave_pix, nome_pix = p_nome_pix, valor_rateio = p_valor, rsvp_aberto = p_aberto,
      votacao_aberta = coalesce(p_votacao, votacao_aberta),
      resultados_publicos = coalesce(p_resultados, resultados_publicos),
      premio1 = coalesce(nullif(trim(coalesce(p_premio1, '')), ''), case when p_premio1 is not null then null else premio1 end),
      premio2 = coalesce(nullif(trim(coalesce(p_premio2, '')), ''), case when p_premio2 is not null then null else premio2 end),
      premio3 = coalesce(nullif(trim(coalesce(p_premio3, '')), ''), case when p_premio3 is not null then null else premio3 end)
  where id = 1;
end $$;
grant execute on function public.confras_admin_config(text, text, text, numeric, boolean, boolean, boolean, text, text, text) to anon, authenticated;

-- telão: apuração ao vivo protegida por token (mesmo RPC admin já existente serve)
