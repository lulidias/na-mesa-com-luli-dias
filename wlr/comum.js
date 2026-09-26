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
  var L = [['historia', tr('A confraria'), RAIZ + '#historia'], ['presidentes', tr('Presidentes'), RAIZ + '#presidentes'],
    ['normas', tr('Normas'), RAIZ + '#normas'], ['playlist', tr('Playlist'), RAIZ + '#playlist'],
    ['edicoes', tr('Edições'), RAIZ + 'edicoes/'], ['numeros', tr('Números'), RAIZ + 'numeros/']];
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
    '<div class="q">"Viver e curtir os bons momentos com os amigos."</div>' +
    '<div class="links"><a href="' + RAIZ + '">' + esc(tr('A confraria')) + '</a><a href="' + RAIZ + 'magnumfest/">Magnum Fest 2026</a>' +
    '<a href="' + RAIZ + 'edicoes/">' + esc(tr('Edições')) + '</a><a href="' + RAIZ + 'numeros/">' + esc(tr('Números')) + '</a></div>' +
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
