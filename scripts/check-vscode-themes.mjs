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

/** Convert Figma RGBA floats back to a hex string for display. */
function figmaRgbaToHex({ r, g, b, a }) {
    const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
    const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    return a < 1 ? `${base}${toHex(a)}` : base;
}

/** Round to 10 decimal places to avoid float noise */
function round(n) {
    return Math.round(n * 1e10) / 1e10;
}

function colorsEqual(a, b) {
    return (
        round(a.r) === round(b.r) &&
        round(a.g) === round(b.g) &&
        round(a.b) === round(b.b) &&
        round(a.a) === round(b.a)
    );
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

            if (!colorsEqual(currentRgba, newRgba)) {
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

    // Build Markdown report
    const lines = ['## VSCode Theme Changes Detected', ''];
    lines.push(`**Source:** [microsoft/vscode theme-defaults](https://github.com/microsoft/vscode/tree/main/extensions/theme-defaults/themes)`, '');

    for (const { label, changed } of Object.values(changesByTheme)) {
        lines.push(`### ${label}`);
        if (changed.length) {
            lines.push('');
            lines.push('| Token | Before | After |');
            lines.push('|-------|--------|-------|');
            for (const { key, oldHex, newHex } of changed) {
                lines.push(`| \`${key}\` | \`${oldHex}\` | \`${newHex}\` |`);
            }
        }
        lines.push('');
    }

    // Summary line for issue title
    const summary = Object.values(changesByTheme)
        .map(({ label, changed }) => `${label}: ${changed.length} changed`)
        .join(' | ');

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
