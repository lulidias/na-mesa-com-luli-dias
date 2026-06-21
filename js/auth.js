(function () {
  'use strict';

  var SB_URL = 'https://saotncritqxuchsvvnzi.supabase.co';
  var SB_KEY = 'sb_publishable_EwpsjtLlSrPhSJfrJG6Qvw_qUtE0aL5';
  var _sb = null;

  function getSB() {
    if (_sb) return _sb;
    if (!window.supabase) return null;
    _sb = window.supabase.createClient(SB_URL, SB_KEY);
    return _sb;
  }

  // ── Login modal ────────────────────────────────────────────────────────────
  function showLoginModal() {
    var m = document.getElementById('ld-auth-modal');
    if (m) { m.classList.add('open'); return; }
    m = document.createElement('div');
    m.id = 'ld-auth-modal';
    m.style.cssText = 'display:none;position:fixed;inset:0;z-index:3000;align-items:center;justify-content:center;background:rgba(26,26,26,.88);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);padding:24px';
    m.innerHTML =
      '<div style="background:#fff;border-radius:6px;width:100%;max-width:360px;padding:48px 40px;box-shadow:0 32px 80px rgba(0,0,0,.45);text-align:center;animation:regin .35s cubic-bezier(.22,.68,0,1.2)">' +
        '<div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:#B8922A;font-weight:600;margin-bottom:16px">Luli Dias Restaurants &amp; Hotels</div>' +
        '<h2 style="font-family:\'Playfair Display\',serif;font-size:22px;font-weight:400;color:#1A1A1A;margin-bottom:10px">Entrar no Guia</h2>' +
        '<p style="font-size:11px;line-height:1.75;color:#5A5A5A;margin-bottom:32px">Guarda os teus favoritos e acede<br>de qualquer dispositivo.</p>' +
        '<button id="ld-google-btn" onclick="__ldSignIn()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:12px;padding:14px;border:1px solid #E8E0D5;border-radius:4px;background:#fff;font-family:Montserrat,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;color:#1A1A1A;transition:border-color .2s">' +
          '<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
          'Entrar com Google' +
        '</button>' +
        '<p style="font-size:9px;color:#bbb;margin-top:20px;text-align:center;letter-spacing:1px">Apple Sign In — Em breve</p>' +
        '<button onclick="document.getElementById(\'ld-auth-modal\').classList.remove(\'open\');document.getElementById(\'ld-auth-modal\').style.display=\'none\'" style="display:block;margin:20px auto 0;background:none;border:none;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#9A9A9A;cursor:pointer;font-family:Montserrat,sans-serif">Fechar</button>' +
      '</div>';
    m.addEventListener('click', function (e) {
      if (e.target === m) { m.classList.remove('open'); m.style.display = 'none'; }
    });
    document.body.appendChild(m);
    m.style.display = 'flex';
  }

  // ── User dropdown ──────────────────────────────────────────────────────────
  function toggleAuthDropdown(e) {
    e.stopPropagation();
    var existing = document.getElementById('ld-auth-dd');
    if (existing) { existing.remove(); return; }
    var btn = document.getElementById('util-auth-btn');
    if (!btn) return;
    var rect = btn.getBoundingClientRect();
    var dd = document.createElement('div');
    dd.id = 'ld-auth-dd';
    dd.style.cssText = 'position:fixed;top:' + (rect.bottom + 4) + 'px;right:12px;background:#fff;border:1px solid #E8E0D5;border-radius:4px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:2000;min-width:160px;overflow:hidden;font-family:Montserrat,sans-serif';
    dd.innerHTML =
      '<div id="ld-dd-name" style="padding:12px 16px;border-bottom:1px solid #E8E0D5;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#5A5A5A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">—</div>' +
      '<a href="minha-lista.html" style="display:block;padding:11px 16px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#5A5A5A;text-decoration:none" onmouseover="this.style.color=\'#B8922A\'" onmouseout="this.style.color=\'#5A5A5A\'">Minha Lista</a>' +
      '<button onclick="__ldSignOut()" style="display:block;width:100%;text-align:left;padding:11px 16px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#5A5A5A;background:none;border:none;border-top:1px solid #E8E0D5;cursor:pointer;font-family:inherit" onmouseover="this.style.color=\'#B8922A\'" onmouseout="this.style.color=\'#5A5A5A\'">Sair</button>';
    document.body.appendChild(dd);

    var sb = getSB();
    if (sb) {
      sb.auth.getSession().then(function (res) {
        var session = res.data.session;
        var el = document.getElementById('ld-dd-name');
        if (session && el) {
          el.textContent = (session.user.user_metadata && session.user.user_metadata.full_name) || session.user.email;
        }
      });
    }

    setTimeout(function () {
      function closeDD() { var d = document.getElementById('ld-auth-dd'); if (d) d.remove(); document.removeEventListener('click', closeDD); }
      document.addEventListener('click', closeDD);
    }, 0);
  }

  // ── Update util-bar auth button ───────────────────────────────────────────
  function updateAuthBtn(session) {
    var btn = document.getElementById('util-auth-btn');
    if (!btn) return;
    if (session && session.user) {
      var user = session.user;
      var av = user.user_metadata && user.user_metadata.avatar_url;
      var name = (user.user_metadata && user.user_metadata.full_name)
        ? user.user_metadata.full_name.split(' ')[0]
        : user.email.split('@')[0];
      btn.innerHTML = (av ? '<img src="' + av + '" style="width:22px;height:22px;border-radius:50%;border:1.5px solid #B8922A;vertical-align:middle;margin-right:2px"> ' : '') + name;
      btn.onclick = toggleAuthDropdown;
      btn.style.color = '#B8922A';
      var modal = document.getElementById('ld-auth-modal');
      if (modal) { modal.classList.remove('open'); modal.style.display = 'none'; }
    } else {
      btn.innerHTML =
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Entrar';
      btn.onclick = showLoginModal;
      btn.style.color = '';
    }
  }

  // ── Global handlers ───────────────────────────────────────────────────────
  window.__ldSignIn = function () {
    var sb = getSB();
    if (!sb) return;
    var gbtn = document.getElementById('ld-google-btn');
    if (gbtn) { gbtn.textContent = 'A redirecionar…'; gbtn.disabled = true; }
    sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://lulidias.com/auth-callback.html' }
    });
  };

  window.__ldSignOut = function () {
    var sb = getSB();
    if (!sb) return;
    sb.auth.signOut();
    var dd = document.getElementById('ld-auth-dd');
    if (dd) dd.remove();
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    var sb = getSB();
    if (!sb) { setTimeout(init, 100); return; }

    // Set default onclick immediately so the button works before session check
    var btn = document.getElementById('util-auth-btn');
    if (btn && !btn.onclick) btn.onclick = showLoginModal;

    sb.auth.getSession().then(function (res) {
      updateAuthBtn(res.data.session);
    });

    sb.auth.onAuthStateChange(function (_event, session) {
      updateAuthBtn(session);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
