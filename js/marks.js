(function () {
  'use strict';

  const GUIDE_META = {
    'alemanha-guia':      { country: 'Alemanha',          flag: '🇩🇪' },
    'argentina-guia':     { country: 'Argentina',         flag: '🇦🇷' },
    'aruba-guia':         { country: 'Aruba',             flag: '🇦🇼' },
    'austria-guia':       { country: 'Áustria',           flag: '🇦🇹' },
    'bonaire-guia':       { country: 'Bonaire',           flag: '🇧🇶' },
    'brasil-centroeste':  { country: 'Brasil (Centro-Oeste)', flag: '🇧🇷' },
    'brasil-nordeste':    { country: 'Brasil (Nordeste)', flag: '🇧🇷' },
    'brasil-sudeste':     { country: 'Brasil (Sudeste)',  flag: '🇧🇷' },
    'brasil-sul':         { country: 'Brasil (Sul)',      flag: '🇧🇷' },
    'chile-guia':         { country: 'Chile',             flag: '🇨🇱' },
    'china-guia':         { country: 'China',             flag: '🇨🇳' },
    'colombia-guia':      { country: 'Colômbia',         flag: '🇨🇴' },
    'copenhague-guia':    { country: 'Dinamarca',         flag: '🇩🇰' },
    'coreia-guia':        { country: 'Coreia do Sul',     flag: '🇰🇷' },
    'croacia-guia':       { country: 'Croácia',          flag: '🇭🇷' },
    'curacao-guia':       { country: 'Curaçao',          flag: '🇨🇼' },
    'dubai-guia':         { country: 'Dubai',             flag: '🇦🇪' },
    'escocia-guia':       { country: 'Escócia',          flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    'espanha-guia':       { country: 'Espanha',           flag: '🇪🇸' },
    'eua-guia':           { country: 'Estados Unidos',    flag: '🇺🇸' },
    'franca-guia':        { country: 'França',           flag: '🇫🇷' },
    'holanda-guia':       { country: 'Holanda',           flag: '🇳🇱' },
    'hongkong-guia':      { country: 'Hong Kong',         flag: '🇭🇰' },
    'inglaterra-guia':    { country: 'Inglaterra',        flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    'irlanda-guia':       { country: 'Irlanda',           flag: '🇮🇪' },
    'irlanda-norte-guia': { country: 'Irlanda do Norte',  flag: '🇬🇧' },
    'italia-guia':        { country: 'Itália',           flag: '🇮🇹' },
    'japao-guia':         { country: 'Japão',            flag: '🇯🇵' },
    'liechtenstein-guia': { country: 'Liechtenstein',     flag: '🇱🇮' },
    'luxemburgo-guia':    { country: 'Luxemburgo',        flag: '🇱🇺' },
    'marrocos-guia':      { country: 'Marrocos',          flag: '🇲🇦' },
    'monaco-guia':        { country: 'Mónaco',           flag: '🇲🇨' },
    'panama-guia':        { country: 'Panamá',           flag: '🇵🇦' },
    'peru-guia':          { country: 'Peru',              flag: '🇵🇪' },
    'portugal-guia':      { country: 'Portugal',          flag: '🇵🇹' },
    'tailandia-guia':     { country: 'Tailândia',        flag: '🇹🇭' },
    'taiwan-guia':        { country: 'Taiwan',            flag: '🇹🇼' },
    'turquia-guia':       { country: 'Turquia',           flag: '🇹🇷' },
    'uruguai-guia':       { country: 'Uruguai',           flag: '🇺🇾' },
    'vietna-guia':        { country: 'Vietnã',           flag: '🇻🇳' },
  };

  const GUIDE_SLUG = window.location.pathname.split('/').pop().replace(/\.html$/, '');
  const meta = GUIDE_META[GUIDE_SLUG] || { country: '', flag: '' };

  // ── localStorage ──────────────────────────────────────────────────────
  function getMarks() {
    try { return JSON.parse(localStorage.getItem('ld-marks') || '{}'); } catch (e) { return {}; }
  }
  function getMark(key) { return getMarks()[key] || null; }
  function setMark(key, name, type) {
    const marks = getMarks();
    if (marks[key] && marks[key].type === type) {
      delete marks[key];
      localStorage.setItem('ld-marks', JSON.stringify(marks));
      return null;
    }
    marks[key] = { type, name, guide: GUIDE_SLUG + '.html', country: meta.country, flag: meta.flag, ts: Date.now() };
    localStorage.setItem('ld-marks', JSON.stringify(marks));
    return marks[key];
  }

  // ── Card actions HTML ─────────────────────────────────────────────────
  function actionsHTML(key, eName) {
    const mk = getMark(key);
    return '<div class="card-actions" data-key="' + key + '" data-name="' + eName + '">' +
      '<button class="ca-btn ca-fui' + (mk && mk.type === 'fui' ? ' ca-on' : '') + '" onclick="__ldMark(this,\'fui\')">✓ Já fui</button>' +
      '<button class="ca-btn ca-quero' + (mk && mk.type === 'quero' ? ' ca-on' : '') + '" onclick="__ldMark(this,\'quero\')">♡ Quero ir</button>' +
      '<button class="ca-btn ca-share" onclick="__ldShare(this)" title="Partilhar">↗</button>' +
      '</div>';
  }

  // ── Public handlers (called from inline onclick) ──────────────────────
  window.__ldMark = function (btn, type) {
    var actions = btn.closest('.card-actions');
    var key  = actions.dataset.key;
    var name = actions.dataset.name;
    var mk   = setMark(key, name, type);
    actions.querySelector('.ca-fui').classList.toggle('ca-on', !!(mk && mk.type === 'fui'));
    actions.querySelector('.ca-quero').classList.toggle('ca-on', !!(mk && mk.type === 'quero'));
  };

  window.__ldShare = function (btn) {
    var name    = btn.closest('.card-actions').dataset.name;
    var pageUrl = location.origin + '/' + GUIDE_SLUG + '.html?q=' + encodeURIComponent(name);
    var text    = name + ' — Na Mesa com Luli Dias';
    if (navigator.share) {
      navigator.share({ title: name, text: text, url: pageUrl });
    } else {
      window.open('https://wa.me/?text=' + encodeURIComponent(text + '\n' + pageUrl), '_blank');
    }
  };

  // ── Attach buttons to a card ──────────────────────────────────────────
  function initCard(card) {
    if (card.querySelector('.card-actions')) return;
    var nameEl = card.querySelector('.card-name');
    if (!nameEl) return;
    var name = nameEl.textContent.trim();
    var key  = GUIDE_SLUG + '|' + name;
    var eName = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    var body  = card.querySelector('.card-body');
    if (body) body.insertAdjacentHTML('beforeend', actionsHTML(key, eName));
  }

  // ── MutationObserver — picks up cards added by render() ──────────────
  var obs = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.classList && node.classList.contains('restaurant-card')) { initCard(node); return; }
        if (node.querySelectorAll) node.querySelectorAll('.restaurant-card').forEach(initCard);
      });
    });
  });
  var root = document.getElementById('main') || document.body;
  obs.observe(root, { childList: true, subtree: true });
  document.querySelectorAll('.restaurant-card').forEach(initCard);

  // ── Auto-open local search when ?q= is in URL (for shared links) ─────
  var qParam = new URLSearchParams(location.search).get('q');
  if (qParam && typeof toggleSearch === 'function') {
    setTimeout(function () {
      toggleSearch();
      var inp = document.getElementById('searchInput');
      if (inp) { inp.value = qParam; if (typeof doSearch === 'function') doSearch(); }
    }, 300);
  }

  // ── Inject "Minha Lista" + "Busca Global" buttons into top-nav ──────
  function injectNavButtons() {
    var nav = document.querySelector('.top-nav');
    if (!nav || nav.querySelector('.nav-lista-btn')) return;
    var marks   = getMarks();
    var total   = Object.keys(marks).length;
    var badge   = total ? '<span class="nav-lista-badge">' + total + '</span>' : '';
    var listaEl = document.createElement('a');
    listaEl.href      = 'minha-lista.html';
    listaEl.className = 'nav-lista-btn';
    listaEl.title     = 'Minha Lista';
    listaEl.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' + badge;
    var searchToggle = nav.querySelector('.search-toggle');
    if (searchToggle) {
      nav.insertBefore(listaEl, searchToggle);
    } else {
      nav.appendChild(listaEl);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNavButtons);
  } else {
    injectNavButtons();
  }

  // ── Styles ────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent =
    '.card-actions{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;align-items:center}' +
    '.ca-btn{font-family:Montserrat,sans-serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;' +
    'border:1px solid var(--border);background:none;color:var(--ink-lt);padding:5px 11px;cursor:pointer;' +
    'border-radius:20px;transition:all .2s;white-space:nowrap;font-weight:500;line-height:1}' +
    '.ca-btn:hover{border-color:var(--gold);color:var(--gold)}' +
    '.ca-fui.ca-on{background:var(--gold);border-color:var(--gold);color:#fff}' +
    '.ca-quero.ca-on{background:var(--ink);border-color:var(--ink);color:#fff}' +
    '.ca-share{margin-left:auto;border-color:transparent;color:var(--ink-xs,#9A9A9A);padding:5px 8px}' +
    '.ca-share:hover{border-color:var(--border);color:var(--ink-lt)}' +
    '.nav-lista-btn{display:inline-flex;align-items:center;justify-content:center;position:relative;' +
    'width:36px;height:36px;border-radius:50%;border:1px solid var(--border);color:var(--ink-lt);' +
    'background:none;cursor:pointer;text-decoration:none;transition:all .2s;flex-shrink:0}' +
    '.nav-lista-btn:hover{border-color:var(--gold);color:var(--gold);background:var(--gold-bg)}' +
    '.nav-lista-badge{position:absolute;top:-4px;right:-4px;background:var(--gold);color:#fff;' +
    'font-size:8px;font-weight:700;min-width:16px;height:16px;border-radius:8px;display:flex;' +
    'align-items:center;justify-content:center;padding:0 3px;font-family:Montserrat,sans-serif}';
  document.head.appendChild(style);
})();
