#!/usr/bin/env node
/**
 * Fetches 2026 Dark, 2026 Light, and HC Black from microsoft/vscode,
 * diffs them against the color values stored in design-tokens/vscode_themes.json,
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

// VSCode theme files → Figma mode IDs
const THEMES = [
    { file: '2026-light.json', modeId: '1:0', label: 'Light 2026' },
    { file: '2026-dark.json',  modeId: '1:1', label: 'Dark 2026'  },
    { file: 'hc_black.json',   modeId: '1:3', label: 'HC Black'   },
];

const VSCODE_RAW_BASE =
    'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-defaults/themes/';

// ─── helpers ────────────────────────────────────────────────────────────────

async function fetchThemeColors(filename) {
    const res = await fetch(`${VSCODE_RAW_BASE}${filename}`);
    if (!res.ok) throw new Error(`Failed to fetch ${filename}: ${res.status}`);
    // VSCode theme JSON uses trailing commas — strip before parsing
    const raw = (await res.text()).replace(/,(\s*[}\]])/g, '$1');
    const parsed = JSON.parse(raw);
    return parsed.colors ?? {};
}

/** Convert a Figma variable name to a VSCode color token key.
 *  Rules:
 *   - replace the first '-' with '.'  (e.g. editor-background → editor.background)
 *   - camelCase-only names have no dash so they stay as-is (e.g. foreground)
 */
function figmaNameToVscodeKey(name) {
    return name.replace('-', '.');
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
 *  Normalizes both to lowercase only.
 */
function colorsEqual(figmaRgba, newHex) {
    return figmaRgbaToHex(figmaRgba) === newHex.toLowerCase();
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
    for (const { file, modeId, label } of THEMES) {
        upstream[modeId] = { label, colors: await fetchThemeColors(file) };
    }

    // Diff and collect changes per theme
    const changesByTheme = {}; // modeId → { changed, added }

    for (const { modeId, label } of THEMES) {
        const vscodeColors = upstream[modeId].colors;
        const changed = [];
        const added = [];

        for (const [vscodeKey, newHex] of Object.entries(vscodeColors)) {
            // Find the matching Figma variable (try both key forms)
            const figmaName =
                varByName.has(vscodeKey) ? vscodeKey :
                varByName.has(vscodeKey.replace('.', '-')) ? vscodeKey.replace('.', '-') :
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

        if (changed.length || added.length) {
            changesByTheme[modeId] = { label, changed, added };
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
