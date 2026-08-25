#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'skills.sh.json');

const GROUPS = [
    {
        title: 'SAP Fiori Application Development',
        description: 'Skills for creating, modifying, and testing SAP Fiori elements applications',
        dir: path.join(ROOT, 'packages', 'fiori-mcp-server', 'skills')
    },
    {
        title: 'open-ux-tools Development',
        description: 'Skills for working on the open-ux-tools monorepo itself',
        dir: path.join(ROOT, '.agents', 'skills')
    }
];

/**
 * Reads the `name` field from a SKILL.md YAML frontmatter block.
 * Returns null if no valid frontmatter is found.
 */
function readSkillName(skillMdPath) {
    const content = fs.readFileSync(skillMdPath, 'utf8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return null;
    const parsed = yaml.parse(match[1]);
    return typeof parsed?.name === 'string' ? parsed.name.trim() : null;
}

/**
 * Scans a directory for subdirectories containing SKILL.md and returns
 * the skill names sorted alphabetically.
 */
function collectSkills(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(dir, entry.name, 'SKILL.md'))
        .filter((skillMd) => fs.existsSync(skillMd))
        .map(readSkillName)
        .filter(Boolean)
        .sort();
}

const config = {
    $schema: 'https://www.skills.sh/schemas/skills.sh.schema.json',
    notGrouped: 'bottom',
    groupings: GROUPS.map(({ title, description, dir }) => ({
        title,
        description,
        skills: collectSkills(dir)
    }))
};

const output = JSON.stringify(config, null, 2) + '\n';

const checkMode = process.argv.includes('--check');

if (checkMode) {
    const existing = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, 'utf8') : '';
    if (existing !== output) {
        console.error('skills.sh.json is out of date. Run `pnpm generate:skills-config` and commit the result.');
        process.exit(1);
    }
    console.log('skills.sh.json is up to date.');
} else {
    fs.writeFileSync(OUTPUT_FILE, output);
    console.log(`Written: ${path.relative(ROOT, OUTPUT_FILE)}`);
}
