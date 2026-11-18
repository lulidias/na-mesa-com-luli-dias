/* QR fixo de votação — canto superior direito, em TODAS as telas do telão (pedido do Luli, 18/11/2026).
   Só desenha na janela de cima: dentro do telão giratório (iframes) quem mostra é o giro, uma vez só.
   window.qrFixo(false) esconde (giro usa na cena do QR grande e na revelação). */
(function () {
  var eu = document.currentScript;
  var semQr = !!(eu && eu.hasAttribute('data-sem-qr'));   // telas de garrafa, QR grande, revelação
  // DENTRO do telão giratório: cada cena se recarrega a cada volta, o giro não. Então é a cena que
  // garante que o giro tem o QR (injeta o script lá, se faltar) e diz se ele aparece quando ELA está no ar.
  // Assim as TVs pegam mudança sem ninguém recarregar nada.
  if (window.top !== window) {
    try {
      var topo = window.top, d = topo.document;
      if (!d.querySelector('script[src*="qr-fixo.js"]')) {
        var sc = d.createElement('script'); sc.src = '/confras/qr-fixo.js?v=3'; d.body.appendChild(sc);
      }
      setInterval(function () {
        var f = window.frameElement;
        if (f && f.classList.contains('on') && topo.qrFixo) topo.qrFixo(!semQr);
      }, 400);
    } catch (e) {}
    return;
  }
  if (semQr) return;
  var URL_VOTO = 'https://v1.lulidias.com/confras/votar/';
  var css = '#qr-fixo{position:fixed;top:24px;right:24px;z-index:2147483000;background:#fff;padding:14px 14px 10px;' +
    'text-align:center;border:3px solid #D4AE5C;box-shadow:0 6px 30px rgba(0,0,0,.35);transition:opacity .6s}' +
    '#qr-fixo.oculto{opacity:0;pointer-events:none}' +
    '#qr-fixo canvas{display:block;width:clamp(150px,14vw,240px);height:auto;image-rendering:pixelated}' +
    '#qr-fixo div{font-family:Montserrat,Arial,sans-serif;font-weight:600;color:#101F38;font-size:clamp(10px,.9vw,15px);letter-spacing:2px;margin-top:8px;line-height:1.35}';
  function montar() {
    if (document.getElementById('qr-fixo')) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var box = document.createElement('div'); box.id = 'qr-fixo';
    box.innerHTML = '<canvas width="480" height="480"></canvas><div>APONTE A CÂMERA<br>E VOTE</div>';
    document.body.appendChild(box);
    function desenha() {
      if (!window.QRious) return setTimeout(desenha, 300);
      new QRious({ element: box.querySelector('canvas'), value: URL_VOTO, size: 480, background: '#FFFFFF', foreground: '#101F38', level: 'M' });
    }
    if (!window.QRious) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js';
      document.head.appendChild(s);
    }
    desenha();
  }
  window.qrFixo = function (mostrar) {
    var b = document.getElementById('qr-fixo');
    if (b) b.classList.toggle('oculto', mostrar === false);
  };
  if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
})();
