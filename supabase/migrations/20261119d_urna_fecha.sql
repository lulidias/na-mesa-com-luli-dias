-- 19/11/2026 — Votação 2027: horário de fechamento da urna vira configuração
-- (telões fazem a contagem regressiva e a cena "últimos 30 minutos" sozinhos).

alter table confras_config add column if not exists urna_fecha timestamptz;
update confras_config set urna_fecha = '2027-11-26 16:30:00-03' where id = 1;

create or replace view confras_config_publica as
  select chave_pix, nome_pix, valor_rateio, rsvp_aberto, votacao_aberta,
         resultados_publicos, premio1, premio2, premio3, meta_confrades,
         edicao_atual, video_url, urna_fecha
  from confras_config;
