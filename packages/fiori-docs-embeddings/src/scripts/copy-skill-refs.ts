#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const skillsRoot = path.join(packageRoot, '..', 'fiori-mcp-server', 'skills');
const destRoot = path.join(packageRoot, 'data_local', 'skills_copy');

const SKILLS_TO_EMBED = ['sap-fiori-opa5-test-development'];

// Clean dest root so stale skill dirs from previous runs don't persist
if (fs.existsSync(destRoot)) {
    fs.rmSync(destRoot, { recursive: true, force: true });
}

for (const skill of fs.readdirSync(skillsRoot).filter((s) => SKILLS_TO_EMBED.includes(s))) {
    const skillDir = path.join(skillsRoot, skill);
    if (!fs.statSync(skillDir).isDirectory()) {
        continue;
    }
    const dest = path.join(destRoot, skill);
    fs.mkdirSync(dest, { recursive: true });

    // Copy SKILL.md if present
    const skillMd = path.join(skillDir, 'SKILL.md');
    if (fs.existsSync(skillMd)) {
        const content = fs.readFileSync(skillMd, 'utf8').replace(/^---$/gm, '--------------------------------');
        fs.writeFileSync(path.join(dest, 'SKILL.md'), content);
    }

    // Copy references/*.md if the directory exists
    const refsDir = path.join(skillDir, 'references');
    if (fs.existsSync(refsDir)) {
        for (const file of fs.readdirSync(refsDir).filter((f) => f.endsWith('.md'))) {
            const content = fs
                .readFileSync(path.join(refsDir, file), 'utf8')
                .replace(/^---$/gm, '--------------------------------');
            fs.writeFileSync(path.join(dest, file), content);
        }
    }
}
