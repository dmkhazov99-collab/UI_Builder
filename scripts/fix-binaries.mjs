import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = [
  'node_modules/@esbuild/linux-x64/bin/esbuild',
  'node_modules/esbuild/bin/esbuild',
  'node_modules/vite/bin/vite.js',
  'node_modules/typescript/bin/tsc',
  'node_modules/typescript/bin/tsserver',
];

for (const rel of targets) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  try {
    const stat = fs.statSync(full);
    fs.chmodSync(full, stat.mode | 0o111);
    console.log(`[ok] chmod +x ${rel}`);
  } catch (error) {
    console.warn(`[warn] failed to chmod ${rel}: ${error.message}`);
  }
}
