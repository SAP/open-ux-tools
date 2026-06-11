import fs from 'node:fs';
import { createRequire } from 'node:module';

const req = createRequire(import.meta.url);
const pkg = req('../package.json');
const date = new Date().toISOString().split('T')[0];
const base = pkg.name.startsWith('@')
    ? pkg.name.replace('@', '').replace('/', '-')
    : pkg.name;
const oldName = `${base}-${pkg.version}.tgz`;
const newName = `${base}-${pkg.version}-${date}.tgz`;
fs.renameSync(oldName, newName);
console.log(`Renamed ${oldName} → ${newName}`);
