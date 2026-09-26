-- Magnum Fest Licínio Dias 2026 — membros da Wine Lovers Recife (lista do grupo, 43 + o presidente)
-- e os 9 vinhos já confirmados pelo conselho (lista da MFLD de 11/12).
-- O conselho (tokens e e-mails) é carregado fora do repo.

insert into wlr_participantes (nome, produtor_de) values
  ('Álvaro Mendonça Neto', null), ('Augusto Acioli', null), ('Adauto', null), ('Alexandre Chaves', null),
  ('Alexandre Cunha', null), ('Amadeu Dias', null), ('Antônio Mendonça', 'Bacalhôa'), ('Bruno Brayner', null),
  ('Bruno Bezerra', null), ('Bruno Tude de Melo', null), ('Eduardo Loyo', null), ('Felipe Alencar', null),
  ('Felipe Galego', null), ('Fred Alencar', null), ('Guilherme Chaves', null), ('Gustavo Galvão', null),
  ('Gustavo Ventura', null), ('Henrique Vidon', null), ('Hugo', null), ('João Loyo', null),
  ('Javier Moro', 'Emilio Moro'), ('Javier Vila', 'Tarapacá'), ('João Gaveto Silva', null), ('Jorge Rosas', 'Ramos Pinto'),
  ('José Pedroza', null), ('Juan Muga', 'Bodegas Muga'), ('Leandro Almeida', null), ('Luis Duarte', 'Luis Duarte Vinhos'),
  ('Luis Patrão', null), ('Luli Dias', null), ('Marcio Nejaim', null), ('Marcelo Hollanda Cavalcanti', null),
  ('Marco Filho', null), ('Nuno Sampaio Maia', null), ('Pedro Berinson', null), ('Pedro Jácome', null),
  ('Pedro Leite', null), ('Rodrigo Geisse', 'Cave Geisse'), ('Rui Silva', null), ('Silvio Romero', null),
  ('Stéphane Roederer', 'Louis Roederer'), ('Tomás Roquette', 'Quinta do Crasto'), ('Luiz Fernando Loyo', null),
  ('Fernando Gurgel', null)
on conflict (nome) do nothing;

-- vinhos confirmados: entram aprovados pelo conselho; a análise roda mesmo assim, para mostrar notas e preço
with v(sigla, dono, vinho, produtor, regiao, pais, safra, tipo, subtipo) as (values
  ('MF',  'Marco Filho',     'Château Cos d''Estournel', 'Château Cos d''Estournel', 'Saint-Estèphe', 'França', '1991', 'Tinto', null),
  ('JAC', null,              'Il Caberlot', 'Podere Il Carnasciale', 'Toscana', 'Itália', '2008', 'Tinto', null),
  ('GC',  'Guilherme Chaves', 'Cristal Rosé', 'Louis Roederer', 'Champagne', 'França', '2014', 'Espumante', 'Rosé'),
  ('JL',  'João Loyo',       'Insignia', 'Joseph Phelps', 'Napa Valley', 'Estados Unidos', '2006', 'Tinto', null),
  ('FA',  null,              'Gran Reserva 890', 'La Rioja Alta', 'Rioja', 'Espanha', '2010', 'Tinto', null),
  ('PJ',  'Pedro Jácome',    'Meursault-Porusots 1er Cru Cuvée Jehan Humblot', 'Hospices de Beaune', 'Borgonha', 'França', '2015', 'Branco', null),
  ('FG',  'Fernando Gurgel', 'Brunello di Montalcino', 'Valdicava', 'Toscana', 'Itália', '2015', 'Tinto', null),
  ('AA',  'Augusto Acioli',  'Dom Pérignon Rosé', 'Dom Pérignon', 'Champagne', 'França', '2000', 'Espumante', 'Rosé'),
  ('LD',  'Luli Dias',       'Cristal', 'Louis Roederer', 'Champagne', 'França', '2012', 'Espumante', 'Brut')
), ins as (
  insert into wlr_garrafas (vinho, produtor, regiao, pais, safra, tipo, subtipo, formato, litros, vagas,
                            sigla, criado_por, decisao, decisao_por, decisao_motivo, decisao_em)
  select v.vinho, v.produtor, v.regiao, v.pais, v.safra, v.tipo, v.subtipo, 'Magnum', 1.5, 1,
         case when p.id is null then v.sigla end, p.id,
         'aprovado', 'Conselho WLR', 'Confirmado na lista da MFLD de 11/12', now()
  from v left join wlr_participantes p on p.nome = v.dono
  where not exists (select 1 from wlr_garrafas g where g.vinho = v.vinho and g.safra = v.safra)
  returning id, criado_por
)
insert into wlr_garrafa_membros (garrafa_id, participante_id)
select id, criado_por from ins where criado_por is not null;
