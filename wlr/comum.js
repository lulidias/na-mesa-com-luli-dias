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
    ['edicoes', tr('Edições'), RAIZ + 'edicoes/'], ['numeros', tr('Números'), RAIZ + 'numeros/'], ['presidentes', tr('Presidentes'), RAIZ + '#presidentes'],
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
    '<a href="' + RAIZ + 'eventos/">' + esc(tr('Eventos')) + '</a><a href="' + RAIZ + 'edicoes/">' + esc(tr('Edições')) + '</a><a href="' + RAIZ + 'numeros/">' + esc(tr('Números')) + '</a></div>' +
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
function albumMonta(el, ref, titulo) {
  el.innerHTML = '<div class="alb"><div class="alb-top"><div class="alb-t">' + esc(tr('Álbum dos confrades')) + ' <span class="alb-n"></span></div>' +
    '<label class="btn alb-add">📷 ' + esc(tr('Adicionar fotos')) + '<input type="file" accept="image/*" multiple hidden></label></div>' +
    '<div class="alb-st hidden"></div><div class="alb-g"><p class="vazio">' + esc(tr('Carregando…')) + '</p></div></div>';
  var g = el.querySelector('.alb-g'), st = el.querySelector('.alb-st'), fotos = [];
  var lista = function () {
    return worker({ task: 'album-listar', p_id: meuId, ref: ref }).then(function (d) {
      fotos = d.fotos || [];
      el.querySelector('.alb-n').textContent = fotos.length ? '· ' + fotos.length : '';
      g.innerHTML = fotos.length ? fotos.map(function (f, i) {
        return '<figure data-i="' + i + '"><img src="' + esc(f.thumb) + '" alt="" loading="lazy"><figcaption data-notr>' + esc(f.autor || '') + '</figcaption></figure>';
      }).join('') : '<p class="vazio">' + esc(tr('Ainda sem fotos. Seja o primeiro a compartilhar as suas!')) + '</p>';
      [].forEach.call(g.querySelectorAll('figure'), function (fg) { fg.onclick = function () { abreFoto(+fg.dataset.i); }; });
    }).catch(function (e) { g.innerHTML = '<p class="vazio">' + esc(e.message) + '</p>'; });
  };
  var abreFoto = function (i) {
    var f = fotos[i]; if (!f) return;
    var z = document.getElementById('alb-zoom');
    if (!z) { z = document.createElement('div'); z.id = 'alb-zoom'; document.body.appendChild(z); }
    z.innerHTML = '<button class="az-x">✕</button>' + (i > 0 ? '<button class="az-p">‹</button>' : '') + (i < fotos.length - 1 ? '<button class="az-n">›</button>' : '') +
      '<img src="' + esc(f.url) + '" alt=""><div class="az-i"><span data-notr>' + esc(tr('Enviada por {n}', { n: f.autor || '—' })) + '</span>' +
      '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(tr('Abrir original')) + '</a>' +
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

// ── logos dos eventos (opção A3 "Contorno", escolhida pelo Luli em 27/09) ──
// ícone: taça/garrafa em traço grosso com o vinho cheio; gota em respingo da WLR. Só berinjela e ameixa.
var LOGO_EV = (function () {
  var B = '#411A39', A = '#6C214C';
  var TACA = 'M-15 -46 C-23 -30 -23 -10 -17 -1 C-12 6 -6 8 -2.2 9 V41 C-2.5 44 -13 44.5 -17 47.5 H17 C13 44.5 2.5 44 2.2 41 V9 C6 8 12 6 17 -1 C23 -10 23 -30 15 -46 Z';
  var VINHO = 'M-21.6 -19 C-21.4 -10 -19.5 -5 -16.6 -1 C-12 5 -6.5 7.4 0 7.6 C6.5 7.4 12 5 16.6 -1 C19.5 -5 21.4 -10 21.6 -19 Z';
  var GARRAFA = 'M-6.5 -60h13v5h-1.2v21c0 7 15.5 11 15.5 27v67a5 5 0 0 1-5 5h-31.6a5 5 0 0 1-5-5V-7c0-16 15.5-20 15.5-27v-21H-6.5z';
  function gota(x, y, s, c, r) { return '<path transform="translate(' + x + ' ' + y + ') rotate(' + (r || 0) + ') scale(' + s + ')" fill="' + c + '" d="M0 -20 C7 -9 11 -3 11 4 A11 11 0 0 1 -11 4 C-11 -3 -7 -9 0 -20Z"/>'; }
  function g(x, y, s, r, inner) { return '<g transform="translate(' + x + ' ' + y + ') rotate(' + (r || 0) + ') scale(' + s + ')">' + inner + '</g>'; }
  function taca(c1, c2) { return '<path fill="' + c1 + '" d="' + VINHO + '"/><path fill="none" stroke="' + c2 + '" stroke-width="4.2" stroke-linejoin="round" d="' + TACA + '"/>'; }
  function garrafa(c1, c2) { return '<path fill="' + c1 + '" opacity=".16" d="' + GARRAFA + '"/><path fill="none" stroke="' + c1 + '" stroke-width="4.2" stroke-linejoin="round" d="' + GARRAFA + '"/><rect x="-13" y="14" width="26" height="26" rx="1.5" fill="' + c2 + '"/>'; }
  function desenho(tipo, c1, c2) {
    if (tipo === 'magnum') return gota(22, 40, .9, c2, -30) + g(48, 64, .95, 0, garrafa(c1, c2)) + g(82, 86, .5, 0, taca(c1, c2));
    if (tipo === 'paralela') return gota(50, 14, .72, c2, 0) + g(32, 68, .92, -9, taca(c1, c2)) + g(68, 68, .92, 9, taca(c1, c2));
    if (tipo === 'ordinario') return gota(72, 20, .8, c2, 24) + g(48, 68, 1.12, 0, taca(c1, c2));
    return g(50, 70, .86, -66, garrafa(c1, c2)) + '<g fill="none" stroke="' + c2 + '" stroke-width="1.4" stroke-linecap="round"><path d="M88 22 L78 33 M88 22 L74 24 M88 22 L85 37"/><path d="M76 25 Q80 27.5 79.2 31.5 M79.5 28.5 Q83 31 83.6 34.5"/></g>' +
      '<g fill="' + c2 + '"><circle cx="24" cy="98" r="1.6"/><circle cx="31" cy="103" r="1.2"/><circle cx="19" cy="104" r="1"/><circle cx="37" cy="97" r="1"/></g>';
  }
  var NOMES = { magnum: ['MAGNUM', 'FEST', 'Licínio Dias'], paralela: ['PARALELA', '', ''], ordinario: ['ORDINÁRIO', '', ''], velhinhos: ['OS', 'VELHINHOS', ''] };
  function t(x, y, txt, sz, w, cor, ls, fam, it) {
    return '<text x="' + x + '" y="' + y + '" font-family="' + (fam || 'Montserrat,Helvetica,sans-serif') + '" font-weight="' + w + '" font-size="' + sz + '" fill="' + cor + '" text-anchor="middle"' +
      (ls ? ' letter-spacing="' + ls + '"' : '') + (it ? ' font-style="italic"' : '') + '>' + txt + '</text>';
  }
  return {
    // só o ícone (abas, cartões, listas)
    icone: function (tipo, escuro) { return '<svg class="ev-ic" viewBox="0 0 100 120" role="img" aria-hidden="true">' + desenho(tipo, escuro ? '#FFFFFF' : B, escuro ? '#E9C7DA' : A) + '</svg>'; },
    // a logo completa (ícone + nome)
    logo: function (tipo, escuro) {
      var n = NOMES[tipo] || NOMES.ordinario, c1 = escuro ? '#FFFFFF' : B, c2 = escuro ? '#E9C7DA' : A, base = n[2] ? 0 : 12;
      var s = '<svg class="ev-logo" viewBox="0 0 240 240" role="img" aria-label="' + (n[0] + ' ' + n[1]).trim() + '">' + g(70, n[2] ? 4 : 14, 1, 0, desenho(tipo, c1, c2));
      if (n[1]) s += t(120, 160 + base, n[0], n[0].length > 6 ? 30 : 34, 900, c1, '1') + t(120, 193 + base, n[1], n[1].length > 6 ? 30 : 34, 900, c2, '1');
      else s += t(120, 176 + base, n[0], n[0].length > 8 ? 27 : 33, 900, c1, '1');
      if (n[2]) s += t(120, 224, n[2], 21, 600, c2, '0', "'Cormorant Garamond',Georgia,serif", 1);
      return s + '</svg>';
    }
  };
})();
