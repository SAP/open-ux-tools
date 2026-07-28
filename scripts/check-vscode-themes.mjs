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
const MONOKAI_BASE  = 'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-monokai/themes/';

// VSCode theme files → Figma mode IDs
// Include chains are resolved bottom-up at fetch time.
const THEMES = [
    {
        file: '2026-light.json',
        modeId: '1:0',
        label: 'Light 2026',
        base: DEFAULTS_BASE,
        // light_vs → light_plus → light_modern → 2026-light
        includes: ['light_vs.json', 'light_plus.json', 'light_modern.json'],
    },
    {
        file: '2026-dark.json',
        modeId: '1:1',
        label: 'Dark 2026',
        base: DEFAULTS_BASE,
        // dark_vs → dark_plus → dark_modern → 2026-dark
        includes: ['dark_vs.json', 'dark_plus.json', 'dark_modern.json'],
    },
    {
        file: 'monokai-color-theme.json',
        modeId: '1:2',
        label: 'Monokai',
        base: MONOKAI_BASE,
        includes: [],
    },
    {
        file: 'hc_black.json',
        modeId: '1:3',
        label: 'HC Black',
        base: DEFAULTS_BASE,
        includes: [],
    },
];

// ─── helpers ────────────────────────────────────────────────────────────────

async function fetchAndParseColors(filename, base) {
    const res = await fetch(`${base}${filename}`);
    if (!res.ok) throw new Error(`Failed to fetch ${filename}: ${res.status}`);
    // VSCode theme JSON can contain // comments, trailing commas, and BOM.
    // Strip comments carefully — avoid matching // inside string values.
    const text = await res.text();
    const raw = text
        .replace(/^﻿/, '')                             // strip BOM
        .replace(/"(?:[^"\\]|\\.)*"|\/\/[^\n]*/g, m => m.startsWith('"') ? m : '') // strip // comments outside strings
        .replace(/\/\*[\s\S]*?\*\//g, '')               // strip /* */ comments
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')  // strip control characters
        .replace(/,(\s*[}\]])/g, '$1');                 // strip trailing commas
    const parsed = JSON.parse(raw);
    return parsed.colors ?? {};
}

/**
 * Fetch the fully merged color set for a theme by resolving its include chain.
 * Layers are applied bottom-up: includes[0] is the base, the main file is the top.
 * Include files always live in DEFAULTS_BASE regardless of the theme's own base URL.
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

/** Parse a hex color string (#RRGGBB or #RRGGBBAA) into Figma RGBA floats. */
function hexToFigmaRgba(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
}

/** Convert Figma RGBA floats back to a normalized lowercase hex string. */
function figmaRgbaToHex({ r, g, b, a }) {
    const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
    const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    const hex = a < 1 ? `${base}${toHex(a)}` : base;
    return hex.toLowerCase();
}

/** Compare colors via their hex representations to avoid float precision noise.
 *  Normalizes both to lowercase and strips a trailing 'ff' alpha (fully opaque)
 *  so that #f0f1f2 and #f0f1f2ff are treated as equal — both are fully visible,
 *  the difference is just Microsoft being explicit about the implicit default.
 *  A real transparency change (e.g. ff → 80) will still be detected correctly.
 */
function colorsEqual(figmaRgba, newHex) {
    const normalize = h => {
        const lower = h.toLowerCase();
        return lower.length === 9 && lower.endsWith('ff') ? lower.slice(0, 7) : lower;
    };
    return normalize(figmaRgbaToHex(figmaRgba)) === normalize(newHex);
}

/** Extract the component prefix from a VSCode token key for grouping.
 *  e.g. 'editor.selectionBackground' → 'editor'
 *       'foreground' → 'general'
 */
function tokenGroup(key) {
    const dot = key.indexOf('.');
    return dot === -1 ? 'general' : key.slice(0, dot);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
    const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));

    // Build a lookup: figmaVariableName → variable object (by reference)
    const varByName = new Map();
    for (const v of tokens.variables) {
        varByName.set(v.name, v);
    }

    // Fetch upstream theme colors
    const upstream = {};
    for (const { file, modeId, label, base, includes } of THEMES) {
        upstream[modeId] = { label, colors: await fetchThemeColors(file, base, includes) };
    }

    // Diff and collect changes per theme
    const changesByTheme = {};

    for (const { modeId, label } of THEMES) {
        const vscodeColors = upstream[modeId].colors;
        const changed = [];

        for (const [vscodeKey, rawHex] of Object.entries(vscodeColors)) {
            // Skip null values — VSCode uses null to unset inherited tokens
            if (rawHex === null) continue;

            // Expand shorthand hex (#RGB → #RRGGBB, #RGBA → #RRGGBBAA) by doubling
            // each digit. Skip anything that isn't a recognised hex format.
            let newHex = rawHex;
            if (/^#[0-9a-fA-F]{3,4}$/.test(newHex)) {
                newHex = '#' + [...newHex.slice(1)].map(c => c + c).join('');
            } else if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(newHex)) {
                continue;
            }

            // Find the matching Figma variable — use replaceAll to handle multi-dot keys
            // e.g. editor.suggest.background → editor-suggest-background
            const figmaName =
                varByName.has(vscodeKey) ? vscodeKey :
                varByName.has(vscodeKey.replaceAll('.', '-')) ? vscodeKey.replaceAll('.', '-') :
                null;

            if (!figmaName) continue; // no Figma variable for this token

            const variable = varByName.get(figmaName);
            const currentRgba = variable.valuesByMode[modeId];
            if (!currentRgba) continue;

            const newRgba = hexToFigmaRgba(newHex);

            if (!colorsEqual(currentRgba, newHex)) {
                const oldHex = figmaRgbaToHex(currentRgba);
                changed.push({ key: vscodeKey, oldHex, newHex });

                // Update in place (both valuesByMode and resolvedValuesByMode)
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

    const anyChanges = Object.keys(changesByTheme).length > 0;
    if (!anyChanges) {
        process.stdout.write('NO_CHANGES\n');
        process.exit(0);
    }

    // Write updated tokens file (preserve formatting)
    writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2) + '\n', 'utf8');

    // Summary line for issue title / header
    const summary = Object.values(changesByTheme)
        .map(({ label, changed }) => `${label}: ${changed.length} changed`)
        .join(' | ');

    const timestamp = new Date().toISOString().slice(0, 10);

    // Build Markdown report
    const lines = [
        `## 🎨 PaletteBot — ${timestamp}`,
        '',
        `**${summary}**`,
        '',
        `> Source: [microsoft/vscode theme-defaults](https://github.com/microsoft/vscode/tree/main/extensions/theme-defaults/themes)`,
        '',
    ];

    for (const { label, changed } of Object.values(changesByTheme)) {
        lines.push(`### ${label} (${changed.length} changes)`);
        lines.push('');

        // Group by component prefix
        const groups = new Map();
        for (const entry of changed) {
            const group = tokenGroup(entry.key);
            if (!groups.has(group)) groups.set(group, []);
            groups.get(group).push(entry);
        }

        for (const [group, entries] of [...groups.entries()].sort()) {
            lines.push(`**${group}**`);
            lines.push('');
            lines.push('| Token | Before | After |');
            lines.push('|-------|--------|-------|');
            for (const { key, oldHex, newHex } of entries) {
                lines.push(`| \`${key}\` | \`${oldHex}\` | \`${newHex.toLowerCase()}\` |`);
            }
            lines.push('');
        }
    }
    const report = { title: `VSCode theme update — ${summary}`, body: lines.join('\n') };

    const outputPath = process.env.DIFF_OUTPUT;
    if (outputPath) {
        writeFileSync(outputPath, JSON.stringify(report), 'utf8');
    } else {
        process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    }

    process.exit(1); // signal: changes found
}

main().catch((err) => {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(2);
});
