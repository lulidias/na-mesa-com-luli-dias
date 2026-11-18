/* Controle remoto das TVs (18/11/2026): toda tela do telão consulta /confras/tv.json a cada 4 s.
   Quando "v" muda, a TV vai sozinha para "tela". Para trocar a TV: editar tv.json (tela + v+1) e dar push. */
(function () {
  if (window.top !== window) return;
  var visto = null;
  function olha() {
    fetch('/confras/tv.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (visto === null) { visto = j.v; return; }
      if (j.v !== visto && j.tela) location.replace('/confras/' + j.tela);
    }).catch(function () {});
  }
  olha(); setInterval(olha, 4000);
})();
