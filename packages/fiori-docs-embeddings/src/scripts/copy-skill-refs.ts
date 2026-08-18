#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const skillsRoot = path.join(packageRoot, '..', 'fiori-mcp-server', 'skills');
const destRoot = path.join(packageRoot, 'data_local', 'skills');

for (const skill of fs.readdirSync(skillsRoot)) {
    const refsDir = path.join(skillsRoot, skill, 'references');
    if (!fs.existsSync(refsDir)) {
        continue;
    }
    const dest = path.join(destRoot, skill);
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(refsDir).filter((f) => f.endsWith('.md'))) {
        const content = fs
            .readFileSync(path.join(refsDir, file), 'utf8')
            .replace(/^---$/gm, '--------------------------------');
        fs.writeFileSync(path.join(dest, file), content);
    }
}
