// Gera as miniaturas das fotos: fotos/<pasta>/<arquivo> → fotos-mini/<pasta>/<arquivo>.
//
// Para quê: o guia novo (lulidias.com, 2.0) mostra cada casa em lista, grade, mapa e comparar
// num quadrado de ~50–240 px. Baixar a foto inteira (1200 px, 140–310 KB) para isso era
// desperdício; a miniatura tem 480 px no lado maior (2x de 240), JPEG q70 progressivo.
// A ficha e a galeria continuam com a foto inteira.
//
// ARMADILHA (já custou 858 fotos tombadas): o JPEG do celular pode vir "deitado", com a tag
// EXIF Orientation dizendo como girar. Ao limpar o EXIF a tag some e a vertical tomba. Por isso
// .rotate() SEM argumento vem antes de tudo: o sharp gira os pixels pela tag e só depois a
// saída sai sem metadado.
//
// Barato de rodar: fotos-mini/.manifesto.json guarda receita + tamanho + sha1 de cada original.
// Só se refaz o que mudou ou falta; miniatura cujo original sumiu é apagada. Não dá para
// comparar mtime: no GitHub Actions o checkout põe a mesma data em todos os arquivos.
//
// Uso:  npm i --no-save sharp@0.34 && node scripts/gerar-miniaturas.js
//       node scripts/gerar-miniaturas.js --so-ver        (só conta o que faria)
// Roda sozinho no .github/workflows/miniaturas.yml a cada push que mexa em fotos/.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const ORIGEM = process.env.MINI_ORIGEM || path.join(RAIZ, 'fotos');
const DESTINO = process.env.MINI_DESTINO || path.join(RAIZ, 'fotos-mini');
const MANIFESTO = path.join(DESTINO, '.manifesto.json');
const LADO = 480;
const QUALIDADE = 70;
const RECEITA = `${LADO}q${QUALIDADE}`;    // mudou a receita? muda aqui e tudo se refaz
const SO_VER = process.argv.includes('--so-ver');
const IMAGEM = /\.jpe?g$/i;                // as fotos do acervo são todas JPEG (fora 4 SVG)

function listar() {
  const out = [];
  for (const pasta of fs.readdirSync(ORIGEM).sort()) {
    const dir = path.join(ORIGEM, pasta);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).sort()) {
      // o que o .gitignore barra (captura de tela, IMG_ da câmara) não vira miniatura
      if (!IMAGEM.test(f) || f.startsWith('.') || /^(Captura de Tela|IMG_)/i.test(f)) continue;
      out.push(pasta + '/' + f);
    }
  }
  return out;
}

async function main() {
  const sharp = SO_VER ? null : require('sharp');
  if (sharp) sharp.cache(false);
  let antigo = {};
  try { antigo = JSON.parse(fs.readFileSync(MANIFESTO, 'utf8')); } catch {}
  const novo = {};
  const lista = listar();
  let feitas = 0, iguais = 0, falhas = 0, apagadas = 0, bytes = 0;

  for (const rel of lista) {
    const src = path.join(ORIGEM, rel);
    const dst = path.join(DESTINO, rel);
    const buf = fs.readFileSync(src);
    const assinatura = `${RECEITA}:${buf.length}:${crypto.createHash('sha1').update(buf).digest('hex')}`;
    if (antigo[rel] === assinatura && fs.existsSync(dst)) {
      novo[rel] = assinatura; iguais++; bytes += fs.statSync(dst).size; continue;
    }
    if (SO_VER) { feitas++; continue; }
    try {
      const saida = await sharp(buf, { failOn: 'none' })
        .rotate()                                   // 1º: gira pela tag EXIF Orientation
        .resize(LADO, LADO, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: QUALIDADE, progressive: true, mozjpeg: true })
        .toBuffer();                                // sem .withMetadata(): sai sem EXIF
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, saida);
      novo[rel] = assinatura; feitas++; bytes += saida.length;
    } catch (e) {
      falhas++;
      console.warn(`falhou: ${rel} — ${e.message}`);
    }
  }

  // miniatura sem original (a foto foi apagada ou renomeada) sai também
  if (fs.existsSync(DESTINO)) {
    const vivas = new Set(lista);
    for (const pasta of fs.readdirSync(DESTINO)) {
      const dir = path.join(DESTINO, pasta);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir)) {
        if (vivas.has(pasta + '/' + f)) continue;
        if (!SO_VER) fs.unlinkSync(path.join(dir, f));
        apagadas++;
      }
      if (!SO_VER && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
    }
  }

  if (!SO_VER) {
    fs.mkdirSync(DESTINO, { recursive: true });
    // uma linha por foto, em ordem: o diff do commit automático mostra só o que mudou
    const linhas = Object.keys(novo).sort().map((k) => `${JSON.stringify(k)}:${JSON.stringify(novo[k])}`);
    fs.writeFileSync(MANIFESTO, '{\n' + linhas.join(',\n') + '\n}\n');
  }
  console.log(`${lista.length} fotos · ${feitas} ${SO_VER ? 'a gerar' : 'geradas'} · ${iguais} já em dia · ` +
    `${apagadas} órfãs ${SO_VER ? 'a apagar' : 'apagadas'} · ${falhas} falhas` +
    (SO_VER ? '' : ` · fotos-mini = ${(bytes / 1e6).toFixed(1)} MB`));
  if (falhas) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
