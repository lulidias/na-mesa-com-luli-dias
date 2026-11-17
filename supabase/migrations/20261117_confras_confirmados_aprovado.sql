-- Confirmados públicos: só participantes aprovados
create or replace view confras_confirmados as
select nome, confrarias, pago, criado_em
from confras_participantes
where aprovado is true
order by criado_em;
