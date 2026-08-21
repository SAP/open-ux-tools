#!/usr/bin/env node
/**
 * Fetches 2026 Dark, 2026 Light, Monokai and HC Black from microsoft/vscode,
 * resolving the full include chain for each theme so inherited tokens are included.
 * Diffs them against the color values stored in design-tokens/vscode_themes.json,
 * updates that file in place, and writes a Markdown diff report.
 *
 * Exit codes:
 *   0 — no changes
 *   1 — changes found (file updated, report written to $DIFF_OUTPUT or stdout)
 *   2 — error
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TOKENS_PATH = resolve(ROOT, 'design-tokens', 'vscode_themes.json');

const DEFAULTS_BASE = 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-defaults/themes/';
const MONOKAI_BASE = 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-monokai/themes/';

// VSCode theme files → Figma mode IDs
// Include chains are resolved bottom-up at fetch time.
const THEMES = [
    {
        file: '2026-light.json',
        modeId: '1:0',
        label: 'Light 2026',
        base: DEFAULTS_BASE,
        // light_vs → light_plus → light_modern → 2026-light
        includes: ['light_vs.json', 'light_plus.json', 'light_modern.json']
    },
    {
        file: '2026-dark.json',
        modeId: '1:1',
        label: 'Dark 2026',
        base: DEFAULTS_BASE,
        // dark_vs → dark_plus → dark_modern → 2026-dark
        includes: ['dark_vs.json', 'dark_plus.json', 'dark_modern.json']
    },
    {
        file: 'monokai-color-theme.json',
        modeId: '1:2',
        label: 'Monokai',
        base: MONOKAI_BASE,
        includes: []
    },
    {
        file: 'hc_black.json',
        modeId: '1:3',
        label: 'HC Black',
        base: DEFAULTS_BASE,
        includes: []
    }
];

// ─── helpers ────────────────────────────────────────────────────────────────

async function fetchAndParseColors(filename, base) {
    const res = await fetch(`${base}${filename}`);
    if (!res.ok) throw new Error(`Failed to fetch ${filename}: ${res.status}`);
    // VSCode theme files are JSONC — strip comments and trailing commas before parsing.
    const text = await res.text();
    const raw = text
        .replace(/^﻿/, '') // strip BOM
        .replace(/"(?:[^"\\]|\\.)*"|\/\/[^\n]*/g, (m) => (m.startsWith('"') ? m : '')) // strip // comments outside strings
        .replace(/\/\*[\s\S]*?\*\//g, '') // strip /* */ comments
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control characters
        .replace(/,(\s*[}\]])/g, '$1'); // strip trailing commas
    const parsed = JSON.parse(raw);
    return parsed.colors ?? {};
}

/**
 * Fetch the fully merged color set for a theme by resolving its include chain.
 * Layers are applied bottom-up: includes[0] is the base, the main file is the top.
 * Include files always live in DEFAULTS_BASE regardless of the theme's own base URL.
 * @param file
 * @param base
 * @param includes
 */
async function fetchThemeColors(file, base, includes) {
    let merged = {};
    for (const parentFile of includes) {
        const parentColors = await fetchAndParseColors(parentFile, DEFAULTS_BASE);
        merged = { ...merged, ...parentColors };
    }
    const topColors = await fetchAndParseColors(file, base);
    return { ...merged, ...topColors };
}

/**
 * Parse a hex color string (#RRGGBB or #RRGGBBAA) into Figma RGBA floats.
 * @param hex
 */
function hexToFigmaRgba(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
}

/**
 * Convert Figma RGBA floats back to a normalized lowercase hex string.
 * @param root0
 * @param root0.r
 * @param root0.g
 * @param root0.b
 * @param root0.a
 */
function figmaRgbaToHex({ r, g, b, a }) {
    const toHex = (v) =>
        Math.round(v * 255)
            .toString(16)
            .padStart(2, '0');
    const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    const hex = a < 1 ? `${base}${toHex(a)}` : base;
    return hex.toLowerCase();
}

/**
 * Compare colors via their hex representations to avoid float precision noise.
 *  Normalizes both to lowercase and strips a trailing 'ff' alpha (fully opaque)
 *  so that #f0f1f2 and #f0f1f2ff are treated as equal — both are fully visible,
 *  the difference is just Microsoft being explicit about the implicit default.
 *  A real transparency change (e.g. ff → 80) will still be detected correctly.
 * @param figmaRgba
 * @param newHex
 */
function colorsEqual(figmaRgba, newHex) {
    const normalize = (h) => {
        const lower = h.toLowerCase();
        return lower.length === 9 && lower.endsWith('ff') ? lower.slice(0, 7) : lower;
    };
    return normalize(figmaRgbaToHex(figmaRgba)) === normalize(newHex);
}

/**
 * Extract the component prefix from a VSCode token key for grouping.
 *  e.g. 'editor.selectionBackground' → 'editor'
 *       'foreground' → 'general'
 * @param key
 */
function tokenGroup(key) {
    const dot = key.indexOf('.');
    return dot === -1 ? 'general' : key.slice(0, dot);
}

/**
 * Expand shorthand hex (#RGB → #RRGGBB) and validate. Returns null for unrecognised formats.
 * @param raw
 */
function normalizeHex(raw) {
    if (!raw) return null;
    if (/^#[0-9a-fA-F]{3,4}$/.test(raw)) {
        return '#' + [...raw.slice(1)].map((c) => c + c).join('');
    }
    if (/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(raw)) {
        return raw;
    }
    return null;
}

/**
 * Resolve the Figma variable name for a VSCode token key, or null if not found.
 * @param vscodeKey
 * @param varByName
 */
function resolveFigmaName(vscodeKey, varByName) {
    if (varByName.has(vscodeKey)) return vscodeKey;
    const hyphenated = vscodeKey.replaceAll('.', '-');
    if (varByName.has(hyphenated)) return hyphenated;
    return null;
}

/**
 * Generate a new Figma variable entry for a token not yet in the file.
 * @param vscodeKey
 * @param allUpstream
 * @param nextId
 */
function createFigmaVariable(vscodeKey, allUpstream, nextId) {
    const figmaName = vscodeKey.replaceAll('.', '-');
    const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

    const valuesByMode = {};
    const resolvedValuesByMode = {};
    for (const { modeId } of THEMES) {
        const hex = normalizeHex(allUpstream[modeId]?.[vscodeKey] ?? null);
        const rgba = hex ? hexToFigmaRgba(hex) : TRANSPARENT;
        valuesByMode[modeId] = rgba;
        resolvedValuesByMode[modeId] = { resolvedValue: rgba, alias: null };
    }

    return {
        id: `VariableID:1:${nextId}`,
        name: figmaName,
        description: '',
        type: 'COLOR',
        valuesByMode,
        resolvedValuesByMode,
        scopes: ['ALL_SCOPES'],
        hiddenFromPublishing: false,
        codeSyntax: {}
    };
}

async function main() {
    const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));

    const varByName = new Map();
    for (const v of tokens.variables) {
        varByName.set(v.name, v);
    }

    const upstream = {};
    for (const { file, modeId, label, base, includes } of THEMES) {
        upstream[modeId] = { label, colors: await fetchThemeColors(file, base, includes) };
    }

    const allUpstreamColors = {};
    for (const { modeId } of THEMES) {
        allUpstreamColors[modeId] = upstream[modeId].colors;
    }
    const allUpstreamKeys = new Set(Object.values(allUpstreamColors).flatMap((c) => Object.keys(c)));

    // Compute the next available VariableID index once — incremented per new token.
    let nextId =
        tokens.variables.reduce((max, v) => {
            const match = v.id.match(/VariableID:1:(\d+)/);
            return match ? Math.max(max, parseInt(match[1])) : max;
        }, 0) + 1;

    const added = [];
    for (const vscodeKey of allUpstreamKeys) {
        if (!resolveFigmaName(vscodeKey, varByName)) {
            const newVar = createFigmaVariable(vscodeKey, allUpstreamColors, nextId++);
            tokens.variables.push(newVar);
            tokens.variableIds.push(newVar.id);
            varByName.set(newVar.name, newVar);
            added.push(vscodeKey);
        }
    }

    const changesByTheme = {};

    for (const { modeId, label } of THEMES) {
        const vscodeColors = upstream[modeId].colors;
        const changed = [];

        for (const [vscodeKey, rawHex] of Object.entries(vscodeColors)) {
            if (rawHex === null) continue;

            const newHex = normalizeHex(rawHex);
            if (!newHex) continue;

            const figmaName = resolveFigmaName(vscodeKey, varByName);
            if (!figmaName) continue;

            const variable = varByName.get(figmaName);
            const currentRgba = variable.valuesByMode[modeId];
            if (!currentRgba) continue;

            const newRgba = hexToFigmaRgba(newHex);

            if (!colorsEqual(currentRgba, newHex)) {
                const oldHex = figmaRgbaToHex(currentRgba);
                changed.push({ key: vscodeKey, oldHex, newHex: newHex.toLowerCase() });

                variable.valuesByMode[modeId] = newRgba;
                if (variable.resolvedValuesByMode?.[modeId]) {
                    variable.resolvedValuesByMode[modeId].resolvedValue = newRgba;
                }
            }
        }

        if (changed.length) {
            changesByTheme[modeId] = { label, changed };
        }
    }

    const anyChanges = Object.keys(changesByTheme).length > 0 || added.length > 0;
    if (!anyChanges) {
        process.stdout.write('NO_CHANGES\n');
        process.exit(0);
    }

    // Write updated tokens file
    writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2) + '\n', 'utf8');

    const summaryParts = [];
    for (const { label, changed } of Object.values(changesByTheme)) {
        summaryParts.push(`${label}: ${changed.length} changed`);
    }
    if (added.length) summaryParts.push(`${added.length} added`);
    const summary = summaryParts.join(' | ');

    const timestamp = new Date().toISOString().slice(0, 10);

    const sections = [
        `## 🎨 PaletteBot — ${timestamp}`,
        `**${summary}**`,
        `> Source: [microsoft/vscode theme-defaults](https://github.com/microsoft/vscode/tree/main/extensions/theme-defaults/themes)`
    ];

    for (const { label, changed } of Object.values(changesByTheme)) {
        const groups = new Map();
        for (const entry of changed) {
            const group = tokenGroup(entry.key);
            if (!groups.has(group)) groups.set(group, []);
            groups.get(group).push(entry);
        }

        const groupTables = [...groups.entries()]
            .sort()
            .map(([group, entries]) => {
                const rows = entries
                    .map(({ key, oldHex, newHex }) => `| \`${key}\` | \`${oldHex}\` | \`${newHex}\` |`)
                    .join('\n');
                return `**${group}**\n\n| Token | Before | After |\n|-------|--------|-------|\n${rows}`;
            })
            .join('\n\n');

        sections.push(`### ${label} (${changed.length} changes)\n\n${groupTables}`);
    }

    if (added.length) {
        const rows = added
            .sort()
            .map((key) => `| \`${key}\` |`)
            .join('\n');
        sections.push(`### Added (${added.length} new tokens)\n\n| Token |\n|-------|\n${rows}`);
    }

    const body = sections.join('\n\n') + '\n';
    const report = { title: `VSCode theme update — ${summary}`, body };

    const outputPath = process.env.DIFF_OUTPUT;
    if (outputPath) {
        writeFileSync(outputPath, JSON.stringify(report), 'utf8');
    } else {
        process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    }

    process.exit(1);
}

main().catch((err) => {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(2);
});
