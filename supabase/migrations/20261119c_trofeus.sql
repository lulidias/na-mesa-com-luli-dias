-- 19/11/2026 — troféus como patente do confrade (regra do Luli):
-- campeão de categoria carrega o troféu no card em toda edição futura.
-- Empate vale troféu para todos; Pedro Henrique Reynaldo venceu DUAS categorias → 2.

alter table confras_participantes
  add column if not exists trofeus int not null default 0;

update confras_participantes set trofeus = 2 where nome = 'Pedro Henrique Reynaldo';
update confras_participantes set trofeus = 1
  where nome in ('Augusto Acioli', 'Henrique Vidon', 'Milton Rocha', 'Tito Dias', 'Roberto Lopes');

drop view if exists confras_confirmados;
create view confras_confirmados as
  select nome, confrarias, pago, criado_em, trofeus
  from confras_participantes
  where aprovado is true
    and edicao_confirmada >= (select edicao_atual from confras_config where id = 1)
  order by criado_em;
