/* Wine Lovers Recife — base comum da home (/), das edições (/edicoes/) e dos números (/numeros/).
   A festa do ano (/magnumfest/) tem a porta de entrada; aqui só se usa a sessão que ela cria. */
'use strict';
var RAIZ = (function () {
  var s = document.currentScript && document.currentScript.src;
  return s ? s.replace(/[^/]*$/, '') : '/';
})();
var SB = 'https://saotncritqxuchsvvnzi.supabase.co';
var KEY = 'sb_publishable_EwpsjtLlSrPhSJfrJG6Qvw_qUtE0aL5';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function tr(s, v) { return typeof T === 'function' ? T(s, v) : s; }
function LOC() { return typeof LOCALE === 'function' ? LOCALE() : 'pt-BR'; }
function rpc(fn, args) {
  return fetch(SB + '/rest/v1/rpc/' + fn, {
    method: 'POST', headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args || {})
  }).then(function (r) {
    return r.text().then(function (tx) {
      var d = null; try { d = tx ? JSON.parse(tx) : null; } catch (e) { }
      if (!r.ok) throw new Error((d && d.message) || 'Erro (' + r.status + ')');
      return d;
    });
  });
}

// sessão: a mesma da festa (o aparelho aprovado entra sem pedir nada)
var meuId = null; try { meuId = localStorage.getItem('wlr_id'); } catch (e) { }
function meuDisp() {
  var d = ''; try { d = localStorage.getItem('wlr_disp') || ''; } catch (e) { }
  if (d.length < 40) { var m = document.cookie.match(/(?:^|; )wlr_disp=([0-9a-f]{48})/); if (m) d = m[1]; }
  return d;
}
function sessao() {
  if (meuId) return Promise.resolve(meuId);
  var d = meuDisp(); if (!d) return Promise.resolve(null);
  return rpc('wlr_sessao_do_aparelho', { p_disp: d }).then(function (id) {
    if (id) { meuId = id; try { localStorage.setItem('wlr_id', id); } catch (e) { } }
    return id;
  }).catch(function () { return null; });
}
// sem sessão: vai para a porta (na festa) e volta para cá depois de entrar
function paraPorta(volta) { location.replace(RAIZ + 'magnumfest/?voltar=' + encodeURIComponent(volta || 'inicio')); }
function semAcesso(e, volta) {
  if (/restrito/i.test(e && e.message)) { try { localStorage.removeItem('wlr_id'); } catch (x) { } paraPorta(volta); return true; }
  return false;
}

// menu e rodapé iguais em todas as páginas
function montaNav(ativo) {
  var L = [['historia', tr('A confraria'), RAIZ + '#historia'], ['confrades', tr('Confrades'), RAIZ + 'confrades/'], ['eventos', tr('Eventos'), RAIZ + 'eventos/'],
    ['edicoes', 'Magnum Fest', RAIZ + 'edicoes/'], ['numeros', tr('Números'), RAIZ + 'numeros/'], ['presidentes', tr('Presidentes'), RAIZ + '#presidentes'],
    ['normas', tr('Normas'), RAIZ + '#normas'], ['playlist', tr('Playlist'), RAIZ + '#playlist']];
  var nav = document.createElement('nav'); nav.className = 'nav';
  nav.innerHTML = '<div class="nav-in"><a class="nav-logo" href="' + RAIZ + '"><img src="' + RAIZ + 'img/logo.png" alt="Wine Lovers Recife"></a>' +
    '<div class="nav-links">' + L.map(function (l) { return '<a href="' + l[2] + '"' + (l[0] === ativo ? ' class="on"' : '') + '>' + esc(l[1]) + '</a>'; }).join('') + '</div>' +
    '<a class="nav-cta" href="' + RAIZ + 'magnumfest/">Magnum Fest 2026</a></div>';
  document.body.insertBefore(nav, document.body.firstChild);
  // o seletor de língua (criado pelo i18n.js) passa a morar dentro do menu
  var tenta = 0, t = setInterval(function () {
    var ls = document.querySelector('body > .lang-sel');
    if (ls) { nav.querySelector('.nav-in').insertBefore(ls, nav.querySelector('.nav-links')); clearInterval(t); }
    else if (++tenta > 40) clearInterval(t);
  }, 100);
}
function montaRodape() {
  var f = document.createElement('footer');
  f.innerHTML = '<img src="' + RAIZ + 'img/logo-branco.png" alt="Wine Lovers Recife">' +
    '<div class="q">' + esc(tr('Poucas mesas no mundo')) + '</div>' +
    '<div class="links"><a href="' + RAIZ + '">' + esc(tr('A confraria')) + '</a><a href="' + RAIZ + 'confrades/">' + esc(tr('Confrades')) + '</a><a href="' + RAIZ + 'magnumfest/">Magnum Fest 2026</a>' +
    '<a href="' + RAIZ + 'eventos/">' + esc(tr('Eventos')) + '</a><a href="' + RAIZ + 'edicoes/">' + 'Magnum Fest' + '</a><a href="' + RAIZ + 'numeros/">' + esc(tr('Números')) + '</a></div>' +
    '<div class="rede"><span class="desde">' + esc(tr('Desde 2016')) + '</span><a href="https://www.instagram.com/wineloversrecife/" target="_blank" rel="noopener">' +
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="vertical-align:-3px;margin-right:6px"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/></svg>@wineloversrecife</a></div>';
  document.body.appendChild(f);
  var z = document.createElement('div'); z.id = 'zoom'; z.className = 'hidden'; z.innerHTML = '<img alt="">';
  z.onclick = function () { z.classList.add('hidden'); };
  document.body.appendChild(z);
}
function zoom(src) { var z = document.getElementById('zoom'); z.querySelector('img').src = src; z.classList.remove('hidden'); }

// texto e listas
function paragrafos(t) {
  return String(t || '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean)
    .map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
}
function dataLonga(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString(LOC(), { day: 'numeric', month: 'long', year: 'numeric' });
}
function linhasVinhos(t) {
  return String(t || '').split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
    var i = l.indexOf(' - ');
    return i > 0 ? { s: l.slice(0, i).trim(), v: l.slice(i + 3).trim() } : { s: '', v: l };
  });
}
// até 2019 a festa era só "Magnum Fest"; desde 2021 leva o nome de Licínio Dias
function nomeEdicao(ano) { return 'MAGNUM FEST' + (ano >= 2021 ? '<i>Licínio Dias</i>' : ''); }

// ── álbum coletivo: qualquer confrade adiciona fotos a um evento (ref 'mf-2025' ou 'ev-<id>') ──
function worker(dados) {
  return fetch(SB + '/functions/v1/wlr-worker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
    .then(function (r) { return r.json(); }).then(function (d) { if (!d || !d.ok) throw new Error((d && d.erro) || 'Erro'); return d; });
}
function reduz(file, lado, q) {
  return new Promise(function (ok, erro) {
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      var k = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(function (b) { b ? ok(b) : erro(new Error('Falha ao preparar a foto')); }, 'image/jpeg', q);
    };
    img.onerror = function () { URL.revokeObjectURL(url); erro(new Error(tr('Não consegui abrir {f}. Use fotos JPG ou PNG.', { f: file.name }))); };
    img.src = url;
  });
}
// opts.galeria: foto grande + miniaturas (janela do evento); opts.extras(): Promise de fotos que vêm antes do álbum (as oficiais da edição)
function albumMonta(el, ref, opts) {
  opts = opts || {};
  var gal = !!opts.galeria;
  el.innerHTML = '<div class="alb' + (gal ? ' gal' : '') + '">' +
    (gal ? '<div class="gal-palco"><div class="gal-vazio">' + esc(tr('Carregando…')) + '</div><img class="gal-img" alt="" hidden><button class="gal-p" aria-label="‹" hidden>‹</button><button class="gal-n" aria-label="›" hidden>›</button>' +
      '<div class="gal-cred" data-notr></div></div><div class="gal-mini"></div>' : '') +
    '<div class="alb-top"><div class="alb-t">' + esc(tr('Álbum dos confrades')) + ' <span class="alb-n"></span></div>' +
    '<label class="btn alb-add">📷 ' + esc(tr('Adicionar fotos')) + '<input type="file" accept="image/*" multiple hidden></label></div>' +
    '<div class="alb-st hidden"></div>' + (gal ? '' : '<div class="alb-g"><p class="vazio">' + esc(tr('Carregando…')) + '</p></div>') + '</div>';
  var g = el.querySelector('.alb-g'), st = el.querySelector('.alb-st'), fotos = [], atual = 0, extras = null;
  var mostraGal = function (i) {
    if (!fotos.length) return;
    atual = (i + fotos.length) % fotos.length;
    var f = fotos[atual], img = el.querySelector('.gal-img');
    img.hidden = false; img.src = f.url || f.thumb; el.querySelector('.gal-vazio').hidden = true;
    el.querySelector('.gal-p').hidden = el.querySelector('.gal-n').hidden = fotos.length < 2;
    el.querySelector('.gal-cred').textContent = (atual + 1) + ' / ' + fotos.length + (f.oficial ? ' · ' + tr('Foto oficial') : f.autor ? ' · ' + tr('Enviada por {n}', { n: f.autor }) : '');
    [].forEach.call(el.querySelectorAll('.gal-mini img'), function (m, k) { m.classList.toggle('on', k === atual); if (k === atual && m.scrollIntoView) m.scrollIntoView({ block: 'nearest', inline: 'center' }); });
  };
  var lista = function () {
    var ex = extras || (extras = (opts.extras ? opts.extras() : Promise.resolve([])).catch(function () { return []; }));
    var dp = opts.depois ? opts.depois().catch(function () { return []; }) : Promise.resolve([]);
    return Promise.all([ex, worker({ task: 'album-listar', p_id: meuId, ref: ref }), dp]).then(function (r) {
      var d = r[1], proprias = d.fotos || [];
      // a capa escolhida no painel abre a galeria
      if (opts.primeira) proprias.sort(function (a, b) { return (b.id === opts.primeira) - (a.id === opts.primeira); });
      fotos = (r[0] || []).concat(proprias).concat(r[2] || []);
      el.querySelector('.alb-n').textContent = proprias.length ? '· ' + proprias.length : '';
      if (gal) {
        el.querySelector('.gal-mini').innerHTML = fotos.map(function (f, i) { return '<img src="' + esc(f.thumb || f.url) + '" alt="" loading="lazy" data-i="' + i + '">'; }).join('');
        [].forEach.call(el.querySelectorAll('.gal-mini img'), function (m) { m.onclick = function () { mostraGal(+m.dataset.i); }; });
        if (fotos.length) mostraGal(Math.min(atual, fotos.length - 1));
        else { el.querySelector('.gal-vazio').textContent = tr('Ainda sem fotos. Seja o primeiro a compartilhar as suas!'); el.querySelector('.gal-vazio').hidden = false; el.querySelector('.gal-img').hidden = true; el.querySelector('.gal-cred').textContent = ''; }
        return;
      }
      g.innerHTML = fotos.length ? fotos.map(function (f, i) {
        return '<figure data-i="' + i + '"><img src="' + esc(f.thumb) + '" alt="" loading="lazy"><figcaption data-notr>' + esc(f.autor || '') + '</figcaption></figure>';
      }).join('') : '<p class="vazio">' + esc(tr('Ainda sem fotos. Seja o primeiro a compartilhar as suas!')) + '</p>';
      [].forEach.call(g.querySelectorAll('figure'), function (fg) { fg.onclick = function () { abreFoto(+fg.dataset.i); }; });
    }).catch(function (e) { if (g) g.innerHTML = '<p class="vazio">' + esc(e.message) + '</p>'; else el.querySelector('.gal-vazio').textContent = e.message; });
  };
  if (gal) {
    el.querySelector('.gal-p').onclick = function () { mostraGal(atual - 1); };
    el.querySelector('.gal-n').onclick = function () { mostraGal(atual + 1); };
    el.querySelector('.gal-img').onclick = function () { abreFoto(atual); };
    // setas do teclado e deslizar o dedo
    el._teclas = function (e) { if (document.getElementById('alb-zoom') && document.getElementById('alb-zoom').className === 'on') return; if (e.key === 'ArrowLeft') mostraGal(atual - 1); if (e.key === 'ArrowRight') mostraGal(atual + 1); };
    var x0 = null, palco = el.querySelector('.gal-palco');
    palco.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    palco.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) mostraGal(atual + (dx < 0 ? 1 : -1)); });
  }
  var abreFoto = function (i) {
    var f = fotos[i]; if (!f) return;
    var z = document.getElementById('alb-zoom');
    if (!z) { z = document.createElement('div'); z.id = 'alb-zoom'; document.body.appendChild(z); }
    z.innerHTML = '<button class="az-x">✕</button>' + (i > 0 ? '<button class="az-p">‹</button>' : '') + (i < fotos.length - 1 ? '<button class="az-n">›</button>' : '') +
      '<img src="' + esc(f.url || f.thumb) + '" alt=""><div class="az-i"><span data-notr>' + esc(f.oficial ? tr('Foto oficial') : tr('Enviada por {n}', { n: f.autor || '—' })) + '</span>' +
      (/^https?:/.test(f.url || '') ? '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(tr('Abrir original')) + '</a>' : '') +
      (f.minha ? '<button class="az-del">' + esc(tr('Apagar')) + '</button>' : '') + '</div>';
    z.className = 'on';
    z.querySelector('.az-x').onclick = function () { z.className = ''; };
    z.onclick = function (e) { if (e.target === z) z.className = ''; };
    if (z.querySelector('.az-p')) z.querySelector('.az-p').onclick = function () { abreFoto(i - 1); };
    if (z.querySelector('.az-n')) z.querySelector('.az-n').onclick = function () { abreFoto(i + 1); };
    if (z.querySelector('.az-del')) z.querySelector('.az-del').onclick = function () {
      if (!confirm(tr('Apagar esta foto do álbum?'))) return;
      worker({ task: 'album-apagar', p_id: meuId, id: f.id }).then(function () { z.className = ''; lista(); }).catch(function (e) { alert(e.message); });
    };
  };
  el.querySelector('input[type=file]').onchange = function () {
    var arqs = [].slice.call(this.files || []).slice(0, 30), inp = this;
    if (!arqs.length) return;
    var add = el.querySelector('.alb-add'); add.classList.add('ocupado');
    var mostra = function (t, err) { st.textContent = t; st.className = 'alb-st' + (err ? ' err' : ''); };
    mostra(arqs.length === 1 ? tr('Preparando a foto…') : tr('Preparando {n} fotos…', { n: arqs.length }));
    worker({ task: 'album-enviar', p_id: meuId, ref: ref, n: arqs.length }).then(function (d) {
      var itens = d.itens, feitos = [], i = 0;
      var proxima = function () {
        if (i >= arqs.length) return Promise.resolve();
        var a = arqs[i], it = itens[i]; i++;
        mostra(tr('Enviando foto {i} de {n}…', { i: i, n: arqs.length }));
        return Promise.all([reduz(a, 1600, 0.82), reduz(a, 420, 0.75)]).then(function (b) {
          return Promise.all([
            fetch(it.url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'false' }, body: b[0] }),
            fetch(it.url_thumb, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'false' }, body: b[1] })
          ]).then(function (r) { if (r[0].ok && r[1].ok) feitos.push({ path: it.path, thumb: it.thumb }); });
        }).catch(function () { }).then(proxima);
      };
      return proxima().then(function () { return worker({ task: 'album-registrar', p_id: meuId, ref: ref, itens: feitos }); });
    }).then(function (r) {
      mostra(r.n === arqs.length ? (r.n === 1 ? tr('Foto adicionada. Obrigado!') : tr('{n} fotos adicionadas. Obrigado!', { n: r.n })) : tr('{n} de {t} fotos adicionadas.', { n: r.n, t: arqs.length }), r.n < arqs.length);
      return lista();
    }).catch(function (e) { mostra(e.message, true); })
      .then(function () { add.classList.remove('ocupado'); inp.value = ''; setTimeout(function () { st.classList.add('hidden'); }, 6000); });
  };
  return lista();
}

// ── marca dos eventos (27/09): a marca Wine Lovers em cima e o nome do encontro embaixo, como nas placas ──
var LOGO_EV = (function () {
  var SUB = { todos: 'a confraria', magnum: 'Licínio Dias', paralela: 'encontros paralelos', ordinario: 'os encontros da confraria', velhinhos: 'garrafas de guarda' };
  var NOME = { todos: 'Wine Lovers', magnum: 'Magnum Fest', paralela: 'Paralela', ordinario: 'Ordinário', velhinhos: 'Os Velhinhos' };
  function marca(escuro) { return '<img class="ev-ic" src="' + RAIZ + 'img/logo' + (escuro ? '-branco' : '') + '.png" alt="Wine Lovers Recife">'; }
  return {
    sub: function (tipo) { return SUB[tipo] || ''; },
    // só a marca (abas, cartões, cabeçalhos)
    icone: function (tipo, escuro) { return marca(escuro); },
    // a marca completa: Wine Lovers → filete → NOME → subtítulo em itálico
    logo: function (tipo, escuro) {
      return '<div class="lk' + (escuro ? ' esc' : '') + '">' + marca(escuro) + '<div class="fl"></div><div class="nm" data-notr>' + esc(NOME[tipo] || '') + '</div>' +
        '<div class="sb" data-notr>' + esc(SUB[tipo] || '') + '</div></div>';
    }
  };
})();
