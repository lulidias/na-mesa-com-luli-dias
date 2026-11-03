// Conta as fotos de cada casa em fotos/<pasta>/ e grava fotos-contagem.json ("pasta/slug" → n).
// Quem lê: admin/revisao.html (aviso de casa com uma foto só ou nenhuma). Roda no build-counts.yml.
// <slug>.jpeg é a 1ª; <slug>-2.jpeg, <slug>-3.jpeg… as seguintes (qualquer extensão de imagem).
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..', 'fotos');
const out = {};
for (const pasta of fs.readdirSync(raiz).sort()) {
  const dir = path.join(raiz, pasta);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^(.+?)(?:-(\d+))?\.(jpe?g|png|webp|heic)$/i);
    if (!m) continue;
    // "-2" pode ser parte do nome ("74-osteria"); só conta como número se o slug sem ele existir
    let slug = m[1], n = m[2];
    if (n && !fs.readdirSync(dir).some((g) => g.toLowerCase().startsWith(slug.toLowerCase() + '.'))) { slug = m[1] + '-' + n; }
    const k = pasta + '/' + slug.toLowerCase();
    out[k] = (out[k] || 0) + 1;
  }
}
fs.writeFileSync(path.join(__dirname, '..', 'fotos-contagem.json'), JSON.stringify(out) + '\n');
console.log(Object.keys(out).length + ' casas com foto');
