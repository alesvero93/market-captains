import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const clientRequire = createRequire(path.join(root, 'apps/client/package.json'));
const vite = path.join(path.dirname(clientRequire.resolve('vite/package.json')), 'bin/vite.js');
const children = [
  spawn(process.execPath, ['--env-file-if-exists=apps/server/.env.local','apps/server/dist/index.js'], {cwd: root, stdio: 'inherit'}),
  spawn(process.execPath, [vite], {cwd: path.join(root, 'apps/client'), stdio: 'inherit'}),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code ?? 0));
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
