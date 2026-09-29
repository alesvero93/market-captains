import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
function files(dir) { return readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? files(join(dir,e.name)) : [join(dir,e.name)]); }
for (const file of files('packages/sim/src')) {
  const content = readFileSync(file, 'utf8');
  if (/phaser|colyseus|Date\.|performance\.|Math\.random|fetch\(|['"]node:/.test(content)) throw new Error(`Impure simulation: ${file}`);
}
for (const file of files('apps/client/src')) {
  if (/CMC_PRO_API_KEY|pro-api\.coinmarketcap/.test(readFileSync(file,'utf8'))) throw new Error(`Client boundary violation: ${file}`);
}
console.log('Boundaries OK: pure simulation, server-authoritative multiplayer, no CMC client integration.');
