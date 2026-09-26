// Magnum Fest — idiomas (PT · ES · EN).
// Chave = o texto em português, exatamente como aparece na página. Um observador traduz
// qualquer nó de texto (e placeholder) que bata com uma chave — inclusive o que o JS gera depois.
// Textos com partes variáveis usam T('... {x} ...', { x: valor }).
(function () {
  'use strict';
  var D = {
    // ── topo, porta, modal
    'Meu Painel': ['Mi panel', 'My panel'],
    'Meu painel': ['Mi panel', 'My panel'],
    'Entrar no meu painel': ['Entrar a mi panel', 'Open my panel'],
    'Digite o WhatsApp que você usou na confirmação.': ['Escribe el WhatsApp que usaste al confirmar.', 'Enter the WhatsApp number you used to confirm.'],
    'Entrar': ['Entrar', 'Enter'],
    'Entrando…': ['Entrando…', 'Entering…'],
    'Ainda não confirmei presença': ['Todavía no confirmé mi asistencia', "I haven't confirmed yet"],
    'Wine Lovers Recife apresenta': ['Wine Lovers Recife presenta', 'Wine Lovers Recife presents'],
    'Só Magnums, só grandes vinhos — um almoço em homenagem a quem ensinou o Recife a celebrar à mesa.': ['Solo Magnums, solo grandes vinos: un almuerzo en homenaje a quien enseñó a Recife a celebrar en la mesa.', 'Only Magnums, only great wines — a lunch honouring the man who taught Recife to celebrate at the table.'],
    'horário a confirmar': ['horario por confirmar', 'time to be confirmed'],
    'dias': ['días', 'days'], 'horas': ['horas', 'hours'], 'min': ['min', 'min'], 'seg': ['seg', 'sec'],
    'Confirmar presença': ['Confirmar asistencia', 'RSVP'],
    'Acesso exclusivo dos membros': ['Acceso exclusivo para los miembros', 'Members only'],
    'Digite o seu WhatsApp — o mesmo do grupo da Wine Lovers Recife.': ['Escribe tu WhatsApp, el mismo del grupo de Wine Lovers Recife.', 'Enter your WhatsApp number — the one you use in the Wine Lovers Recife group.'],
    // ── homenagem
    'Em homenagem': ['En homenaje', 'In honour of'],
    'Restaurateur, importador de vinhos e grande fazedor de marcas, Licínio Dias deixou um legado inestimável na gastronomia — e uma forma de viver: celebrar os bons momentos à mesa, com os amigos.': ['Restaurador, importador de vinos y gran creador de marcas, Licínio Dias dejó un legado invaluable en la gastronomía, y una forma de vivir: celebrar los buenos momentos en la mesa, con los amigos.', 'Restaurateur, wine importer and a great builder of brands, Licínio Dias left a priceless legacy in gastronomy — and a way of life: celebrating good moments at the table, with friends.'],
    'A Magnum Fest nasce desse espírito. Por respeito a ele, cada vinho da festa passa por critérios rigorosos de qualidade e exclusividade — os mesmos padrões que Licínio sempre defendeu.': ['La Magnum Fest nace de ese espíritu. Por respeto a él, cada vino de la fiesta pasa por criterios rigurosos de calidad y exclusividad, los mismos estándares que Licínio siempre defendió.', 'The Magnum Fest is born of that spirit. Out of respect for him, every wine at the party must meet strict standards of quality and exclusivity — the same standards Licínio always championed.'],
    // ── como participar
    'Como participar': ['Cómo participar', 'How to take part'],
    'Três passos para estar na mesa': ['Tres pasos para estar en la mesa', 'Three steps to a seat at the table'],
    'Confirme a presença': ['Confirma tu asistencia', 'Confirm your attendance'],
    'Escolha o seu nome na lista de membros da Wine Lovers Recife e informe o seu WhatsApp.': ['Elige tu nombre en la lista de miembros de Wine Lovers Recife e indica tu WhatsApp.', 'Pick your name from the Wine Lovers Recife member list and enter your WhatsApp number.'],
    'Registre a sua Magnum': ['Registra tu Magnum', 'Register your Magnum'],
    'O sistema confere na hora os critérios da MFLD — nota, preço, safra e região — e diz se o vinho entra direto ou vai para o conselho.': ['El sistema verifica al instante los criterios de la MFLD (puntuación, precio, añada y región) y te dice si el vino entra directamente o pasa al consejo.', 'The system checks the MFLD criteria on the spot — score, price, vintage and region — and tells you whether the wine is in or goes to the board.'],
    'Pague no dia': ['Paga el mismo día', 'Pay on the day'],
    'Não há rateio antecipado: o restaurante cobra de cada confrade no próprio dia.': ['No hay pago por adelantado: el restaurante cobra a cada cofrade ese mismo día.', 'There is no advance payment: the restaurant charges each member on the day.'],
    'Valor e cardápio': ['Precio y menú', 'Price and menu'],
    'Na Magnum Fest, só entra garrafa Magnum (1,5 L) — uma por confrade.': ['En la Magnum Fest solo entran botellas Magnum (1,5 L): una por cofrade.', 'At the Magnum Fest only Magnum bottles (1.5 L) are allowed — one per member.'],
    // ── critérios
    'Critérios de seleção': ['Criterios de selección', 'Selection criteria'],
    'O que entra na Magnum Fest': ['Qué entra en la Magnum Fest', 'What makes it into the Magnum Fest'],
    'As regras da MFLD, divulgadas com antecedência para que cada confrade possa garimpar o seu vinho com tranquilidade.': ['Las reglas de la MFLD, publicadas con antelación para que cada cofrade pueda buscar su vino con calma.', 'The MFLD rules, published in advance so every member can hunt for their wine at leisure.'],
    'Qualidade': ['Calidad', 'Quality'],
    'Nota mínima de': ['Puntuación mínima de', 'A minimum score of'],
    '95 pontos': ['95 puntos', '95 points'],
    'em Robert Parker, Wine Spectator ou James Suckling.': ['en Robert Parker, Wine Spectator o James Suckling.', 'from Robert Parker, Wine Spectator or James Suckling.'],
    'Sem nota ou abaixo de 95: vale o': ['Sin puntuación o por debajo de 95: vale el', 'No score, or below 95: what counts is a'],
    'preço de mercado de € 400 ou mais': ['precio de mercado de 400 € o más', 'market price of €400 or more'],
    'no Wine-Searcher.': ['en Wine-Searcher.', 'on Wine-Searcher.'],
    'Cláusulas 1 a 3': ['Cláusulas 1 a 3', 'Clauses 1 to 3'],
    'Safras': ['Añadas', 'Vintages'],
    'Tintos e demais vinhos:': ['Tintos y demás vinos:', 'Reds and other wines:'],
    'safra até 2015': ['añada hasta 2015', 'vintage 2015 or older'],
    ', inclusive (a regra de 2025 era até 2014 e anda um ano por edição).': [', inclusive (la regla de 2025 era hasta 2014 y avanza un año por edición).', ' inclusive (the 2025 rule was 2014; it moves forward one year each edition).'],
    'Porto Vintage com no mínimo': ['Oporto Vintage con un mínimo de', 'Vintage Port at least'],
    '20 anos': ['20 años', '20 years old'],
    '; Porto Tawny com no mínimo': ['; Oporto Tawny con un mínimo de', '; Tawny Port at least'],
    '30 anos': ['30 años', '30 years old'],
    'Cláusula 4': ['Cláusula 4', 'Clause 4'],
    'Brancos': ['Blancos', 'Whites'],
    'Velho Mundo: Borgonha, Bordeaux, Douro, Alentejo, Rioja, Ribeira Sacra, Alsácia, Mosel, Tokaj e Rhône.': ['Viejo Mundo: Borgoña, Burdeos, Duero (Douro), Alentejo, Rioja, Ribeira Sacra, Alsacia, Mosela, Tokaj y Ródano.', 'Old World: Burgundy, Bordeaux, Douro, Alentejo, Rioja, Ribeira Sacra, Alsace, Mosel, Tokaj and Rhône.'],
    'Novo Mundo: só Estados Unidos, África do Sul, Austrália e Nova Zelândia.': ['Nuevo Mundo: solo Estados Unidos, Sudáfrica, Australia y Nueva Zelanda.', 'New World: only the United States, South Africa, Australia and New Zealand.'],
    'Cláusula 5.1': ['Cláusula 5.1', 'Clause 5.1'],
    'Espumantes': ['Espumosos', 'Sparkling'],
    'Champagne, com preço mínimo de': ['Champagne, con precio mínimo de', 'Champagne, with a minimum price of'],
    'Exceções: Cava, Prosecco e espumante brasileiro': ['Excepciones: Cava, Prosecco y espumoso brasileño', 'Exceptions: Cava, Prosecco and Brazilian sparkling wine'],
    'premiados e safrados': ['premiados y de añada', 'award-winning and vintage-dated'],
    ', de origem controlada.': [', con denominación de origen.', ', from a controlled appellation.'],
    'Limite de': ['Límite de', 'Limited to'],
    '3 rótulos': ['3 etiquetas', '3 labels'],
    ': 1 rosé e 2 brut.': [': 1 rosado y 2 brut.', ': 1 rosé and 2 brut.'],
    'Cláusulas 5.2 a 5.6': ['Cláusulas 5.2 a 5.6', 'Clauses 5.2 to 5.6'],
    'Doces e fortificados': ['Dulces y generosos', 'Sweet and fortified'],
    'Sauternes, conforme a qualidade do produtor; Tokaj de': ['Sauternes, según la calidad del productor; Tokaj de', 'Sauternes, depending on the producer; Tokaj of'],
    'Porto, Sauternes e Tokaj:': ['Oporto, Sauternes y Tokaj:', 'Port, Sauternes and Tokaj:'],
    '2 exemplares': ['2 botellas', '2 bottles'],
    'no total.': ['en total.', 'in total.'],
    'Cláusulas 5.7 e 5.8': ['Cláusulas 5.7 y 5.8', 'Clauses 5.7 and 5.8'],
    'Exceções e conselho': ['Excepciones y consejo', 'Exceptions and the board'],
    'Safras raras, vinhos sem nota ou sem preço podem ir à análise do conselho da WLR.': ['Añadas raras, vinos sin puntuación o sin precio pueden ser analizados por el consejo de la WLR.', 'Rare vintages and wines with no score or no price can be reviewed by the WLR board.'],
    'Confrades produtores podem apresentar os próprios vinhos.': ['Los cofrades productores pueden presentar sus propios vinos.', 'Members who are winemakers may bring their own wines.'],
    'Brancos e espumantes têm sempre a': ['Blancos y espumosos siempre requieren la', 'Whites and sparkling wines always need the'],
    'aprovação final do conselho': ['aprobación final del consejo', "board's final approval"],
    'Cláusulas 6 e 7': ['Cláusulas 6 y 7', 'Clauses 6 and 7'],
    'Análise automática:': ['Análisis automático:', 'Automatic check:'],
    'ao registrar a garrafa, o sistema pesquisa as notas de crítica e o preço no Wine-Searcher daquela safra e confere cada cláusula. Tintos que atendem a tudo entram direto; brancos, espumantes, doces e os casos em dúvida seguem para o conselho da Wine Lovers Recife.': ['al registrar la botella, el sistema busca las puntuaciones de la crítica y el precio en Wine-Searcher de esa añada y verifica cada cláusula. Los tintos que cumplen todo entran directamente; blancos, espumosos, dulces y los casos dudosos pasan al consejo de Wine Lovers Recife.', 'when you register a bottle, the system looks up the critic scores and the Wine-Searcher price for that vintage and checks every clause. Reds that meet everything are in straight away; whites, sparkling, sweet wines and doubtful cases go to the Wine Lovers Recife board.'],
    // ── valor e cardápio
    'À mesa': ['En la mesa', 'At the table'],
    'Não há rateio antecipado — o restaurante cobra de cada confrade no dia.': ['No hay pago por adelantado: el restaurante cobra a cada cofrade ese día.', 'No advance payment — the restaurant charges each member on the day.'],
    'Valor por pessoa, pago no dia': ['Precio por persona, se paga ese día', 'Price per person, paid on the day'],
    'a definir': ['por definir', 'to be confirmed'],
    'Cardápio': ['Menú', 'Menu'],
    'O cardápio será divulgado em breve.': ['El menú se publicará pronto.', 'The menu will be announced soon.'],
    // ── RSVP
    'Confirme a presença e registre a sua Magnum': ['Confirma tu asistencia y registra tu Magnum', 'RSVP and register your Magnum'],
    'Exclusivo para os membros da Wine Lovers Recife. Tudo aqui: você se identifica, informa a Magnum e o status dos critérios aparece logo abaixo.': ['Exclusivo para los miembros de Wine Lovers Recife. Todo aquí: te identificas, indicas tu Magnum y el estado de los criterios aparece justo debajo.', 'For Wine Lovers Recife members only. All in one place: say who you are, tell us your Magnum, and the criteria status appears right below.'],
    'Quem é você': ['Quién eres', 'Who you are'],
    'Nome *': ['Nombre *', 'Name *'],
    'Carregando a lista de membros…': ['Cargando la lista de miembros…', 'Loading the member list…'],
    '— escolha o seu nome —': ['— elige tu nombre —', '— choose your name —'],
    'E-mail': ['E-mail', 'Email'],
    '(recebe o parecer)': ['(recibe el dictamen)', '(receives the verdict)'],
    'Restrições alimentares': ['Restricciones alimentarias', 'Dietary restrictions'],
    'Não tenho restrições alimentares': ['No tengo restricciones alimentarias', 'I have no dietary restrictions'],
    'Não achou o seu nome? Fale com o organizador. Já se identificou em outro aparelho? Use o botão': ['¿No encuentras tu nombre? Habla con el organizador. ¿Ya te identificaste en otro dispositivo? Usa el botón', "Can't find your name? Talk to the organiser. Already signed in on another device? Use the button"],
    'Presença confirmada,': ['Asistencia confirmada,', "You're in,"],
    '📸 Meu cartão "Eu vou!"': ['📸 Mi tarjeta "¡Yo voy!"', '📸 My "I\'m going!" card'],
    '🏆 Cartão do meu prêmio': ['🏆 Tarjeta de mi premio', '🏆 My award card'],
    '📅 Adicionar ao calendário': ['📅 Añadir al calendario', '📅 Add to calendar'],
    'A sua Magnum': ['Tu Magnum', 'Your Magnum'],
    'Registrar outra Magnum (opcional)': ['Registrar otra Magnum (opcional)', 'Register another Magnum (optional)'],
    'Ainda não decidiu? Deixe em branco e volte depois — a presença fica confirmada.': ['¿Aún no lo decidiste? Déjalo en blanco y vuelve después: tu asistencia queda confirmada.', "Haven't decided yet? Leave it blank and come back later — your attendance stays confirmed."],
    'Tinto': ['Tinto', 'Red'], 'Branco': ['Blanco', 'White'], 'Rosé': ['Rosado', 'Rosé'],
    'Espumante': ['Espumoso', 'Sparkling'],
    'Espumante / Champagne': ['Espumoso / Champagne', 'Sparkling / Champagne'],
    'Porto, Sauternes ou Tokaj': ['Oporto, Sauternes o Tokaj', 'Port, Sauternes or Tokaj'],
    'Fortificado / Doce': ['Generoso / Dulce', 'Fortified / Sweet'],
    'Espumante brut': ['Espumoso brut', 'Sparkling brut'],
    'Espumante rosé': ['Espumoso rosado', 'Sparkling rosé'],
    'Brut': ['Brut', 'Brut'],
    'Porto Vintage': ['Oporto Vintage', 'Vintage Port'],
    'Porto Tawny': ['Oporto Tawny', 'Tawny Port'],
    'Porto Tawny (30+ anos)': ['Oporto Tawny (30+ años)', 'Tawny Port (30+ years)'],
    'Sauternes': ['Sauternes', 'Sauternes'], 'Tokaj': ['Tokaj', 'Tokaj'], 'Outro': ['Otro', 'Other'],
    'Foto da garrafa (opcional)': ['Foto de la botella (opcional)', 'Bottle photo (optional)'],
    'Sem foto? O sistema busca automaticamente e você só confirma.': ['¿Sin foto? El sistema la busca automáticamente y tú solo confirmas.', 'No photo? The system finds one and you just confirm it.'],
    'Preencha produtor e safra com cuidado — é por eles que o sistema encontra as notas e o preço daquela safra. O parecer chega em poucos minutos, aqui e por e-mail.': ['Completa productor y añada con cuidado: con ellos el sistema encuentra las puntuaciones y el precio de esa añada. El dictamen llega en pocos minutos, aquí y por e-mail.', 'Fill in producer and vintage carefully — that is how the system finds the scores and price for that vintage. The verdict arrives within minutes, here and by email.'],
    'Confirmar presença e registrar a Magnum': ['Confirmar asistencia y registrar la Magnum', 'Confirm and register my Magnum'],
    'Entrar e registrar a Magnum': ['Entrar y registrar la Magnum', 'Sign in and register my Magnum'],
    'Registrar a Magnum': ['Registrar la Magnum', 'Register my Magnum'],
    'Registrar outra Magnum': ['Registrar otra Magnum', 'Register another Magnum'],
    'Salvar alterações': ['Guardar cambios', 'Save changes'],
    'Enviando…': ['Enviando…', 'Sending…'],
    'Salvando…': ['Guardando…', 'Saving…'],
    'Adicionando…': ['Añadiendo…', 'Adding…'],
    'Cancelar edição': ['Cancelar edición', 'Cancel editing'],
    'Status da sua Magnum': ['Estado de tu Magnum', 'Your Magnum status'],
    'Não é você? Sair': ['¿No eres tú? Salir', 'Not you? Sign out'],
    'Sua presença já está confirmada — informe o WhatsApp para ver a sua Magnum e o status.': ['Tu asistencia ya está confirmada: indica tu WhatsApp para ver tu Magnum y su estado.', 'You are already confirmed — enter your WhatsApp to see your Magnum and its status.'],
    'A sua Magnum Fest': ['Tu Magnum Fest', 'Your Magnum Fest'],
    'A sua Magnum e o status dos critérios, tudo aqui.': ['Tu Magnum y el estado de los criterios, todo aquí.', 'Your Magnum and the criteria status, all in one place.'],
    '✓ Presença confirmada': ['✓ Asistencia confirmada', '✓ Attendance confirmed'],
    '🍾 Magnum aprovada ✓': ['🍾 Magnum aprobada ✓', '🍾 Magnum approved ✓'],
    '🍾 Magnum em análise': ['🍾 Magnum en análisis', '🍾 Magnum under review'],
    '🍾 Falta a sua Magnum': ['🍾 Falta tu Magnum', '🍾 Your Magnum is missing'],
    // ── status / parecer
    'Conferindo notas, preço e critérios da MFLD… o parecer aparece aqui em alguns minutos.': ['Verificando puntuaciones, precio y criterios de la MFLD… el dictamen aparecerá aquí en unos minutos.', 'Checking scores, price and MFLD criteria… the verdict will appear here in a few minutes.'],
    '✅ Aprovado': ['✅ Aprobado', '✅ Approved'],
    '⏳ Com o conselho da WLR': ['⏳ Con el consejo de la WLR', '⏳ With the WLR board'],
    '❌ Não se encaixa nos critérios': ['❌ No cumple los criterios', '❌ Does not meet the criteria'],
    '❌ Não aprovado pelo conselho': ['❌ No aprobado por el consejo', '❌ Not approved by the board'],
    '— decisão de {n}': ['— decisión de {n}', '— decided by {n}'],
    'Ver os critérios um a um': ['Ver los criterios uno por uno', 'See each criterion'],
    'A pesquisa automática não encontrou dados suficientes — o conselho vai avaliar.': ['La búsqueda automática no encontró datos suficientes: el consejo lo evaluará.', 'The automatic search did not find enough data — the board will review it.'],
    'Pode trocar o vinho (Editar) ou, se ele merece a mesa por raridade ou singularidade,': ['Puedes cambiar el vino (Editar) o, si merece la mesa por rareza o singularidad,', 'You can change the wine (Edit) or, if it deserves a place for its rarity or uniqueness,'],
    'pedir a análise do conselho': ['pedir el análisis del consejo', "ask for the board's review"],
    '(cláusula 6.1).': ['(cláusula 6.1).', '(clause 6.1).'],
    'Editar': ['Editar', 'Edit'], 'Remover': ['Quitar', 'Remove'], 'Sair': ['Salir', 'Leave'],
    'Encontramos esta foto — está certa?': ['Encontramos esta foto, ¿es correcta?', 'We found this photo — is it right?'],
    '✓ Sim, é essa': ['✓ Sí, es esta', '✓ Yes, that one'],
    '✗ Não é essa': ['✗ No es esta', "✗ That's not it"],
    'Envie a foto certa da garrafa:': ['Envía la foto correcta de la botella:', 'Upload the right bottle photo:'],
    'quer dividir seu': ['quiere compartir tu', 'wants to share your'],
    '💬 Combinar no WhatsApp': ['💬 Acordar por WhatsApp', '💬 Arrange on WhatsApp'],
    '✓ Aceitar': ['✓ Aceptar', '✓ Accept'], '✗ Recusar': ['✗ Rechazar', '✗ Decline'],
    // ── carta
    'A mesa': ['La mesa', 'The table'],
    'A carta da Magnum Fest': ['La carta de la Magnum Fest', 'The Magnum Fest wine list'],
    'Os vinhos aprovados — e os que aguardam o conselho. A lista cresce a cada garrafa registrada.': ['Los vinos aprobados y los que esperan al consejo. La lista crece con cada botella registrada.', 'Approved wines — and those awaiting the board. The list grows with every bottle registered.'],
    'Seja o primeiro a registrar uma Magnum.': ['Sé el primero en registrar una Magnum.', 'Be the first to register a Magnum.'],
    'espumantes brut': ['espumosos brut', 'brut sparkling'],
    'espumante rosé': ['espumoso rosado', 'rosé sparkling'],
    'Porto, Sauternes e Tokaj': ['Oporto, Sauternes y Tokaj', 'Port, Sauternes and Tokaj'],
    'completo': ['completo', 'full'],
    '✓ Aprovado': ['✓ Aprobado', '✓ Approved'],
    '⏳ Com o conselho': ['⏳ Con el consejo', '⏳ With the board'],
    'Vinho de confrade produtor': ['Vino de cofrade productor', "A member's own wine"],
    'Tintos': ['Tintos', 'Reds'], 'Rosés': ['Rosados', 'Rosés'],
    'Porto, Sauternes & Tokaj': ['Oporto, Sauternes y Tokaj', 'Port, Sauternes & Tokaj'],
    '⊞ Cards': ['⊞ Tarjetas', '⊞ Cards'], '☰ Lista': ['☰ Lista', '☰ List'],
    // ── números e confirmados
    'A festa em números': ['La fiesta en números', 'The party in numbers'],
    'Os números da mesa': ['Los números de la mesa', 'The table in numbers'],
    'Quantos confrades, de onde vêm os vinhos e de que safras — o placar muda a cada Magnum.': ['Cuántos cofrades, de dónde vienen los vinos y de qué añadas: el marcador cambia con cada Magnum.', 'How many members, where the wines come from and which vintages — the scoreboard changes with every Magnum.'],
    'confrades': ['cofrades', 'members'],
    'Magnums aprovadas': ['Magnums aprobadas', 'approved Magnums'],
    'Por categoria': ['Por categoría', 'By category'], 'Por país': ['Por país', 'By country'], 'Por safra': ['Por añada', 'By vintage'],
    'Aguardando as primeiras Magnums…': ['Esperando las primeras Magnums…', 'Waiting for the first Magnums…'],
    'Quem já vem': ['Quién viene', "Who's coming"],
    'Confrades confirmados': ['Cofrades confirmados', 'Confirmed members'],
    '{n} confrades já confirmaram presença.': ['{n} cofrades ya confirmaron su asistencia.', '{n} members have confirmed.'],
    '1 confrade já confirmou presença.': ['1 cofrade ya confirmó su asistencia.', '1 member has confirmed.'],
    'Seja o primeiro a confirmar presença.': ['Sé el primero en confirmar tu asistencia.', 'Be the first to confirm.'],
    'Todos os países': ['Todos los países', 'All countries'],
    '🍾 sem Magnum aprovada': ['🍾 sin Magnum aprobada', '🍾 no approved Magnum'],
    'sem Magnum aprovada ainda': ['aún sin Magnum aprobada', 'no approved Magnum yet'],
    'A–Z': ['A–Z', 'A–Z'], 'Recentes': ['Recientes', 'Newest'],
    'Nenhum confrade neste filtro — ainda. 🍷': ['Ningún cofrade en este filtro, todavía. 🍷', 'No members in this filter — yet. 🍷'],
    // ── votação / resultados
    'No dia da festa': ['El día de la fiesta', 'On the day'],
    'A grande votação': ['La gran votación', 'The big vote'],
    'Durante a festa, cada confrade vota pelo celular nos melhores vinhos da mesa — um voto por categoria. O resultado sai no telão.': ['Durante la fiesta, cada cofrade vota desde el móvil por los mejores vinos de la mesa, un voto por categoría. El resultado sale en la pantalla.', 'During the party, every member votes by phone for the best wines on the table — one vote per category. Results go up on the big screen.'],
    'Um vencedor por categoria — cada um leva a sua placa. 🏆': ['Un ganador por categoría: cada uno se lleva su placa. 🏆', 'One winner per category — each takes home a plaque. 🏆'],
    'A disputa': ['La competición', 'The contest'],
    'O prêmio de cada vencedor': ['El premio de cada ganador', "Each winner's prize"],
    'O veredicto': ['El veredicto', 'The verdict'],
    'Os melhores vinhos da festa': ['Los mejores vinos de la fiesta', 'The best wines of the party'],
    'Eleitos pelos próprios confrades.': ['Elegidos por los propios cofrades.', 'Chosen by the members themselves.'],
    'Melhor Vinho': ['Mejor Vino', 'Best Wine'], 'Melhor Tinto': ['Mejor Tinto', 'Best Red'],
    'Melhor Branco': ['Mejor Blanco', 'Best White'], 'Melhor Espumante': ['Mejor Espumoso', 'Best Sparkling'],
    'MELHOR': ['MEJOR', 'BEST'], 'VINHO': ['VINO', 'WINE'], 'TINTO': ['TINTO', 'RED'],
    'BRANCO': ['BLANCO', 'WHITE'], 'ESPUMANTE': ['ESPUMOSO', 'SPARKLING'], 'ROSÉ': ['ROSADO', 'ROSÉ'],
    'FORTIFICADO': ['GENEROSO', 'FORTIFIED'],
    '{n} votos': ['{n} votos', '{n} votes'], '1 voto': ['1 voto', '1 vote'],
    'Trazido por {n}': ['Traído por {n}', 'Brought by {n}'],
    'É hoje! 🥂': ['¡Es hoy! 🥂', "It's today! 🥂"],
    'Abrir meu painel': ['Abrir mi panel', 'Open my panel'],
    '🗳️ A urna está aberta': ['🗳️ La urna está abierta', '🗳️ Voting is open'],
    'Um voto por categoria — você pode mudar enquanto a urna estiver aberta.': ['Un voto por categoría: puedes cambiarlo mientras la urna esté abierta.', 'One vote per category — you can change it while voting is open.'],
    'Votar agora': ['Votar ahora', 'Vote now'],
    '🏆 A urna está fechada': ['🏆 La urna está cerrada', '🏆 Voting is closed'],
    'Os votos estão sendo apurados — olhos no telão. 👀': ['Se están contando los votos: atentos a la pantalla. 👀', 'Votes are being counted — watch the big screen. 👀'],
    '🏆 Temos vencedores!': ['🏆 ¡Tenemos ganadores!', '🏆 We have winners!'],
    'Os melhores vinhos da festa, eleitos pelos confrades.': ['Los mejores vinos de la fiesta, elegidos por los cofrades.', 'The best wines of the party, chosen by the members.'],
    'Ver o pódio': ['Ver el podio', 'See the podium'],
    'Foi memorável. 🥂': ['Fue memorable. 🥂', 'It was memorable. 🥂'],
    'A Magnum Fest Licínio Dias 2026 ficou para a história da Wine Lovers Recife.': ['La Magnum Fest Licínio Dias 2026 quedó en la historia de Wine Lovers Recife.', 'The Magnum Fest Licínio Dias 2026 is now part of Wine Lovers Recife history.'],
    'Ver os vencedores': ['Ver a los ganadores', 'See the winners'],
    '"Viver e curtir os bons momentos com os amigos."': ['"Vivir y disfrutar los buenos momentos con los amigos."', '"To live and enjoy the good moments with friends."'],
    'Magnum Fest Licínio Dias · Recife · 2026 · Organização Wine Lovers Recife': ['Magnum Fest Licínio Dias · Recife · 2026 · Organiza Wine Lovers Recife', 'Magnum Fest Licínio Dias · Recife · 2026 · Organised by Wine Lovers Recife'],
    'Bem-vindo,': ['Bienvenido,', 'Welcome,'],
    'Primeiro acesso: informe o seu e-mail. É por ele que você aprova os aparelhos que usam o site e recebe o parecer dos seus vinhos.': ['Primer acceso: indica tu e-mail. Con él apruebas los dispositivos que usan el sitio y recibes el dictamen de tus vinos.', 'First time here: enter your email. It is how you approve the devices you use and receive the verdict on your wines.'],
    'Continuar': ['Continuar', 'Continue'],
    '📧 Confira o seu e-mail': ['📧 Revisa tu e-mail', '📧 Check your email'],
    'Enviamos um link para': ['Enviamos un enlace a', 'We sent a link to'],
    '. Toque em': ['. Toca', '. Tap'],
    'Aprovar este dispositivo': ['Aprobar este dispositivo', 'Approve this device'],
    '— pode ser pelo celular — e esta tela entra sozinha.': ['(puede ser desde el móvil) y esta pantalla entrará sola.', '— it can be on your phone — and this screen will sign in on its own.'],
    'Aguardando a aprovação…': ['Esperando la aprobación…', 'Waiting for approval…'],
    'Reenviar e-mail': ['Reenviar e-mail', 'Resend email'],
    'Usar outro número': ['Usar otro número', 'Use another number'],
    '✅ Dispositivo aprovado': ['✅ Dispositivo aprobado', '✅ Device approved'],
    'Pode voltar à tela onde você digitou o telefone — ela já entrou. Ou digite o seu WhatsApp aqui para entrar também neste aparelho.': ['Puedes volver a la pantalla donde escribiste el teléfono: ya entró. O escribe tu WhatsApp aquí para entrar también en este dispositivo.', 'You can go back to the screen where you entered your number — it is already in. Or enter your WhatsApp here to sign in on this device too.'],
    'Pronto, {n}! O aparelho ({a}) já pode entrar. Se você digitou o telefone em outra tela, ela entrou sozinha.': ['¡Listo, {n}! El dispositivo ({a}) ya puede entrar. Si escribiste el teléfono en otra pantalla, entró sola.', 'Done, {n}! The device ({a}) can now sign in. If you entered your number on another screen, it signed in on its own.'],
    'Informe um e-mail válido.': ['Indica un e-mail válido.', 'Enter a valid email.'],
    'Informe um e-mail válido': ['Indica un e-mail válido', 'Enter a valid email'],
    'E-mail reenviado.': ['E-mail reenviado.', 'Email resent.'],
    'Entre com o seu WhatsApp primeiro.': ['Entra primero con tu WhatsApp.', 'Sign in with your WhatsApp first.'],
    '(recebe o parecer e aprova os seus acessos)': ['(recibe el dictamen y aprueba tus accesos)', '(receives the verdict and approves your sign-ins)'],
    'Link de aprovação inválido ou já usado': ['Enlace de aprobación inválido o ya usado', 'Approval link is invalid or already used'],
    'Este link expirou — digite o seu WhatsApp de novo para receber outro': ['Este enlace expiró: escribe tu WhatsApp de nuevo para recibir otro', 'This link has expired — enter your WhatsApp again to get a new one'],
    'Dispositivo inválido — recarregue a página': ['Dispositivo inválido: recarga la página', 'Invalid device — please reload the page'],
    'Sessão inválida — entre de novo': ['Sesión inválida: entra de nuevo', 'Invalid session — please sign in again'],
    'Entre no site com o seu WhatsApp — depois você volta direto para a urna': ['Entra al sitio con tu WhatsApp; después vuelves directo a la urna', 'Sign in with your WhatsApp — you will come straight back to the ballot'],
    '📲 Instalar no celular': ['📲 Instalar en el móvil', '📲 Install on your phone'],
    'Wine Lovers Recife na tela de início': ['Wine Lovers Recife en la pantalla de inicio', 'Wine Lovers Recife on your home screen'],
    'Faça agora, com esta página aberta. O ícone já entra sem pedir o telefone.': ['Hazlo ahora, con esta página abierta. El icono entra sin pedir el teléfono.', 'Do it now, with this page open. The icon will sign you in without asking for your number.'],
    'Toque em': ['Toca', 'Tap'], '(na barra do Safari)': ['(en la barra de Safari)', '(in the Safari toolbar)'],
    'Compartilhar': ['Compartir', 'Share'],
    'Role e toque em': ['Desliza y toca', 'Scroll and tap'],
    'Adicionar à Tela de Início': ['Añadir a pantalla de inicio', 'Add to Home Screen'],
    'Adicionar': ['Añadir', 'Add'],
    'Toque no menu': ['Toca el menú', 'Tap the menu'], 'do Chrome': ['de Chrome', 'in Chrome'],
    'Instalar app': ['Instalar aplicación', 'Install app'], 'ou': ['o', 'or'],
    'Adicionar à tela inicial': ['Añadir a pantalla de inicio', 'Add to Home screen'],
    'Confirme': ['Confirma', 'Confirm'],
    'Abra este site no': ['Abre este sitio en el', 'Open this site on your'], 'celular': ['móvil', 'phone'],
    'e toque em': ['y toca', 'and tap'], 'por lá.': ['allí.', 'there.'],
    'Entendi': ['Entendido', 'Got it'],
    'Aparelho não aprovado — entre de novo com o seu WhatsApp': ['Dispositivo no aprobado: entra de nuevo con tu WhatsApp', 'Device not approved — sign in again with your WhatsApp'],
    'Digite-o aqui:': ['Escríbelo aquí:', 'Type it here:'],
    'Enviamos um código para': ['Enviamos un código a', 'We sent a code to'],
    'Ou toque em': ['O toca', 'Or tap'],
    'no e-mail.': ['en el e-mail.', 'in the email.'],
    'Digite os 6 números do e-mail': ['Escribe los 6 números del e-mail', 'Type the 6 digits from the email'],
    'Entrando…': ['Entrando…', 'Signing in…'],
    'Código incorreto': ['Código incorrecto', 'Wrong code'],
    'Código expirado — toque em Reenviar e-mail': ['Código vencido: toca Reenviar e-mail', 'Code expired — tap Resend email'],
    'Muitas tentativas — toque em Reenviar e-mail': ['Demasiados intentos: toca Reenviar e-mail', 'Too many attempts — tap Resend email'],
    '← A confraria': ['← La cofradía', '← The club'],
    'A confraria': ['La cofradía', 'The club'],
    'Quem somos': ['Quiénes somos', 'Who we are'],
    'Para ouvir': ['Para escuchar', 'To listen'],
    'A nossa playlist': ['Nuestra playlist', 'Our playlist'],
    'A próxima edição': ['La próxima edición', 'The next edition'],
    '11 DE DEZEMBRO · 12H · RESTAURANTE RUIZITO': ['11 DE DICIEMBRE · 12 H · RESTAURANTE RUIZITO', 'DECEMBER 11 · 12 PM · RUIZITO RESTAURANT'],
    'Edições anteriores': ['Ediciones anteriores', 'Past editions'],
    'Magnum Fest 2026 →': ['Magnum Fest 2026 →', 'Magnum Fest 2026 →'],
    'Carregando…': ['Cargando…', 'Loading…'],
    'Carregando a foto…': ['Cargando la foto…', 'Loading the photo…'],
    'Não foi possível carregar a foto.': ['No se pudo cargar la foto.', 'Could not load the photo.'],
    'Abrir a playlist no aplicativo': ['Abrir la playlist en la app', 'Open the playlist in the app'],
    'Nenhuma edição cadastrada ainda.': ['Todavía no hay ediciones registradas.', 'No editions registered yet.'],
    'O conselho ainda vai escrever este texto.': ['El consejo todavía escribirá este texto.', 'The board will write this text soon.'],
    'Não houve Magnum Fest em 2020, por causa da pandemia. Foi também o ano em que perdemos Licínio Dias.': ['No hubo Magnum Fest en 2020, a causa de la pandemia. Fue también el año en que perdimos a Licínio Dias.', 'There was no Magnum Fest in 2020 because of the pandemic. It was also the year we lost Licínio Dias.'],
    'A primeira edição com o nome de Licínio Dias.': ['La primera edición con el nombre de Licínio Dias.', 'The first edition named after Licínio Dias.'],
    'Confraria WLR': ['Cofradía WLR', 'WLR club'],
    'Normas e deveres dos membros': ['Normas y deberes de los miembros', 'Members’ rules and duties'],
    'Gostar muito de vinho.': ['Amar mucho el vino.', 'Truly love wine.'],
    'Respeitar o confrade WLR sempre.': ['Respetar siempre al cofrade WLR.', 'Always respect your fellow WLR member.'],
    'Comparecer sempre que puder aos encontros.': ['Asistir a los encuentros siempre que pueda.', 'Attend the gatherings whenever you can.'],
    'Ser desprendido ao compartilhar seu vinho.': ['Ser generoso al compartir su vino.', 'Be generous when sharing your wine.'],
    'Cuidado ao divulgar o WLR, para não expor a si próprio e a um confrade.': ['Cuidado al divulgar la WLR, para no exponerse a sí mismo ni a un cofrade.', 'Take care when talking about WLR, so as not to expose yourself or a fellow member.'],
    'Evitar usar palavras de baixo calão no chat.': ['Evitar las palabras groseras en el chat.', 'Avoid foul language in the chat.'],
    'Abastecer a confraria com informações sobre o vinho e seu universo.': ['Nutrir a la cofradía con información sobre el vino y su universo.', 'Keep the club supplied with news about wine and its world.'],
    'Ter sensibilidade e cuidado com as postagens e comentários da confraria.': ['Tener sensibilidad y cuidado con las publicaciones y comentarios de la cofradía.', 'Be sensitive and careful with the club’s posts and comments.'],
    'Ao discutir e discorrer sobre o vinho de um confrade, sempre procurar o respeito e a educação como mote.': ['Al discutir y comentar el vino de un cofrade, buscar siempre el respeto y la educación.', 'When discussing a fellow member’s wine, always make respect and courtesy the rule.'],
    'Procurar sempre que a harmonia seja o ambiente da confraria.': ['Procurar siempre que la armonía sea el ambiente de la cofradía.', 'Always strive for harmony in the club.'],
    'Galeria dos presidentes': ['Galería de los presidentes', 'Presidents’ gallery'],
    'Presidente atual': ['Presidente actual', 'Current president'],
    'Da fundação a 2025': ['De la fundación a 2025', 'From the founding to 2025'],
    'Desde 2026': ['Desde 2026', 'Since 2026'],
    'Como tudo começou': ['Cómo empezó todo', 'How it all began'],
    'A nossa história': ['Nuestra historia', 'Our story'],
    'O primeiro encontro · 28 de julho de 2016': ['El primer encuentro · 28 de julio de 2016', 'The first gathering · July 28, 2016'],
    'Fundador · de 2016 a 2025': ['Fundador · de 2016 a 2025', 'Founder · 2016 to 2025'],
    'Começou assim de forma despretensiosa, em torno do vinho.': ['Empezó así, sin pretensiones, en torno al vino.', 'It began like this, unpretentiously, around wine.'],
    'O tempo foi passando e outros foram chegando.': ['El tiempo fue pasando y otros fueron llegando.', 'Time went by and others kept arriving.'],
    'Em cada encontro uma cumplicidade. Em cada vinho uma descoberta.': ['En cada encuentro, una complicidad. En cada vino, un descubrimiento.', 'In every gathering, a bond. In every wine, a discovery.'],
    'A cada degustação nosso propósito e harmonia vão se fortalecendo em torno do vinho.': ['En cada cata, nuestro propósito y nuestra armonía se fortalecen en torno al vino.', 'With every tasting, our purpose and harmony grow stronger around wine.'],
    'Vamos assim, de taça em taça, embebedando nossa fraternidade.': ['Así vamos, de copa en copa, embriagando nuestra fraternidad.', 'And so we go, glass by glass, steeping our brotherhood in wine.'],
    'Não buscamos notoriedade nem holofotes o que temos mesmo é muita sede...': ['No buscamos notoriedad ni reflectores: lo que tenemos es mucha sed...', 'We seek neither fame nor spotlight — what we have is a great thirst...'],
    'A primeira Magnum Fest, em dezembro de 2016. Não ficou lista: as garrafas foram reconhecidas pela foto.': ['La primera Magnum Fest, en diciembre de 2016. No quedó lista: las botellas se reconocieron por la foto.', 'The first Magnum Fest, in December 2016. There is no list: the bottles were identified from the photo.'],
    'Desde 2016': ['Desde 2016', 'Since 2016'],
    'A confraria · desde 2016': ['La cofradía · desde 2016', 'The club · since 2016'],
    'Ano II. Não ficou lista: as garrafas foram reconhecidas pela foto.': ['Año II. No quedó lista: las botellas se reconocieron por la foto.', 'Year II. There is no list: the bottles were identified from the photo.'],
    'Presidentes': ['Presidentes', 'Presidents'],
    'Normas': ['Normas', 'Rules'],
    'Playlist': ['Playlist', 'Playlist'],
    'Edições': ['Ediciones', 'Editions'],
    'Números': ['Números', 'Numbers'],
    'Faltam {n} dias': ['Faltan {n} días', '{n} days to go'],
    'É amanhã!': ['¡Es mañana!', 'It’s tomorrow!'],
    'É hoje!': ['¡Es hoy!', 'It’s today!'],
    'Sem edição': ['Sin edición', 'No edition'],
    'Litros': ['Litros', 'Liters'],
    'Anos de confraria': ['Años de cofradía', 'Years of the club'],
    'Confraria · desde 2016': ['Cofradía · desde 2016', 'Wine club · since 2016'],
    'As edições': ['Las ediciones', 'The editions'],
    'Ver todas as edições, com fotos e garrafas': ['Ver todas las ediciones, con fotos y botellas', 'See every edition, with photos and bottles'],
    'Magnum Fest em números': ['Magnum Fest en números', 'Magnum Fest in numbers'],
    'Explorar os números': ['Explorar los números', 'Explore the numbers'],
    'As edições, as fotos e as garrafas de cada confrade': ['Las ediciones, las fotos y las botellas de cada cofrade', 'The editions, the photos and every member’s bottle'],
    'Ver a Magnum Fest em números': ['Ver la Magnum Fest en números', 'See Magnum Fest in numbers'],
    'Wine Lovers Recife · desde 2016': ['Wine Lovers Recife · desde 2016', 'Wine Lovers Recife · since 2016'],
    'Sexta-feira, 11 de dezembro · 12h · Restaurante Ruizito': ['Viernes, 11 de diciembre · 12 h · Restaurante Ruizito', 'Friday, December 11 · 12 pm · Ruizito Restaurant'],
    'Todas as Magnums, de todas as edições': ['Todas las Magnums, de todas las ediciones', 'Every Magnum, from every edition'],
    'Todas as edições': ['Todas las ediciones', 'All editions'],
    'até agora': ['hasta ahora', 'so far'],
    'Magnums por edição': ['Magnums por edición', 'Magnums per edition'],
    'Quantas garrafas foram à mesa em cada ano. 2020 não teve festa.': ['Cuántas botellas llegaron a la mesa cada año. En 2020 no hubo fiesta.', 'How many bottles reached the table each year. There was no party in 2020.'],
    'Países': ['Países', 'Countries'],
    'De onde vieram as Magnums.': ['De dónde vinieron las Magnums.', 'Where the Magnums came from.'],
    'Tipo de vinho': ['Tipo de vino', 'Wine type'],
    'Tintos, espumantes, brancos, fortificados e doces.': ['Tintos, espumosos, blancos, fortificados y dulces.', 'Reds, sparkling, whites, fortified and sweet.'],
    'Regiões': ['Regiones', 'Regions'],
    'As 12 regiões que mais apareceram.': ['Las 12 regiones que más aparecieron.', 'The 12 most frequent regions.'],
    'Uvas': ['Uvas', 'Grapes'],
    'A uva ou o corte principal de cada garrafa.': ['La uva o el corte principal de cada botella.', 'The main grape or blend of each bottle.'],
    'Produtores': ['Productores', 'Producers'],
    'Os 12 que mais estiveram à mesa.': ['Los 12 que más estuvieron en la mesa.', 'The 12 most present at the table.'],
    'Os rótulos que voltaram': ['Las etiquetas que volvieron', 'Labels that came back'],
    'Vinhos que apareceram em mais de uma edição.': ['Vinos que aparecieron en más de una edición.', 'Wines that appeared in more than one edition.'],
    'Safras por década': ['Cosechas por década', 'Vintages by decade'],
    'Em que década cada vinho foi colhido.': ['En qué década se cosechó cada vino.', 'The decade each wine was harvested.'],
    'Idade média da garrafa': ['Edad media de la botella', 'Average bottle age'],
    'Anos entre a safra e o dia da festa, por edição.': ['Años entre la cosecha y el día de la fiesta, por edición.', 'Years between vintage and party day, per edition.'],
    'As mais velhas': ['Las más viejas', 'The oldest'],
    'As 10 safras mais antigas servidas.': ['Las 10 cosechas más antiguas servidas.', 'The 10 oldest vintages served.'],
    'Confrades mais assíduos': ['Cofrades más asiduos', 'Most regular members'],
    'Pela sigla usada nas listas de cada ano.': ['Por la sigla usada en las listas de cada año.', 'By the initials used on each year’s list.'],
    'Todas as garrafas': ['Todas las botellas', 'Every bottle'],
    'Clique no título de uma coluna para ordenar.': ['Haz clic en el título de una columna para ordenar.', 'Click a column title to sort.'],
    'Magnums': ['Magnums', 'Magnums'],
    'Confrades': ['Cofrades', 'Members'],
    'Safra mais antiga': ['Cosecha más antigua', 'Oldest vintage'],
    'Idade média': ['Edad media', 'Average age'],
    'anos na garrafa no dia da festa': ['años en botella el día de la fiesta', 'years in bottle on party day'],
    'nesta edição': ['en esta edición', 'this edition'],
    'em {n} edições': ['en {n} ediciones', 'across {n} editions'],
    '≈ {n} garrafas de 750 ml': ['≈ {n} botellas de 750 ml', '≈ {n} standard 750 ml bottles'],
    'lidera com {p}': ['lidera con {p}', 'leads with {p}'],
    'siglas diferentes nas listas': ['siglas distintas en las listas', 'different initials on the lists'],
    'sem lista nesta edição': ['sin lista en esta edición', 'no list for this edition'],
    'O mais presente': ['El más presente', 'The most present'],
    'foi à mesa {n} vezes': ['llegó a la mesa {n} veces', 'reached the table {n} times'],
    'das Magnums vieram da França': ['de las Magnums vinieron de Francia', 'of the Magnums came from France'],
    'Borbulhas': ['Burbujas', 'Bubbles'],
    'espumantes, {p} do total': ['espumosos, {p} del total', 'sparkling wines, {p} of the total'],
    'Grandes ícones': ['Grandes íconos', 'Great icons'],
    '{n} Premiers Grands Crus de Bordeaux: {l}': ['{n} Premiers Grands Crus de Burdeos: {l}', '{n} Bordeaux First Growths: {l}'],
    'A mais velha': ['La más vieja', 'The oldest'],
    '{n} anos no dia da festa': ['{n} años el día de la fiesta', '{n} years old on party day'],
    'A maior edição': ['La mayor edición', 'The biggest edition'],
    'com {n} Magnums': ['con {n} Magnums', 'with {n} Magnums'],
    'sem festa (pandemia)': ['sin fiesta (pandemia)', 'no party (pandemic)'],
    'anos em média': ['años de media', 'years on average'],
    'Safras dos anos {d}': ['Cosechas de los años {d}', 'Vintages from the {d}s'],
    'Vinho': ['Vino', 'Wine'],
    'Edição': ['Edición', 'Edition'],
    'Idade': ['Edad', 'Age'],
    'Sigla': ['Sigla', 'Initials'],
    'Região': ['Región', 'Region'],
    'Tipo': ['Tipo', 'Type'],
    'Uva': ['Uva', 'Grape'],
    'Nada encontrado.': ['Nada encontrado.', 'Nothing found.'],
    'Fortificado': ['Fortificado', 'Fortified'],
    'Doce': ['Dulce', 'Sweet'],
    'Buscar vinho, produtor, país, região, uva, sigla…': ['Buscar vino, productor, país, región, uva, sigla…', 'Search wine, producer, country, region, grape, initials…'],
    'Aparelho aprovado — entrando…': ['Dispositivo aprobado: entrando…', 'Device approved — signing in…'],
    // ── avisos (toasts) e diálogos
    'Escolha o seu nome na lista.': ['Elige tu nombre en la lista.', 'Pick your name from the list.'],
    'Informe o seu WhatsApp.': ['Indica tu WhatsApp.', 'Enter your WhatsApp number.'],
    'Digite o seu WhatsApp.': ['Escribe tu WhatsApp.', 'Enter your WhatsApp number.'],
    'Informe o vinho.': ['Indica el vino.', 'Enter the wine.'],
    'Informe a safra — ela decide as notas e o preço.': ['Indica la añada: de ella dependen las puntuaciones y el precio.', 'Enter the vintage — scores and price depend on it.'],
    'Presença confirmada! Agora informe a sua Magnum. 🍷': ['¡Asistencia confirmada! Ahora indica tu Magnum. 🍷', "You're confirmed! Now tell us your Magnum. 🍷"],
    'Magnum registrada! Veja o status logo abaixo. 🍷': ['¡Magnum registrada! Mira el estado justo debajo. 🍷', 'Magnum registered! See the status right below. 🍷'],
    'Magnum atualizada! 🍷': ['¡Magnum actualizada! 🍷', 'Magnum updated! 🍷'],
    'Foto muito grande (máx. 10 MB).': ['Foto demasiado grande (máx. 10 MB).', 'Photo too large (max 10 MB).'],
    'Falha ao enviar a foto': ['Error al enviar la foto', 'Photo upload failed'],
    'Foto da garrafa atualizada! 📷': ['¡Foto de la botella actualizada! 📷', 'Bottle photo updated! 📷'],
    'Foto confirmada!': ['¡Foto confirmada!', 'Photo confirmed!'],
    'Certo — envie a foto certa ou o organizador buscará outra.': ['De acuerdo: envía la foto correcta o el organizador buscará otra.', 'OK — upload the right photo or the organiser will find another.'],
    'Confirme a sua presença primeiro.': ['Confirma tu asistencia primero.', 'Please confirm your attendance first.'],
    'Pedido enviado! O dono da garrafa vai combinar com você. 🤝': ['¡Solicitud enviada! El dueño de la botella hablará contigo. 🤝', "Request sent! The bottle's owner will get in touch. 🤝"],
    'Sociedade fechada! 🥂': ['¡Acuerdo cerrado! 🥂', 'Deal! 🥂'],
    'Pedido recusado — a vaga segue aberta.': ['Solicitud rechazada: el lugar sigue libre.', 'Request declined — the spot is still open.'],
    'Feito.': ['Hecho.', 'Done.'],
    'Tem certeza?': ['¿Seguro?', 'Are you sure?'],
    'Conte ao conselho por que este vinho merece a mesa (raridade, singularidade, qualidade):': ['Cuéntale al consejo por qué este vino merece la mesa (rareza, singularidad, calidad):', 'Tell the board why this wine deserves a place (rarity, uniqueness, quality):'],
    'Pedido enviado ao conselho. Você recebe a decisão por e-mail.': ['Solicitud enviada al consejo. Recibirás la decisión por e-mail.', 'Request sent to the board. You will get the decision by email.'],
    'Não consegui carregar a lista de membros. Recarregue a página.': ['No pude cargar la lista de miembros. Recarga la página.', "Couldn't load the member list. Please reload the page."],
    ' (já confirmado)': [' (ya confirmado)', ' (already confirmed)'],
    // ── mensagens do servidor
    'Informe um WhatsApp válido, com DDD': ['Indica un WhatsApp válido, con código de área', 'Enter a valid WhatsApp number, with area code'],
    'Este WhatsApp não está na lista de membros da Wine Lovers Recife. Fale com o organizador.': ['Este WhatsApp no está en la lista de miembros de Wine Lovers Recife. Habla con el organizador.', 'This WhatsApp number is not on the Wine Lovers Recife member list. Please talk to the organiser.'],
    'Primeira vez aqui? Feche esta janela, escolha o seu nome no formulário e informe o WhatsApp — o painel abre na hora': ['¿Primera vez aquí? Cierra esta ventana, elige tu nombre en el formulario e indica tu WhatsApp: el panel se abre al instante', 'First time here? Close this window, pick your name in the form and enter your WhatsApp — your panel opens straight away'],
    'Escolha o seu nome na lista de membros': ['Elige tu nombre en la lista de miembros', 'Pick your name from the member list'],
    'Este nome já foi confirmado com outro WhatsApp — fale com o organizador': ['Este nombre ya fue confirmado con otro WhatsApp: habla con el organizador', 'This name was already confirmed with another WhatsApp number — please talk to the organiser'],
    'Este WhatsApp já está ligado a outro confrade': ['Este WhatsApp ya está vinculado a otro cofrade', 'This WhatsApp number is already linked to another member'],
    'Confirmações encerradas': ['Confirmaciones cerradas', 'RSVPs are closed'],
    'Confirme sua presença primeiro': ['Confirma tu asistencia primero', 'Please confirm your attendance first'],
    'Informe o vinho': ['Indica el vino', 'Enter the wine'],
    'Só quem registrou a garrafa pode editá-la': ['Solo quien registró la botella puede editarla', 'Only the person who registered the bottle can edit it'],
    'Acesso restrito aos membros': ['Acceso restringido a los miembros', 'Members only'],
    'A votação não está aberta': ['La votación no está abierta', 'Voting is not open'],
    'A votação já encerrou': ['La votación ya cerró', 'Voting has closed'],
    // ── países
    'França': ['Francia', 'France'], 'Itália': ['Italia', 'Italy'], 'Espanha': ['España', 'Spain'], 'Portugal': ['Portugal', 'Portugal'],
    'Estados Unidos': ['Estados Unidos', 'United States'], 'Chile': ['Chile', 'Chile'], 'Argentina': ['Argentina', 'Argentina'],
    'Brasil': ['Brasil', 'Brazil'], 'Alemanha': ['Alemania', 'Germany'], 'Hungria': ['Hungría', 'Hungary'],
    'África do Sul': ['Sudáfrica', 'South Africa'], 'Austrália': ['Australia', 'Australia'], 'Nova Zelândia': ['Nueva Zelanda', 'New Zealand'],
    'Áustria': ['Austria', 'Austria'], 'Uruguai': ['Uruguay', 'Uruguay'], 'Líbano': ['Líbano', 'Lebanon'], 'Outros': ['Otros', 'Others'],
    // ── placeholders
    'Vinho (ex.: Château Léoville Barton)': ['Vino (ej.: Château Léoville Barton)', 'Wine (e.g. Château Léoville Barton)'],
    'Produtor': ['Productor', 'Producer'], 'Região (ex.: Pauillac)': ['Región (ej.: Pauillac)', 'Region (e.g. Pauillac)'],
    'Safra': ['Añada', 'Vintage'], 'País': ['País', 'Country'],
    'voce@email.com': ['tu@email.com', 'you@email.com'],
    'Quais? (ex.: alergia a frutos do mar, vegetariano...) — e outras observações': ['¿Cuáles? (ej.: alergia al marisco, vegetariano...) y otras observaciones', 'Which? (e.g. shellfish allergy, vegetarian...) — and any other notes'],
    // ── calendário
    '🍷 Magnum Fest Licínio Dias 2026 — Wine Lovers Recife': ['🍷 Magnum Fest Licínio Dias 2026 — Wine Lovers Recife', '🍷 Magnum Fest Licínio Dias 2026 — Wine Lovers Recife'],
    'Leve a sua Magnum! Seu painel: ': ['¡Lleva tu Magnum! Tu panel: ', 'Bring your Magnum! Your panel: '],
    'Amanhã é a Magnum Fest! Separe a sua Magnum. 🍷': ['¡Mañana es la Magnum Fest! Prepara tu Magnum. 🍷', 'The Magnum Fest is tomorrow! Get your Magnum ready. 🍷'],
    // ── urna (votar/)
    'A URNA': ['LA URNA', 'THE BALLOT'],
    'Quem vota?': ['¿Quién vota?', "Who's voting?"],
    'Digite o WhatsApp que você usou na confirmação': ['Escribe el WhatsApp que usaste al confirmar', 'Enter the WhatsApp number you used to confirm'],
    'Entrar na urna': ['Entrar a la urna', 'Go to the ballot'],
    'A urna está fechada. 🗳️': ['La urna está cerrada. 🗳️', 'Voting is closed. 🗳️'],
    'Os resultados saem no telão!': ['¡Los resultados salen en la pantalla!', 'Results go up on the big screen!'],
    '— escolha o seu voto —': ['— elige tu voto —', '— choose your vote —'],
    '✓ Voto registrado': ['✓ Voto registrado', '✓ Vote recorded'],
    'Voto registrado! 🗳️': ['¡Voto registrado! 🗳️', 'Vote recorded! 🗳️'],
    // ── cartão
    '📲 Compartilhar': ['📲 Compartir', '📲 Share'], '📋 Copiar imagem': ['📋 Copiar imagen', '📋 Copy image'], 'Baixar': ['Descargar', 'Download'],
    'Poste no grupo da Wine Lovers e chame os confrades para a mesa. 🥂': ['Publícala en el grupo de Wine Lovers y llama a los cofrades a la mesa. 🥂', 'Post it in the Wine Lovers group and call the members to the table. 🥂'],
    'Clique em Copiar imagem e cole (Cmd+V) direto na conversa do WhatsApp. 🥂': ['Haz clic en Copiar imagen y pégala (Cmd+V) en la conversación de WhatsApp. 🥂', 'Click Copy image and paste it (Cmd+V) into the WhatsApp chat. 🥂'],
    'Demonstração: é assim que a urna aparece no celular de cada confrade. Nenhum voto é registrado.': ['Demostración: así aparece la urna en el móvil de cada cofrade. No se registra ningún voto.', "Demo: this is how the ballot looks on each member's phone. No vote is recorded."],
    'Demonstração — nenhum voto foi registrado.': ['Demostración: no se registró ningún voto.', 'Demo — no vote was recorded.'],
    'só {t} concorrem': ['solo compiten {t}', 'only {t} compete'],
    'todos os vinhos concorrem': ['compiten todos los vinos', 'all wines compete'],
    'Vote nos melhores vinhos da festa': ['Vota por los mejores vinos de la fiesta', 'Vote for the best wines of the party'],
    'Aponte a câmera do celular para o QR Code': ['Apunta la cámara del móvil al código QR', "Point your phone's camera at the QR code"],
    'Eu vou!': ['¡Yo voy!', "I'm going!"],
    'Só Magnums, só grandes vinhos.': ['Solo Magnums, solo grandes vinos.', 'Only Magnums, only great wines.'],
    'eleito pelos confrades da Wine Lovers Recife': ['elegido por los cofrades de Wine Lovers Recife', 'chosen by the members of Wine Lovers Recife'],
    'Confrade': ['Cofrade', 'Member'],
    'Parabéns, campeão! Poste nos grupos — troféu é para ser exibido. 🏆': ['¡Felicidades, campeón! Publícalo en los grupos: los trofeos se lucen. 🏆', 'Congratulations, champion! Post it in the groups — trophies are meant to be shown off. 🏆'],
    'Abra pelo botão "Cartão do meu prêmio" no seu painel. 🏆': ['Ábrelo con el botón "Tarjeta de mi premio" en tu panel. 🏆', 'Open it from the "My award card" button in your panel. 🏆'],
    'Nenhum prêmio no seu nome desta vez — fica para a próxima Magnum Fest. 🥂': ['Ningún premio a tu nombre esta vez: queda para la próxima Magnum Fest. 🥂', 'No award for you this time — maybe at the next Magnum Fest. 🥂'],
    'Olá, {n}! Um voto por categoria — pode mudar enquanto a urna estiver aberta.': ['¡Hola, {n}! Un voto por categoría: puedes cambiarlo mientras la urna esté abierta.', 'Hi, {n}! One vote per category — you can change it while voting is open.'],
    '✓ Imagem copiada! Agora é só Cmd+V (colar) na conversa do WhatsApp.': ['✓ ¡Imagen copiada! Ahora solo pega (Cmd+V) en la conversación de WhatsApp.', '✓ Image copied! Now just paste (Cmd+V) into the WhatsApp chat.']
  };

  var LANGS = ['pt', 'es', 'en'];
  var LOCALE = { pt: 'pt-BR', es: 'es-ES', en: 'en-GB' };
  var lang = 'pt';
  try { lang = localStorage.getItem('wlr_lang') || ''; } catch (e) { }
  var q = new URLSearchParams(location.search).get('lang');
  if (q && LANGS.indexOf(q) >= 0) lang = q;
  if (LANGS.indexOf(lang) < 0) {
    var nav = (navigator.language || 'pt').slice(0, 2).toLowerCase();
    lang = nav === 'es' ? 'es' : nav === 'en' ? 'en' : 'pt';
  }

  function tr(pt) {
    if (lang === 'pt') return pt;
    var e = D[pt];
    if (e) return e[lang === 'es' ? 0 : 1];
    // mensagem do servidor com nome: "Este WhatsApp não é o de X na lista do grupo"
    var m = /^Este WhatsApp não é o de (.+) na lista do grupo$/.exec(pt);
    if (m) return lang === 'es' ? 'Este WhatsApp no es el de ' + m[1] + ' en la lista del grupo' : 'This WhatsApp number is not ' + m[1] + "'s on the group list";
    return pt;
  }
  window.T = function (pt, vars) {
    var s = tr(pt);
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  };
  window.LANG = function () { return lang; };
  window.LOCALE = function () { return LOCALE[lang]; };

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, OPTION: 0 };
  function traduzTexto(n) {
    var p = n.parentNode;
    if (!p || SKIP[p.nodeName] === 1 || (p.closest && p.closest('[data-notr]'))) return;
    var bruto = n.__pt != null ? n.__pt : n.nodeValue;
    var chave = bruto.trim();
    if (!chave || (!D[chave] && n.__pt == null && !/^Este WhatsApp não é o de /.test(chave))) return;
    if (n.__pt == null) n.__pt = bruto;
    var ini = bruto.match(/^\s*/)[0], fim = bruto.match(/\s*$/)[0];
    var novo = ini + tr(chave) + fim;
    if (n.nodeValue !== novo) n.nodeValue = novo;
  }
  function traduzAttr(el) {
    ['placeholder', 'title', 'aria-label'].forEach(function (a) {
      if (!el.hasAttribute || !el.hasAttribute(a)) return;
      var k = 'data-pt-' + a;
      var pt = el.getAttribute(k);
      if (pt == null) { pt = el.getAttribute(a); if (!D[pt]) return; el.setAttribute(k, pt); }
      el.setAttribute(a, tr(pt));
    });
  }
  function varre(raiz) {
    if (!raiz) return;
    if (raiz.nodeType === 3) { traduzTexto(raiz); return; }
    if (raiz.nodeType !== 1) return;
    traduzAttr(raiz);
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) traduzTexto(n); else traduzAttr(n); }
  }
  var trabalhando = false;
  var obs = new MutationObserver(function (lista) {
    if (trabalhando) return;
    trabalhando = true;
    lista.forEach(function (m) {
      m.addedNodes.forEach(varre);
    });
    trabalhando = false;
  });

  function seletor() {
    var box = document.createElement('div');
    box.className = 'lang-sel';
    box.setAttribute('data-notr', '');
    box.innerHTML = LANGS.map(function (l) {
      return '<button type="button" data-l="' + l + '"' + (l === lang ? ' class="on"' : '') + '>' + l.toUpperCase() + '</button>';
    }).join('');
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      var l = b.getAttribute('data-l'); if (l === lang) return;
      try { localStorage.setItem('wlr_lang', l); } catch (e) { }
      location.reload();
    });
    document.body.appendChild(box);
    var css = document.createElement('style');
    css.textContent = '.lang-sel{position:fixed;top:16px;left:16px;z-index:1600;display:flex;background:#fff;border:1px solid #E9DDE3;box-shadow:0 4px 14px rgba(0,0,0,.12)}' +
      '.lang-sel button{border:none;background:none;padding:9px 11px;font:600 10px Montserrat,Helvetica,sans-serif;letter-spacing:1.5px;color:#6B5E65;cursor:pointer}' +
      '.lang-sel button.on{background:#6C214C;color:#fff}' +
      '@media(max-width:600px){.lang-sel{top:10px;left:10px}.lang-sel button{padding:8px 9px}}';
    document.head.appendChild(css);
  }

  function inicia() {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
    if (!document.body.hasAttribute('data-sem-seletor')) seletor();
    if (lang !== 'pt') {
      varre(document.body);
      if (document.title && D[document.title]) document.title = tr(document.title);
    }
    obs.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia); else inicia();
})();
