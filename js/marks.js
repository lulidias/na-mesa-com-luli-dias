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
    'noruega-guia':       { country: 'Noruega',           flag: '🇳🇴' },
    'suecia-guia':        { country: 'Suécia',            flag: '🇸🇪' },
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

  // slug idêntico ao das guias (para id do card e casar com novidades.json)
  function ldSlug(n){return n.toLowerCase().replace(/æ/g,'ae').replace(/ø/g,'o').replace(/å/g,'a').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}

  // ── Selo NOVO: marca os cards que estão entre as últimas adições do guia ──
  var NOV_SLUGS = null;
  function markNovo(card){
    if(!NOV_SLUGS||!card)return;
    var nameEl=card.querySelector('.card-name'); if(!nameEl)return;
    var sl=card.id?card.id.replace('card-',''):ldSlug(nameEl.textContent.trim());
    if(!NOV_SLUGS.has(sl))return;
    var badges=card.querySelector('.card-badges'); if(!badges||badges.querySelector('.bnovo'))return;
    var b=document.createElement('span'); b.className='badge bnovo'; b.textContent='NOVO';
    badges.insertBefore(b, badges.firstChild);
  }
  fetch('novidades.json',{cache:'no-cache'}).then(function(r){return r.json();}).then(function(list){
    NOV_SLUGS=new Set(list.filter(function(x){return x.guide===GUIDE_SLUG;}).map(function(x){return x.slug;}));
    if(!NOV_SLUGS.size)return;
    if(!document.getElementById('bnovo-css')){var st=document.createElement('style');st.id='bnovo-css';st.textContent='.badge.bnovo{background:#B8922A;color:#fff;border:1px solid #B8922A;font-weight:700;letter-spacing:.5px}';document.head.appendChild(st);}
    document.querySelectorAll('.restaurant-card').forEach(markNovo);
  }).catch(function(){});

  // ── Notes do Supabase (por estabelecimento) ───────────────────────────
  var NOTES = {};
  var NOTES_LOADED = false;
  var SB_URL = 'https://saotncritqxuchsvvnzi.supabase.co/functions/v1/';

  function fetchNotes() {
    if (!GUIDE_SLUG) return;
    fetch(SB_URL + 'guia-notes?guide=' + GUIDE_SLUG)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (data) {
        if (!Array.isArray(data)) return;
        data.forEach(function (row) { NOTES[row.slug] = row; });
        NOTES_LOADED = true;
        document.querySelectorAll('.restaurant-card').forEach(applyNote);
      })
      .catch(function () {});
  }

  function applyNote(card) {
    var sl = card.id ? card.id.replace('card-', '') : '';
    var n = NOTES[sl];
    if (!n) return;
    if (n.luli_knows && !card.querySelector('.badge-luli')) {
      var badgesEl = card.querySelector('.card-badges');
      if (badgesEl) {
        var b = document.createElement('span');
        b.className = 'badge badge-luli';
        b.innerHTML = '✦ Amigo da casa';
        badgesEl.insertAdjacentElement('afterbegin', b);
      }
    }
    if (n.luli_note && !card.querySelector('.card-note-luli')) {
      var actions = card.querySelector('.card-actions');
      if (!actions) return;
      var box = document.createElement('div');
      box.className = 'card-note-luli';
      var photoHtml = n.chef_photo_url
        ? '<div class="cln-media"><img src="' + n.chef_photo_url + '" alt="' + (n.chef_name || 'Proprietário') + '"></div>'
        : '';
      box.innerHTML =
        photoHtml +
        '<div class="cln-body">' +
          '<div class="cln-text">“' + n.luli_note + '”</div>' +
          '<span class="cln-cta">✦ Ver nota completa →</span>' +
        '</div>';
      box.addEventListener('click', function (e) { e.stopPropagation(); openModal(card); });
      actions.parentNode.insertBefore(box, actions);
    }
  }

  fetchNotes();

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
    var card    = actions.closest('.restaurant-card');
    var slug    = card && card.id ? card.id.replace('card-', '') : '';
    var pageUrl = location.origin + location.pathname + (slug ? '?modal=' + slug : '?q=' + encodeURIComponent(name));
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

  window.__ldModalShare = function (action) {
    var slug    = window.__ldCurrentSlug || '';
    var name    = window.__ldCurrentName || '';
    var pageUrl = location.origin + location.pathname + (slug ? '?modal=' + slug : '');
    var waText  = name + ' — Luli Dias · Restaurants & Hotels';
    if (action === 'wa') {
      window.open('https://wa.me/?text=' + encodeURIComponent(waText + '\n' + pageUrl), '_blank');
    } else {
      var copyBtn = document.querySelector('.ldm-share-copy');
      var origHTML = copyBtn ? copyBtn.innerHTML : '';
      (navigator.clipboard ? navigator.clipboard.writeText(pageUrl) : Promise.resolve(
        (function () { var t = document.createElement('textarea'); t.value = pageUrl; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); })()
      )).then(function () {
        if (copyBtn) {
          copyBtn.textContent = '✓ Copiado!';
          setTimeout(function () { copyBtn.innerHTML = origHTML; }, 1500);
        }
      });
    }
  };

  // ── Modal ────────────────────────────────────────────────────────────
  var modal = null;
  var modalIdx = 0;

  function buildModal() {
    if (modal) return;
    modal = document.createElement('div');
    modal.id = 'ld-modal';
    modal.innerHTML =
      '<div id="ldm-overlay"></div>' +
      '<div id="ldm-box">' +
        '<button id="ldm-close" aria-label="Fechar">✕</button>' +
        '<div id="ldm-gallery"></div>' +
        '<div id="ldm-body"></div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.querySelector('#ldm-overlay').onclick = closeModal;
    modal.querySelector('#ldm-close').onclick   = closeModal;
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
      else if (e.key === 'ArrowLeft')  { var b = modal && modal.querySelector('.ldm-prev'); if (b) b.click(); }
      else if (e.key === 'ArrowRight') { var b = modal && modal.querySelector('.ldm-next'); if (b) b.click(); }
    });
    window.addEventListener('popstate', function () { if (modal && modal.classList.contains('ldm-open')) closeModal(true); });
  }

  function openModal(card) {
    buildModal();
    modalIdx = 0;

    // ── Extract from DOM ──────────────────────────────────────────────
    var name     = (card.querySelector('.card-name')    || {}).textContent || '';
    var cuisine  = (card.querySelector('.card-cuisine') || {}).textContent || '';
    var badgesEl = card.querySelector('.card-badges');
    var priceEl  = card.querySelector('.card-price');
    var descEl   = card.querySelector('.card-desc');
    var noteEl   = card.querySelector('.card-note');
    var addrEl   = card.querySelector('.c-addr');

    var badges = badgesEl ? badgesEl.innerHTML : '';
    var price  = priceEl  ? priceEl.innerHTML  : '';
    var desc   = descEl   ? descEl.innerHTML   : '';
    var note   = noteEl   ? noteEl.textContent.replace(/^✦\s*/, '') : '';
    var addr   = addrEl   ? addrEl.textContent : '';

    var phone = null, web = null, ig = null;
    card.querySelectorAll('a.c-phone').forEach(function (a) {
      if (a.href.startsWith('tel:'))           phone = { href: a.href, text: a.textContent };
      else if (a.href.includes('instagram'))   ig    = { href: a.href, text: a.textContent };
      else                                     web   = { href: a.href, text: a.textContent };
    });

    // ── Photos ────────────────────────────────────────────────────────
    var photos = [];
    var photoWrap = card.querySelector('.card-photo-wrap');
    if (photoWrap && photoWrap.dataset.urls) {
      try { photos = JSON.parse(photoWrap.dataset.urls); } catch(e) {}
    }
    if (!photos.length) {
      card.querySelectorAll('img').forEach(function (img) {
        if (img.src && !img.src.startsWith('data:')) photos.push(img.src);
      });
    }

    // ── Gallery ───────────────────────────────────────────────────────
    var gallEl = modal.querySelector('#ldm-gallery');
    gallEl.innerHTML = '';
    if (photos.length) {
      var track = document.createElement('div');
      track.className = 'ldm-track';
      photos.forEach(function (src) {
        var im = document.createElement('img');
        im.src = src; im.className = 'ldm-img'; im.alt = name;
        track.appendChild(im);
      });
      gallEl.appendChild(track);

      if (photos.length > 1) {
        var dots  = document.createElement('div');  dots.className  = 'ldm-dots';
        var ctr   = document.createElement('div');  ctr.className   = 'ldm-counter'; ctr.textContent = '1 / ' + photos.length;
        var btnP  = document.createElement('button'); btnP.className = 'ldm-nav ldm-prev'; btnP.innerHTML = '‹';
        var btnN  = document.createElement('button'); btnN.className = 'ldm-nav ldm-next'; btnN.innerHTML = '›';
        photos.forEach(function (_, i) {
          var d = document.createElement('span'); if (i === 0) d.className = 'ldm-dot-on'; dots.appendChild(d);
        });
        gallEl.appendChild(btnP); gallEl.appendChild(btnN); gallEl.appendChild(dots); gallEl.appendChild(ctr);

        function goPhoto(i) {
          modalIdx = (i + photos.length) % photos.length;
          track.style.transform = 'translateX(-' + (modalIdx * 100) + '%)';
          dots.querySelectorAll('span').forEach(function (d, j) { d.className = j === modalIdx ? 'ldm-dot-on' : ''; });
          ctr.textContent = (modalIdx + 1) + ' / ' + photos.length;
        }
        btnP.onclick = function (e) { e.stopPropagation(); goPhoto(modalIdx - 1); };
        btnN.onclick = function (e) { e.stopPropagation(); goPhoto(modalIdx + 1); };

        // Swipe
        var sx = 0;
        gallEl.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
        gallEl.addEventListener('touchend',   function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) goPhoto(modalIdx + (dx < 0 ? 1 : -1)); });
      }
    }

    // ── Body ──────────────────────────────────────────────────────────
    var mapUrl = addr ? 'https://maps.google.com/maps?q=' + encodeURIComponent(addr) : '';
    var contactHtml = '';
    if (addr)  contactHtml += '<a href="' + mapUrl + '" target="_blank" rel="noopener" class="ldm-crow ldm-map"><span>📍</span><span>' + addr + '</span><span class="ldm-arr">→</span></a>';
    if (phone) contactHtml += '<a href="' + phone.href + '" class="ldm-crow"><span>📞</span><span>' + phone.text + '</span></a>';
    if (web)   contactHtml += '<a href="' + web.href   + '" target="_blank" rel="noopener" class="ldm-crow"><span>🌐</span><span>' + web.text + '</span></a>';
    if (ig)    contactHtml += '<a href="' + ig.href    + '" target="_blank" rel="noopener" class="ldm-crow"><span>📷</span><span>' + ig.text  + '</span></a>';

    // ── Notes do Supabase ─────────────────────────────────────────────
    var sl = card.id ? card.id.replace('card-', '') : '';
    window.__ldCurrentSlug = sl;
    window.__ldCurrentName = name;
    var nb = NOTES[sl] || {};
    var luliKnows   = nb.luli_knows   || false;
    var luliNote    = nb.luli_note    || '';
    var luliStory   = nb.luli_story   || '';
    var luliPhoto   = nb.luli_photo_url || '';
    var chefName    = nb.chef_name    || '';
    var chefPhoto   = nb.chef_photo_url || '';
    var favDish     = nb.favorite_dish || '';

    var luliSecHtml = '';
    if (luliKnows || luliStory || luliPhoto || chefPhoto || favDish) {
      luliSecHtml = '<div class="ldm-sec ldm-luli-sec">';
      if (luliKnows) luliSecHtml += '<div class="ldm-luli-badge">✦ Amigo da casa</div>';
      // Chef/proprietário: foto grande em destaque
      if (chefPhoto) {
        luliSecHtml +=
          '<div class="ldm-luli-hero">' +
            '<img src="' + chefPhoto + '" alt="' + (chefName || 'Proprietário') + '">' +
            (chefName ? '<div class="ldm-luli-hero-cap">' + chefName + '</div>' : '') +
          '</div>';
      }
      // Luli com o proprietário: foto secundária em linha
      if (luliPhoto) {
        luliSecHtml +=
          '<div class="ldm-luli-row">' +
            '<img src="' + luliPhoto + '" class="ldm-luli-thumb" alt="Luli Dias">' +
            '<span class="ldm-luli-row-lbl">Com o Luli</span>' +
          '</div>';
      }
      if (luliStory) luliSecHtml += '<p class="ldm-story">' + luliStory + '</p>';
      if (favDish)   luliSecHtml += '<div class="ldm-dish"><span class="ldm-dish-lbl">Prato favorito do Luli</span><span class="ldm-dish-val">' + favDish + '</span></div>';
      luliSecHtml += '</div>';
    }

    var finalNote = luliNote || note;

    modal.querySelector('#ldm-body').innerHTML =
      '<div class="ldm-hdr">' +
        '<div class="ldm-name">' + name + '</div>' +
        (badges ? '<div class="ldm-badges">' + badges + (luliKnows && !badges.includes('badge-luli') ? '<span class="badge badge-luli">✦ Amigo da casa</span>' : '') + '</div>' : (luliKnows ? '<div class="ldm-badges"><span class="badge badge-luli">✦ Amigo da casa</span></div>' : '')) +
        '<div class="ldm-meta">' + cuisine + (price ? '<span class="ldm-price">' + price + '</span>' : '') + '</div>' +
      '</div>' +
      (finalNote ? '<div class="ldm-sec"><div class="ldm-note">✦ ' + finalNote + '</div></div>' : '') +
      luliSecHtml +
      (desc ? '<div class="ldm-sec ldm-desc">' + desc + '</div>' : '') +
      (contactHtml ? '<div class="ldm-sec ldm-contact">' + contactHtml + '</div>' : '') +
      (sl ? '<div class="ldm-sec ldm-share-row">' +
        '<button class="ldm-share-btn ldm-share-wa" onclick="__ldModalShare(\'wa\')">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.533 5.846L.057 23.571c-.088.32.217.617.535.52l5.867-1.537C8.066 23.467 10.001 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.85 0-3.598-.502-5.11-1.378l-.363-.214-3.765.987.999-3.672-.237-.375C2.548 15.738 2 13.937 2 12 2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>' +
          ' WhatsApp' +
        '</button>' +
        '<button class="ldm-share-btn ldm-share-copy" onclick="__ldModalShare(\'copy\')">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
          ' Copiar link' +
        '</button>' +
      '</div>' : '');

    // hash & open
    var hash = card.id ? card.id.replace('card-', '') : '';
    if (hash) history.pushState(null, '', '#' + hash);
    modal.classList.add('ldm-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(skipHistory) {
    if (!modal || !modal.classList.contains('ldm-open')) return;
    modal.classList.remove('ldm-open');
    document.body.style.overflow = '';
    if (!skipHistory) history.pushState(null, '', location.pathname + location.search);
  }

  // ── Attach buttons to a card ──────────────────────────────────────────
  function initCard(card) {
    if (card.querySelector('.card-actions')) return;
    var nameEl = card.querySelector('.card-name');
    if (!nameEl) return;
    var name = nameEl.textContent.trim();
    if (!card.id) card.id = 'card-' + ldSlug(name);
    markNovo(card);
    var key  = GUIDE_SLUG + '|' + name;
    var eName = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    var body  = card.querySelector('.card-body');
    if (body) body.insertAdjacentHTML('beforeend', actionsHTML(key, eName));

    // Aplicar nota do Supabase se já carregada
    applyNote(card);

    // Clamp descrição + "Ler mais" abre modal
    var descEl = card.querySelector('.card-desc');
    if (descEl && !descEl.dataset.ldmC) {
      descEl.dataset.ldmC = '1';
      descEl.style.cursor = 'pointer';
      descEl.addEventListener('click', function () { openModal(card); });
      var hint = document.createElement('button');
      hint.className = 'ldm-more';
      hint.textContent = 'Ler mais →';
      hint.addEventListener('click', function (e) { e.stopPropagation(); openModal(card); });
      descEl.after(hint);
    }

    // Photo wrap → opens modal
    var wrap = card.querySelector('.card-photo-wrap');
    if (wrap && !wrap.dataset.ldmInit) {
      wrap.dataset.ldmInit = '1';
      wrap.classList.add('ldm-clickable');
      wrap.addEventListener('click', function (e) {
        if (e.target.classList.contains('card-nav')) return;
        e.stopPropagation();
        openModal(card);
      });
    }
    // Card name → opens modal
    if (!nameEl.dataset.ldmInit) {
      nameEl.dataset.ldmInit = '1';
      nameEl.style.cursor = 'pointer';
      nameEl.addEventListener('click', function () { openModal(card); });
    }
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

  // ── Auto-open card modal when URL has ?modal=slug or #slug (shared links) ──
  function tryOpenSlug(slug) {
    if (!slug) return false;
    var card = document.getElementById('card-' + slug);
    if (card) { openModal(card); return true; }
    return false;
  }

  var _modalParam = new URLSearchParams(location.search).get('modal');
  if (_modalParam) {
    // ?modal=slug (from WhatsApp share) — clean URL first so back button goes
    // to guide page without re-opening the modal
    history.replaceState(null, '', location.pathname);
    setTimeout(function () {
      if (!tryOpenSlug(_modalParam)) {
        var _ma = 0;
        var _mt = setInterval(function () {
          if (tryOpenSlug(_modalParam) || ++_ma > 20) clearInterval(_mt);
        }, 300);
      }
    }, 300);
  } else if (location.hash) {
    // #slug fallback (backward-compatible with old shared links)
    var _hash = location.hash.replace('#', '');
    setTimeout(function () {
      if (!tryOpenSlug(_hash)) {
        var _ha = 0;
        var _ht = setInterval(function () {
          if (tryOpenSlug(_hash) || ++_ha > 15) clearInterval(_ht);
        }, 250);
      }
    }, 200);
  }

  // ── Auto-open local search when ?q= is in URL (fallback) ─────────────
  var qParam = new URLSearchParams(location.search).get('q');
  if (qParam && !location.hash && typeof toggleSearch === 'function') {
    setTimeout(function () {
      toggleSearch();
      var inp = document.getElementById('searchInput');
      if (inp) { inp.value = qParam; if (typeof doSearch === 'function') doSearch(); }
    }, 300);
  }

  // ── Inject util-link nav buttons into top-nav (matches homepage style) ──
  function injectNavButtons() {
    var nav = document.querySelector('.top-nav');
    if (!nav || nav.querySelector('#nav-lista-btn')) return;

    var marks = getMarks();
    var total = Object.keys(marks).length;

    // 1. Transform #lang-toggle pill → util-link (dropdown 🌐, gerido inline)
    var langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
      langBtn.className = 'util-link';
      langBtn.removeAttribute('style');
      var curLang = localStorage.getItem('ld-lang') || 'pt';
      langBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' + curLang.toUpperCase();
      if (curLang !== 'pt') langBtn.style.color = 'var(--gold)';
      // NÃO envolver window.toggleLang: o dropdown inline é o dono canónico.
    }

    // 2. Transform .search-toggle → util-link with "Busca" label
    var searchBtn = nav.querySelector('.search-toggle');
    if (searchBtn) {
      searchBtn.className = 'util-link';
      searchBtn.removeAttribute('style');
      searchBtn.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Busca';
    }

    // 3. Create Minha Lista button
    var svgHeart = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    var badgeHtml = '<span class="util-badge"' + (total ? '' : ' style="display:none"') + '>' + total + '</span>';
    var listaEl = document.createElement('a');
    listaEl.href = 'minha-lista.html';
    listaEl.id = 'nav-lista-btn';
    listaEl.className = 'util-link';
    listaEl.innerHTML = svgHeart + 'Minha Lista' + badgeHtml;

    // 4. Create Entrar button
    var svgPerson = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    var authBtn = document.createElement('button');
    authBtn.id = 'util-auth-btn';
    authBtn.className = 'util-link';
    authBtn.innerHTML = svgPerson + 'Entrar';

    // 5. Agrupar todos os botões num wrapper à direita (igual ao util-bar da homepage)
    var rightGroup = document.createElement('div');
    rightGroup.id = 'top-nav-right';
    rightGroup.style.cssText = 'display:flex;align-items:center;margin-left:auto';
    if (searchBtn) rightGroup.appendChild(searchBtn);
    rightGroup.appendChild(listaEl);
    if (langBtn) {
      if (langBtn.parentNode) langBtn.parentNode.removeChild(langBtn);
      rightGroup.appendChild(langBtn);
    }
    rightGroup.appendChild(authBtn);
    nav.appendChild(rightGroup);

    // 5. Load Supabase + auth.js for the Entrar button to work
    if (!document.querySelector('script[src*="supabase"]')) {
      var sbScript = document.createElement('script');
      sbScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      document.head.appendChild(sbScript);
    }
    if (!document.querySelector('script[src*="auth.js"]')) {
      var authScript = document.createElement('script');
      authScript.src = 'js/auth.js';
      document.head.appendChild(authScript);
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
    '.util-link{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--ink-lt);text-decoration:none;' +
    'display:inline-flex;align-items:center;gap:6px;padding:0 12px;height:44px;transition:color .2s;' +
    'white-space:nowrap;background:none;border:none;cursor:pointer;font-family:\'Montserrat\',sans-serif;font-weight:500;flex-shrink:0}' +
    '.util-link:hover{color:var(--gold)}' +
    '.util-badge{background:var(--gold);color:#fff;font-size:8px;font-weight:700;min-width:16px;height:16px;' +
    'border-radius:8px;display:inline-flex;align-items:center;justify-content:center;padding:0 3px;font-family:\'Montserrat\',sans-serif}' +
    // Modal
    '#ld-modal{display:none;position:fixed;inset:0;z-index:9000}' +
    '#ld-modal.ldm-open{display:block}' +
    '#ldm-overlay{position:absolute;inset:0;background:rgba(10,8,6,.65);backdrop-filter:blur(3px)}' +
    '#ldm-box{position:absolute;bottom:0;left:0;right:0;max-height:91vh;background:#F7F3EE;border-radius:18px 18px 0 0;overflow-y:auto;-webkit-overflow-scrolling:touch;animation:ldmUp .28s cubic-bezier(.22,1,.36,1)}' +
    '@keyframes ldmUp{from{transform:translateY(60%);opacity:.4}to{transform:translateY(0);opacity:1}}' +
    '@media(min-width:700px){#ldm-box{top:50%;left:50%;right:auto;bottom:auto;width:660px;max-height:88vh;border-radius:10px;transform:translate(-50%,-50%);animation:ldmFade .2s ease}' +
    '@keyframes ldmFade{from{opacity:0;transform:translate(-50%,-52%)}to{opacity:1;transform:translate(-50%,-50%)}}}' +
    '#ldm-close{position:sticky;top:12px;float:right;margin:12px 12px -44px 0;width:32px;height:32px;border-radius:50%;background:#fff;border:1px solid #E8E0D5;font-size:13px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;color:#5A5A5A;flex-shrink:0}' +
    '#ldm-close:hover{border-color:var(--gold,#B8922A);color:var(--gold,#B8922A)}' +
    // Gallery
    '#ldm-gallery{position:relative;overflow:hidden;background:#111}' +
    '.ldm-track{display:flex;transition:transform .38s cubic-bezier(.25,.46,.45,.94)}' +
    '.ldm-img{width:100%;flex-shrink:0;object-fit:cover;height:clamp(320px,55vh,520px)}' +
    '@media(min-width:700px){.ldm-img{height:480px}}' +
    '.ldm-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.45);border:none;border-radius:50%;width:40px;height:40px;font-size:24px;cursor:pointer;z-index:5;display:flex;align-items:center;justify-content:center;line-height:1;color:#fff;backdrop-filter:blur(4px)}' +
    '.ldm-nav:hover{background:rgba(0,0,0,.65)}' +
    '.ldm-prev{left:12px}.ldm-next{right:12px}' +
    '.ldm-dots{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:5px;pointer-events:none}' +
    '.ldm-dots span{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.45)}' +
    '.ldm-dot-on{background:#fff!important}' +
    '.ldm-counter{position:absolute;top:12px;right:12px;background:rgba(0,0,0,.5);color:#fff;font-size:10px;letter-spacing:1px;padding:4px 10px;border-radius:12px;font-family:Montserrat,sans-serif;pointer-events:none;backdrop-filter:blur(4px)}' +
    // Photo-wrap clickable hint
    '.ldm-clickable{cursor:pointer;position:relative}' +
    '.ldm-clickable::after{content:"⊕";position:absolute;bottom:10px;right:10px;background:rgba(247,243,238,.88);border:1px solid #E8E0D5;color:#1A1A1A;font-size:14px;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;pointer-events:none;line-height:1}' +
    '.ldm-clickable:hover::after{opacity:1}' +
    // Body
    '.ldm-hdr{padding:20px 24px 12px;clear:both}' +
    '.ldm-name{font-family:Georgia,"Times New Roman",serif;font-size:22px;font-weight:400;color:#1A1A1A;margin-bottom:8px;line-height:1.3}' +
    '.ldm-badges{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}' +
    '.ldm-meta{font-family:Montserrat,sans-serif;font-size:10px;letter-spacing:1px;color:#7A7A7A;display:flex;align-items:center;gap:12px}' +
    '.ldm-price{color:var(--gold,#B8922A);font-weight:700;letter-spacing:.5px}' +
    '.ldm-sec{padding:14px 24px;border-top:1px solid #E8E0D5}' +
    '.ldm-note{font-family:Montserrat,sans-serif;font-size:11px;letter-spacing:.5px;color:var(--gold,#B8922A)}' +
    '.ldm-desc{font-size:14px;line-height:1.78;color:#3A3835}' +
    '.ldm-desc strong,.ldm-desc b{font-weight:600;color:#1A1A1A}' +
    '.ldm-contact{display:flex;flex-direction:column;gap:0}' +
    '.ldm-crow{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:#3A3A3A;text-decoration:none;padding:9px 0;border-bottom:1px solid #F0EBE4}' +
    '.ldm-crow:last-child{border-bottom:none}' +
    '.ldm-crow:hover{color:var(--gold,#B8922A)}' +
    '.ldm-crow span:first-child{flex-shrink:0;width:18px;text-align:center}' +
    '.ldm-arr{margin-left:auto;color:var(--gold,#B8922A);font-size:11px;flex-shrink:0;align-self:center}' +
    // Descrição truncada
    '.card-desc{display:-webkit-box!important;-webkit-line-clamp:3!important;-webkit-box-orient:vertical!important;overflow:hidden!important;cursor:pointer}' +
    '.ldm-more{background:none;border:none;padding:4px 0 0;font-family:Montserrat,sans-serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold,#B8922A);cursor:pointer;display:block}' +
    '.ldm-more:hover{opacity:.75}' +
    // Badge "Luli conhece"
    '.badge-luli{background:var(--gold,#B8922A)!important;color:#fff!important;font-size:9px;letter-spacing:1px;padding:3px 8px;border-radius:10px;font-family:Montserrat,sans-serif;white-space:nowrap}' +
    // Card note — foto do proprietário em destaque
    '.card-note-luli{background:#FAF5EB;border:1px solid #E8D9B0;border-radius:4px;overflow:hidden;margin-bottom:10px;cursor:pointer;transition:border-color .2s}' +
    '.card-note-luli:hover{border-color:#B8922A}' +
    '.cln-media{width:100%;height:180px;overflow:hidden}' +
    '.cln-media img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.cln-body{padding:10px 12px 0}' +
    '.cln-text{font-family:Georgia,"Times New Roman",serif;font-size:11px;font-style:italic;color:#3A3530;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.cln-cta{display:block;width:100%;text-align:center;font-family:Montserrat,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#B8922A;font-weight:600;padding:6px 0;border-top:1px solid #E8D9B0;margin-top:8px}' +
    // Modal — foto grande em destaque
    '.ldm-luli-sec{background:#FAF6EF;padding-top:0!important}' +
    '.ldm-luli-badge{font-family:Montserrat,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold,#B8922A);padding:18px 24px 12px;display:block}' +
    '.ldm-luli-hero{width:100%;overflow:hidden;background:#EDE7DF}' +
    '.ldm-luli-hero img{width:100%;max-height:440px;display:block;object-fit:cover}' +
    '.ldm-luli-hero-cap{padding:10px 24px;font-family:Montserrat,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--ink-lt,#7A7A7A);border-bottom:1px solid #F0EBE4}' +
    '.ldm-luli-row{display:flex;align-items:center;gap:10px;padding:14px 24px 0}' +
    '.ldm-luli-thumb{width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--gold,#B8922A);flex-shrink:0}' +
    '.ldm-luli-row-lbl{font-family:Montserrat,sans-serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#7A7A7A}' +
    '.ldm-story{font-size:13px;line-height:1.75;color:#3A3835;margin:0;font-style:italic;padding:14px 24px 0}' +
    '.ldm-dish{display:flex;flex-direction:column;gap:3px;margin:12px 24px 0;padding-top:12px;border-top:1px solid #F0EBE4}' +
    '.ldm-dish-lbl{font-family:Montserrat,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#B8922A}' +
    '.ldm-dish-val{font-size:14px;color:#1A1A1A;font-family:Georgia,serif}' +
    // Share row inside modal
    '.ldm-share-row{display:flex;gap:10px;padding-bottom:18px}' +
    '.ldm-share-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px 0;border-radius:8px;border:1.5px solid #E8E0D5;background:#fff;font-family:Montserrat,sans-serif;font-size:10px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;color:#3A3A3A;transition:all .2s}' +
    '.ldm-share-btn:hover{border-color:var(--gold,#B8922A);color:var(--gold,#B8922A)}' +
    '.ldm-share-wa:hover{background:#25D366;border-color:#25D366;color:#fff}';
  document.head.appendChild(style);
})();

// ─── Stats do país reagem ao filtro de tipo (Todos/Restaurantes/Hotéis) ───
(function () {
  if (typeof window.setType !== 'function') return;
  function recomputeStats(type) {
    if (typeof CITIES === 'undefined') return;
    var r = 0, h = 0, cities = 0, m1 = 0, m2 = 0, m3 = 0, bib = 0, k1 = 0, k2 = 0, k3 = 0;
    (CITIES || []).forEach(function (city) {
      if (!city || !city.entries || !city.entries.length) return;
      var counted = false;
      city.entries.forEach(function (e) {
        if (!e || e.pending) return;
        var isH = e.t === 'h';
        if (type === 'r' && isH) return;
        if (type === 'h' && !isH) return;
        counted = true;
        if (isH) { h++; if (e.k === 1) k1++; else if (e.k === 2) k2++; else if (e.k === 3) k3++; }
        else r++;
        if (e.m === 'm1') m1++; else if (e.m === 'm2') m2++; else if (e.m === 'm3') m3++;
        else if (e.m === 'bib') bib++;
      });
      if (counted) cities++;
    });
    var stars = m1 + m2 * 2 + m3 * 3, keys = k1 + k2 * 2 + k3 * 3;
    var bar = document.querySelector('.stats-bar'); if (!bar) return;
    bar.querySelectorAll('.stat').forEach(function (st) {
      var lbl = ((st.querySelector('.stat-lbl') || {}).textContent || '').toLowerCase();
      var num = st.querySelector('.stat-num'); if (!num) return;
      var show = true;
      if (lbl.indexOf('restaurant') >= 0) { num.textContent = r; show = type !== 'h'; }
      else if (lbl.indexOf('cidade') >= 0 || lbl.indexOf('estado') >= 0 || lbl.indexOf('cit') >= 0 || lbl.indexOf('state') >= 0) { num.textContent = cities; }
      else if (lbl.indexOf('hot') >= 0) { num.textContent = h; show = type !== 'r'; }
      else if (lbl.indexOf('chave') >= 0 || lbl.indexOf('key') >= 0) { num.textContent = keys > 0 ? keys + ' 🗝' : '0'; show = type !== 'r'; }
      else if (lbl.indexOf('michelin') >= 0 || lbl.indexOf('estrela') >= 0 || lbl.indexOf('star') >= 0) { num.textContent = stars > 0 ? stars + ' ★' : '0'; show = type !== 'h'; }
      else if (lbl.indexOf('bib') >= 0) { num.textContent = bib; show = type !== 'h'; }
      else if (lbl.indexOf('mercado') >= 0 || lbl.indexOf('market') >= 0) { show = type === 'all' || type === 'm'; }
      st.style.display = show ? '' : 'none';
    });
  }
  var _origSetType = window.setType;
  window.setType = function (t, btn) {
    _origSetType(t, btn);
    try { recomputeStats(t === 'm' ? 'all' : t); } catch (_) {}
  };
  // aplicar já se a página abriu com ?type= do índice
  try { if (typeof activeType !== 'undefined' && activeType !== 'all') recomputeStats(activeType); } catch (_) {}
})();

// ─── Credencial de pesquisa por país (dados agregados de pesquisa-paises.json) ───
(function () {
  var m = location.pathname.match(/\/([a-z-]+)-guia\.html$/);
  if (!m) return;
  var slug = m[1];
  fetch('pesquisa-paises.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d[slug]) return;
    var bar = document.querySelector('.stats-bar');
    if (!bar) return;
    var p = d[slug];
    var en = false;
    try { en = localStorage.getItem('ld-lang') === 'en'; } catch (_) {}
    var el = document.createElement('div');
    el.className = 'ld-pesquisa-pais';
    el.style.cssText = 'text-align:center;padding:9px 20px;background:var(--gold-bg,#FAF5EB);border-bottom:1px solid var(--border,#E8E0D5);font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold,#B8922A)';
    el.textContent = en
      ? ('✦ Research behind this guide: ' + p.visitas + (p.visitas === 1 ? ' visit' : ' visits') + ' · ' + p.noites + ' days in the country · since ' + p.desde)
      : ('✦ Pesquisa deste guia: ' + p.visitas + (p.visitas === 1 ? ' visita' : ' visitas') + ' · ' + p.noites + ' dias no país · desde ' + p.desde);
    bar.parentNode.insertBefore(el, bar.nextSibling);
  }).catch(function () {});
})();

/* ===== Credencial de estadias por hotel (auditoria de viagens) ===== */
(function(){
  var VIS=null;
  var MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  function normN(x){
    return (x||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  }
  function fmes(u){ // '2026-03' -> 'mar/2026'
    var p=(u||'').split('-'); if(p.length<2) return u;
    return MES[parseInt(p[1],10)-1]+'/'+p[0];
  }
  function aplicar(){
    if(!VIS) return;
    document.querySelectorAll('.card-body').forEach(function(b){
      if(b.querySelector('.ld-visitas')) return;
      var nm=b.querySelector('.card-name'); if(!nm) return;
      var d=VIS[normN(nm.textContent)]; if(!d) return;
      var el=document.createElement('div');
      el.className='ld-visitas';
      el.innerHTML=(d.v>=2)
        ? '<span class="ld-voltei-chip">↺ Voltei '+d.v+'×</span><span class="ld-voltei-when">última em '+fmes(d.u)+'</span>'
        : '<span class="ld-voltei-chip">✦ Dormi aqui</span><span class="ld-voltei-when">'+fmes(d.u)+'</span>';
      b.appendChild(el);
    });
  }
  function iniciar(){
    if(!document.getElementById('ld-visitas-css')){
      var st=document.createElement('style'); st.id='ld-visitas-css';
      st.textContent='.ld-visitas{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px}'+
        '.ld-voltei-chip{display:inline-block;background:#FAF5EB;color:#B8922A;border:1px solid #E4CE96;border-radius:20px;padding:3px 10px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;white-space:nowrap}'+
        '.ld-voltei-when{font-size:11px;color:#9A9A9A;font-style:italic}';
      document.head.appendChild(st);
    }
    fetch('hoteis-visitas.json').then(function(r){return r.ok?r.json():null;}).then(function(j){
      if(!j) return;
      VIS=j; aplicar();
      var t=null;
      new MutationObserver(function(){clearTimeout(t);t=setTimeout(aplicar,150);})
        .observe(document.body,{childList:true,subtree:true});
    }).catch(function(){});
  }
  // Selo de estadias ("✦ Dormi aqui" / "↺ Voltei N×") DESATIVADO a pedido do Luli (2026-07-27):
  // o guia já pressupõe que ele esteve pessoalmente em todos os lugares, então mostrar o selo
  // em só alguns hotéis dava a impressão errada de que nos outros ele não dormiu.
  // (iniciar() não é mais chamado; código mantido caso se queira reativar só o "Voltei N×" no futuro.)
})();
