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
      '<button class="ca-btn ca-share" onclick="__ldShare(this)" title="Compartilhar"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Compartilhar</button>' +
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
    var existing = document.getElementById('ld-share-dd');
    if (existing) { existing.remove(); return; }

    var actions = btn.closest('.card-actions');
    var name    = actions.dataset.name;
    var pageUrl = location.origin + '/' + GUIDE_SLUG + '.html?q=' + encodeURIComponent(name);
    var waText  = name + ' — Luli Dias · Restaurants & Hotels';

    var rect = btn.getBoundingClientRect();
    var dd   = document.createElement('div');
    dd.id    = 'ld-share-dd';
    dd.className = 'share-dd';
    var above = rect.top > 120;
    dd.style.cssText = (above
      ? 'bottom:' + (window.innerHeight - rect.top + 6) + 'px'
      : 'top:'    + (rect.bottom + 6) + 'px')
      + ';left:' + Math.min(rect.left, window.innerWidth - 170) + 'px';

    var waBtn = document.createElement('button');
    waBtn.className = 'share-dd-item';
    waBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.533 5.846L.057 23.571c-.088.32.217.617.535.52l5.867-1.537C8.066 23.467 10.001 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.85 0-3.598-.502-5.11-1.378l-.363-.214-3.765.987.999-3.672-.237-.375C2.548 15.738 2 13.937 2 12 2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg> WhatsApp';
    waBtn.onclick = function () {
      window.open('https://wa.me/?text=' + encodeURIComponent(waText + '\n' + pageUrl), '_blank');
      dd.remove();
    };

    var copyBtn = document.createElement('button');
    copyBtn.className = 'share-dd-item';
    copyBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar link';
    copyBtn.onclick = function () {
      (navigator.clipboard ? navigator.clipboard.writeText(pageUrl) : Promise.resolve(
        (function () { var t = document.createElement('textarea'); t.value = pageUrl; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); })()
      )).then(function () {
        copyBtn.textContent = '✓ Copiado!';
        setTimeout(function () { dd.remove(); }, 800);
      });
    };

    dd.appendChild(waBtn);
    dd.appendChild(copyBtn);
    document.body.appendChild(dd);

    setTimeout(function () {
      function closeDD(e) { if (!dd.contains(e.target)) { dd.remove(); document.removeEventListener('click', closeDD); } }
      document.addEventListener('click', closeDD);
    }, 0);
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
    '.restaurant-card{display:flex!important;flex-direction:column!important}' +
    '.card-body{display:flex!important;flex-direction:column!important;flex:1!important}' +
    '.card-actions{display:flex;gap:6px;margin-top:auto;padding-top:16px;flex-wrap:wrap;align-items:center}' +
    '.ca-btn{font-family:Montserrat,sans-serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;' +
    'border:1px solid var(--border);background:none;color:var(--ink-lt);padding:5px 11px;cursor:pointer;' +
    'border-radius:20px;transition:all .2s;white-space:nowrap;font-weight:500;line-height:1}' +
    '.ca-btn:hover{border-color:var(--gold);color:var(--gold)}' +
    '.ca-fui.ca-on{background:var(--gold);border-color:var(--gold);color:#fff}' +
    '.ca-quero.ca-on{background:var(--ink);border-color:var(--ink);color:#fff}' +
    '.ca-share{margin-left:auto;display:inline-flex;align-items:center;gap:5px;color:var(--ink-lt);padding:5px 11px}' +
    '.ca-share:hover{border-color:var(--gold);color:var(--gold)}' +
    '.share-dd{position:fixed;background:#fff;border:1px solid var(--border,#E8E0D5);border-radius:4px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:2000;overflow:hidden;min-width:155px}' +
    '.share-dd-item{display:flex;align-items:center;gap:8px;padding:10px 14px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-lt,#5A5A5A);background:none;border:none;width:100%;text-align:left;cursor:pointer;font-family:Montserrat,sans-serif;transition:color .2s;white-space:nowrap}' +
    '.share-dd-item:hover{color:var(--gold,#B8922A)}' +
    '.share-dd-item+.share-dd-item{border-top:1px solid var(--border,#E8E0D5)}' +
    '.nav-lista-btn{display:inline-flex;align-items:center;justify-content:center;position:relative;' +
    'width:36px;height:36px;border-radius:50%;border:1px solid var(--border);color:var(--ink-lt);' +
    'background:none;cursor:pointer;text-decoration:none;transition:all .2s;flex-shrink:0}' +
    '.nav-lista-btn:hover{border-color:var(--gold);color:var(--gold);background:var(--gold-bg)}' +
    '.nav-lista-badge{position:absolute;top:-4px;right:-4px;background:var(--gold);color:#fff;' +
    'font-size:8px;font-weight:700;min-width:16px;height:16px;border-radius:8px;display:flex;' +
    'align-items:center;justify-content:center;padding:0 3px;font-family:Montserrat,sans-serif}';
  document.head.appendChild(style);
})();
