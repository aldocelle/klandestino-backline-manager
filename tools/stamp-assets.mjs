// Versiona cada assets/*.js|css en los HTML de public/ con la huella sha256 de su contenido,
// para que ningún navegador quede con un archivo viejo en caché.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
for (const file of ['public/index.html', 'public/kit-tama.html']) {
  if (!existsSync(file)) continue;
  writeFileSync(file, readFileSync(file, 'utf8').replace(/(assets\/[\w.-]+\.(?:js|css))(?:\?v=[^"']*)?(["'])/g, (m, asset, q) => {
    const path = 'public/' + asset;
    if (!existsSync(path)) return m;
    return `${asset}?v=${createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 10)}${q}`;
  }));
}
