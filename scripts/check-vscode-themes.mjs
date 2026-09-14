#!/usr/bin/env node
/**
 * Fetches 2026 Dark, 2026 Light, Monokai and HC Black from microsoft/vscode,
 * resolving the full include chain for each theme so inherited tokens are included.
 * Also fetches VSCode TypeScript source files to capture default color values for
 * tokens not overridden by any theme.
 *
 * Uses vscode-known-variables.json as the authoritative list of valid token names:
 * any token in vscode_themes.json not present in that list is pruned.
 *
 * Diffs color values against design-tokens/vscode_themes.json,
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
const RAW_BASE = 'https://raw.githubusercontent.com/microsoft/vscode/main/';

// The authoritative list of all registered VSCode color token CSS custom properties.
const KNOWN_VARS_URL =
    'https://raw.githubusercontent.com/microsoft/vscode/main/build/lib/stylelint/vscode-known-variables.json';

// VSCode theme files → Figma mode IDs
// Include chains are resolved bottom-up at fetch time.
const THEMES = [
    {
        file: '2026-light.json',
        modeId: '1:0',
        label: 'Light 2026',
        base: DEFAULTS_BASE,
        tsKey: 'light',
        // light_vs → light_plus → light_modern → 2026-light
        includes: ['light_vs.json', 'light_plus.json', 'light_modern.json']
    },
    {
        file: '2026-dark.json',
        modeId: '1:1',
        label: 'Dark 2026',
        base: DEFAULTS_BASE,
        tsKey: 'dark',
        // dark_vs → dark_plus → dark_modern → 2026-dark
        includes: ['dark_vs.json', 'dark_plus.json', 'dark_modern.json']
    },
    {
        file: 'monokai-color-theme.json',
        modeId: '1:2',
        label: 'Monokai',
        base: MONOKAI_BASE,
        tsKey: 'dark',
        includes: []
    },
    {
        file: 'hc_black.json',
        modeId: '1:3',
        label: 'HC Black',
        base: DEFAULTS_BASE,
        tsKey: 'hcDark',
        includes: []
    }
];

// ─── helpers ────────────────────────────────────────────────────────────────

async function fetchText(url) {
    const res = await fetch(url);
    if (!res.ok) {
        // A dropped source file silently removes every token defined in it, which later
        // surfaces as a token resolving to transparent for no obvious reason. Warn so the
        // "Check the run logs for fetch errors" step in the maintenance guide is actionable.
        process.stderr.write(`⚠️  Failed to fetch ${url}: HTTP ${res.status}\n`);
        return null;
    }
    return res.text();
}

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
 */
async function fetchThemeColors(file, base, includes) {
    const [includeResults, topColors] = await Promise.all([
        Promise.all(includes.map((f) => fetchAndParseColors(f, DEFAULTS_BASE))),
        fetchAndParseColors(file, base),
    ]);
    return Object.assign({}, ...includeResults, topColors);
}

/**
 * Parse hex color string (#RRGGBB or #RRGGBBAA) into Figma RGBA floats.
 */
function hexToFigmaRgba(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
}

const toHex = (v) =>
    Math.round(v * 255)
        .toString(16)
        .padStart(2, '0');

/**
 * Convert Figma RGBA floats back to a normalized lowercase hex string.
 */
function figmaRgbaToHex({ r, g, b, a }) {
    const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    return (a < 1 ? `${base}${toHex(a)}` : base).toLowerCase();
}

/**
 * Compare colors via their hex representations to avoid float precision noise.
 * Strips a trailing 'ff' alpha so that #f0f1f2 and #f0f1f2ff compare equal —
 * some upstream theme JSON files include an explicit full-opacity alpha suffix
 * that Figma omits, and figmaRgbaToHex never emits one for fully-opaque colors.
 */
function colorsEqual(figmaRgba, newHex) {
    const normalized = (h) => (h.length === 9 && h.endsWith('ff') ? h.slice(0, 7) : h);
    return normalized(figmaRgbaToHex(figmaRgba)) === normalized(newHex);
}

/**
 * Extract the component prefix from a VSCode token key for grouping.
 * e.g. 'editor.selectionBackground' → 'editor'
 *      'foreground' → 'general'
 */
function tokenGroup(key) {
    const dot = key.indexOf('.');
    return dot === -1 ? 'general' : key.slice(0, dot);
}

/**
 * Expand shorthand hex (#RGB → #RRGGBB) and validate. Returns null for unrecognised formats.
 */
function normalizeHex(raw) {
    if (!raw) return null;
    if (/^#[0-9a-fA-F]{3,4}$/.test(raw)) {
        return '#' + [...raw.slice(1)].map((c) => c + c).join('').toLowerCase();
    }
    if (/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(raw)) {
        return raw.toLowerCase();
    }
    return null;
}

/**
 * VSCode token names appear in two forms: dot-form (`editor.background`, used by theme
 * JSON and registerColor keys) and hyphen-form (`editor-background`, used as Figma
 * variable names). These convert between them.
 */
const toDotForm = (name) => name.replaceAll('-', '.');
const toHyphenForm = (name) => name.replaceAll('.', '-');

/**
 * Look up a token's color in a single upstream colors map, trying both name forms.
 * Returns the raw value (may be a hex string or null) or undefined if absent.
 */
function themeValueOf(colors, name) {
    return colors[toDotForm(name)] ?? colors[toHyphenForm(name)];
}

/**
 * Resolve the Figma variable name for a VSCode token key, or null if not found.
 */
function resolveFigmaName(vscodeKey, varByName) {
    if (varByName.has(vscodeKey)) return vscodeKey;
    const hyphenated = toHyphenForm(vscodeKey);
    if (varByName.has(hyphenated)) return hyphenated;
    return null;
}

/**
 * Generate a new Figma variable entry for a token not yet in the file.
 * vscodeKey may be either dot-form (editor.background) or hyphen-form (editor-background).
 */
function createFigmaVariable(vscodeKey, allUpstream, tsDefaults, nextId) {
    const figmaName = toHyphenForm(vscodeKey);
    // Theme JSON files always use dot-form keys; TS defaults also use dot-form.
    const dotKey = toDotForm(vscodeKey);
    const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

    const valuesByMode = {};
    const resolvedValuesByMode = {};
    for (const { modeId, tsKey } of THEMES) {
        // Prefer theme JSON override (try both hyphen and dot form), fall back to TS default
        const rawTheme = allUpstream[modeId]?.[dotKey] ?? allUpstream[modeId]?.[vscodeKey] ?? null;
        const themeHex = normalizeHex(rawTheme);
        const tsDefault = themeHex ? null : (tsDefaults[dotKey]?.[tsKey] ?? tsDefaults[vscodeKey]?.[tsKey] ?? null);
        const hex = themeHex ?? (tsDefault ? normalizeHex(tsDefault) : null);
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

// ─── TypeScript source parsing ───────────────────────────────────────────────

const ANSI_KEY_RES = Object.fromEntries(
    ['dark', 'light', 'hcDark', 'hcLight'].map((k) => [k, new RegExp(`\\b${k}\\s*:\\s*'([^']+)'`)])
);

// Given the index of an opening '{', return the substring through its matching '}'.
function scanBraceBlock(source, openBrace) {
    let depth = 1;
    let i = openBrace + 1;
    while (i < source.length && depth > 0) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') depth--;
        i++;
    }
    return source.slice(openBrace, i);
}

// Extract a single mode value from a defaults block, respecting paren depth so
// transparent(x, 0.5) is not split mid-argument. Returns null when absent/empty.
function extractDefaultValue(block, key) {
    const keyMatch = block.match(new RegExp(`\\b${key}\\s*:\\s*`));
    if (!keyMatch) return null;
    let depth = 0;
    const start = keyMatch.index + keyMatch[0].length;
    let j = start;
    while (j < block.length) {
        const ch = block[j];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if ((ch === ',' || ch === '}') && depth === 0) break;
        j++;
    }
    return block.slice(start, j).trim() || null;
}

function parseDefaultsBlock(block) {
    const entry = {};
    for (const key of ['dark', 'light', 'hcDark', 'hcLight']) {
        entry[key] = extractDefaultValue(block, key);
    }
    return entry;
}

// Given the index of a second-argument start, return the index of the first
// top-level comma or the argument's closing paren.
function scanArgEnd(source, argStart) {
    let depth = 0;
    let i = argStart;
    while (i < source.length) {
        const ch = source[i];
        if (ch === '(') depth++;
        else if (ch === ')') { if (depth === 0) break; depth--; }
        else if (ch === ',' && depth === 0) break;
        i++;
    }
    return i;
}

/**
 * Parse registerColor() default values from a VSCode TypeScript source file.
 * Returns a map of tokenName → { dark, light, hcDark, hcLight } (hex strings or null).
 *
 * VSCode registerColor() signature:
 *   registerColor('token.name', { dark: '#hex', light: '#hex', hcDark: '#hex', hcLight: '#hex' }, ...)
 *
 * The defaults object can contain:
 *   - '#RRGGBB' / '#RRGGBBAA' hex strings
 *   - null (transparent / not set)
 *   - A variable reference (another token)
 *   - A function call like transparent(x, 0.5), darken(x, 0.2), lighten(x, 0.2)
 *   - Color.white, Color.black, Color.fromHex(...)
 *
 * We resolve simple hex values directly. For references and functions we walk
 * the accumulated known values to resolve them transitively. Unresolvable
 * expressions remain null (transparent).
 */
function parseTsColorDefaults(source) {
    const results = {};
    // Maps JS const name (e.g. MODERN_TAB_ACTIVE_BACKGROUND or listInactiveSelectionBackground) → token name
    const constToToken = {};

    // Match registerColor calls where the default is an object literal { dark: ..., light: ..., ... }.
    // We locate the opening { with a regex then extract the full block with a brace-depth walker so
    // nested braces (e.g. helper({ tint: 0.1 })) don't truncate the capture.
    const OBJECT_START_RE =
        /(?:(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*)?registerColor\(\s*['"]([^'"]+)['"]\s*,\s*\{/g;

    let match;
    while ((match = OBJECT_START_RE.exec(source)) !== null) {
        const constName = match[1];
        const tokenName = match[2];
        const defaultsBlock = scanBraceBlock(source, match.index + match[0].length - 1);
        if (constName) constToToken[constName] = tokenName;
        results[tokenName] = parseDefaultsBlock(defaultsBlock);
    }

    // Match registerColor calls where the default is a bare variable ref or function call.
    // Captures both SCREAMING_CASE (MODERN_TAB_ACTIVE_BACKGROUND) and camelCase
    // (listInactiveSelectionBackground) const names for cross-file reference resolution.
    // e.g. registerColor('modernTab.activeBackground', listInactiveSelectionBackground, ...)
    // e.g. registerColor('foo', oneOf(a, b), ...)
    // e.g. registerColor('foo', opaque(X, editorBackground), ...) — comma inside parens
    // The default arg is everything up to the first top-level comma (not inside parens).
    // We use a two-pass approach: first find the registerColor call start, then walk to find
    // the end of the second argument using a paren-depth counter.
    const BARE_START_RE =
        /(?:(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*)?registerColor\(\s*['"]([^'"]+)['"]\s*,\s*(['"]?[A-Za-z#])/g;

    while ((match = BARE_START_RE.exec(source)) !== null) {
        const constName = match[1];
        const tokenName = match[2];
        // Group 3 captures an optional opening quote plus one leading char, so back up by
        // its full length to include a leading quote — otherwise a quoted hex default like
        // '#6c1717' loses its opening quote and fails to parse (resolves to transparent).
        const argStart = match.index + match[0].length - match[3].length;
        const defaultExpr = source.slice(argStart, scanArgEnd(source, argStart)).trim();

        if (constName) constToToken[constName] = tokenName;
        if (results[tokenName]) continue; // already captured by object form

        // Use the same expression for all 4 modes — resolveColorExpressions will resolve it
        results[tokenName] = { dark: defaultExpr, light: defaultExpr, hcDark: defaultExpr, hcLight: defaultExpr };
    }

    return { results, constToToken };
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (min + max) / 2;
    const chroma = max - min;
    if (chroma === 0) return { h: 0, s: 0, l };
    const s = Math.min(l <= 0.5 ? chroma / (2 * l) : chroma / (2 - 2 * l), 1);
    let h = 0;
    switch (max) {
        case r: h = (g - b) / chroma + (g < b ? 6 : 0); break;
        case g: h = (b - r) / chroma + 2; break;
        case b: h = (r - g) / chroma + 4; break;
    }
    return { h: Math.round(h * 60), s, l };
}

function hslToRgb(h, s, l) {
    h /= 360;
    if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };
    return {
        r: Math.round(hue2rgb(h + 1/3) * 255),
        g: Math.round(hue2rgb(h) * 255),
        b: Math.round(hue2rgb(h - 1/3) * 255),
    };
}

/**
 * Split a comma-separated argument string respecting paren depth,
 * so nested calls like transparent(x, 0.5) are not split mid-argument.
 */
function splitTopLevelArgs(str) {
    const args = [];
    let depth = 0, start = 0;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '(') depth++;
        else if (str[i] === ')') depth--;
        else if (str[i] === ',' && depth === 0) {
            args.push(str.slice(start, i).trim());
            start = i + 1;
        }
    }
    args.push(str.slice(start).trim());
    return args;
}

/**
 * Adjust a hex color's HSL lightness toward darker or lighter by a factor.
 * A trailing alpha byte on the input (#RRGGBBAA) is preserved in the output.
 */
function adjustLightness(refHex, kind, factor) {
    const base = refHex.replace('#', '');
    const { h, s, l } = rgbToHsl(
        parseInt(base.slice(0, 2), 16),
        parseInt(base.slice(2, 4), 16),
        parseInt(base.slice(4, 6), 16)
    );
    const newL = kind === 'darken' ? l - l * factor : l + l * factor;
    const { r, g, b } = hslToRgb(h, s, Math.max(0, Math.min(1, newL)));
    const alpha = base.length === 8 ? base.slice(6, 8) : '';
    return `#${toHex(r/255)}${toHex(g/255)}${toHex(b/255)}${alpha}`;
}

/**
 * Resolve raw TypeScript color expressions to hex strings.
 * Builds and returns a new resolved hex map; does not mutate rawMap.
 *
 * Supported expressions (case-sensitive):
 *   '#RRGGBB[AA]' → hex string
 *   null / undefined → null (transparent)
 *   Color.white → '#ffffff'
 *   Color.black → '#000000'
 *   Color.fromHex('#RRGGBB[AA]') → hex string
 *   transparent(ref, alpha) → mix ref color at given alpha
 *   darken(ref, factor) / lighten(ref, factor) → approximate hex
 *   opaque(ref, bg) → ref with its alpha channel stripped
 *   oneOf(a, b, ...) → first argument that resolves to a color
 *   ifDefinedThenElse(cond, then, else) → 'then', falling back to 'else'
 *   Another token name (variable reference)
 */
function resolveColorExpressions(rawMap, constToToken) {
    // Guards against reference cycles. Each reference hop costs two increments
    // (resolveValue → resolveRef → resolveValue), and real VSCode chains nest
    // ~9 deep, so this must be comfortably above that.
    const MAX_DEPTH = 24;

    function resolveValue(raw, mode, depth = 0) {
        if (depth > MAX_DEPTH) return null;
        if (!raw || raw === 'null' || raw === 'undefined') return null;

        // Strip surrounding whitespace and trailing comments
        const val = raw.replace(/\/\/.*$/, '').trim();
        if (!val || val === 'null') return null;

        // Direct hex
        const hexMatch = val.match(/^'(#[0-9a-fA-F]{3,8})'$/) || val.match(/^"(#[0-9a-fA-F]{3,8})"$/);
        if (hexMatch) return normalizeHex(hexMatch[1]);

        // Color.white / Color.black
        if (val === 'Color.white') return '#ffffff';
        if (val === 'Color.black') return '#000000';

        // Color.fromHex('#RRGGBB')
        const fromHexMatch = val.match(/Color\.fromHex\(['"]([^'"]+)['"]\)/);
        if (fromHexMatch) return normalizeHex(fromHexMatch[1]);

        // Function-call expressions: transparent/darken/lighten/opaque/oneOf/ifDefinedThenElse.
        // Args are split paren-aware and resolved through resolveValue (not resolveRef) so
        // nested calls like opaque(transparent(foreground, 0.15), bg) resolve correctly.
        const callMatch = val.match(/^([a-zA-Z]+)\((.*)\)$/s);
        if (callMatch) {
            const fn = callMatch[1];
            const args = splitTopLevelArgs(callMatch[2]);

            if (fn === 'transparent') {
                const refHex = resolveValue(args[0], mode, depth + 1);
                const alpha = parseFloat(args[1]);
                if (!refHex || isNaN(alpha)) return null;
                return figmaRgbaToHex({ ...hexToFigmaRgba(refHex), a: alpha });
            }

            if (fn === 'darken' || fn === 'lighten') {
                const refHex = resolveValue(args[0], mode, depth + 1);
                if (!refHex) return null;
                const factor = parseFloat(args[1]);
                if (isNaN(factor)) return refHex;
                return adjustLightness(refHex, fn, factor);
            }

            if (fn === 'opaque') {
                const refHex = resolveValue(args[0], mode, depth + 1);
                if (!refHex) return null;
                return normalizeHex(refHex.slice(0, 7)); // strip alpha
            }

            if (fn === 'oneOf') {
                for (const arg of args) {
                    const r = resolveValue(arg, mode, depth + 1);
                    if (r) return r;
                }
                return null;
            }

            if (fn === 'ifDefinedThenElse') {
                // args: cond, then, else — use 'then', fall back to 'else'
                return resolveValue(args[1], mode, depth + 1) ?? resolveValue(args[2], mode, depth + 1);
            }
        }

        // Variable reference — could be a JS identifier referring to another color const
        // Try treating it as a token name (dot or hyphen form)
        return resolveRef(val, mode, depth + 1);
    }

    function resolveRef(ref, mode, depth) {
        if (depth > MAX_DEPTH) return null;
        // Strip trailing semicolons/quotes, then try const-name, then token name in
        // dot form, then hyphen→dot form — first match in rawMap wins.
        const clean = ref.replace(/[;'"]/g, '').trim();
        const candidates = [constToToken[clean], clean, toDotForm(clean)];
        for (const name of candidates) {
            if (name && rawMap[name]) return resolveValue(rawMap[name][mode], mode, depth + 1);
        }
        return null;
    }

    // Build resolved map
    const hexMap = {};
    for (const [token, modes] of Object.entries(rawMap)) {
        hexMap[token] = {};
        for (const mode of ['dark', 'light', 'hcDark', 'hcLight']) {
            hexMap[token][mode] = resolveValue(modes[mode], mode);
        }
    }

    return hexMap;
}

/**
 * Parse the ansiColorMap object literal in terminalColorRegistry.ts.
 * Format: 'terminal.ansiBlack': { index: N, defaults: { light: '#hex', dark: '#hex', hcDark: '#hex', hcLight: '#hex' } }
 */
function parseAnsiColorMap(source) {
    const results = {};
    // Match each entry in the ansiColorMap object
    const ENTRY_RE =
        /'(terminal\.ansi[^']+)'\s*:\s*\{\s*index\s*:\s*\d+\s*,\s*defaults\s*:\s*(\{[\s\S]*?\})\s*\}/g;
    let match;
    while ((match = ENTRY_RE.exec(source)) !== null) {
        const tokenName = match[1];
        const defaultsBlock = match[2];
        const entry = {};
        for (const key of ['dark', 'light', 'hcDark', 'hcLight']) {
            const km = defaultsBlock.match(ANSI_KEY_RES[key]);
            entry[key] = km ? `'${km[1]}'` : null;
        }
        results[tokenName] = entry;
    }
    return results;
}

/**
 * Parse contributed colors from a VSCode extension package.json.
 * Extensions declare defaults as { light, dark, highContrast, highContrastLight }.
 * We map highContrast → hcDark and highContrastLight → hcLight.
 */
function parseExtensionPackageColors(packageJson) {
    const results = {};
    try {
        const data = JSON.parse(packageJson);
        const colors = data?.contributes?.colors ?? [];
        for (const { id, defaults } of colors) {
            if (!id || !defaults) continue;
            results[id] = {
                light: defaults.light ? `'${defaults.light}'` : null,
                dark: defaults.dark ? `'${defaults.dark}'` : null,
                hcDark: defaults.highContrast ? `'${defaults.highContrast}'` : null,
                hcLight: defaults.highContrastLight ? `'${defaults.highContrastLight}'` : null,
            };
        }
    } catch (err) {
        // Malformed package.json: skip it but surface the reason so a maintainer can tell
        // an empty result apart from a fetch/parse failure when a token looks unregistered.
        process.stderr.write(`⚠️  Failed to parse extension package.json for colors: ${err.message}\n`);
    }
    return results;
}

// Extension package.json files that contribute colors with defaults.
const EXTENSION_PACKAGE_SOURCES = [
    'extensions/git/package.json',
];

// GitHub code-search hard-caps at the first 1000 results (10 pages of 100); paging
// beyond that returns 422. We honour that ceiling in fetchTsColorSources.
const SEARCH_PER_PAGE = 100;
const SEARCH_MAX_PAGES = 10;
const searchUrl = (page) =>
    `https://api.github.com/search/code?q=registerColor+repo:microsoft/vscode+path:src/vs+extension:ts&per_page=${SEARCH_PER_PAGE}&page=${page}`;

// Files returned by the search API that reference registerColor but don't define
// built-in color tokens (infrastructure, tests, type declarations, theme service).
const TS_SEARCH_EXCLUDES = [
    /\/test\//,
    /\.test\.ts$/,
    /\.d\.ts$/,
    /colorUtils\.ts$/,
    /extHost\.api\.impl/,
    /extHostLanguageFeatures/,
    /standaloneLanguages/,
    /colorThemeSchema/,
    /themeExtensionPoints/,
    /workbenchThemeService/,
    /debug\.contribution/,
    /terminal\.contribution/,
    /colorExtensionPoint/,
];

/**
 * Fetch the list of VSCode TS files that define registerColor() calls via the
 * GitHub code search API. Pages through all results (the API returns at most 100
 * per page) so no source file is dropped once the match count exceeds one page.
 */
async function fetchTsColorSources() {
    const token = process.env.GITHUB_TOKEN;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    async function fetchPage(page) {
        const res = await fetch(searchUrl(page), { headers });
        if (!res.ok) throw new Error(`GitHub search API returned ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.items)) throw new Error('GitHub search API response malformed');
        return data;
    }

    const first = await fetchPage(1);
    const totalCount = typeof first.total_count === 'number' ? first.total_count : first.items.length;
    const pages = Math.min(Math.ceil(totalCount / SEARCH_PER_PAGE), SEARCH_MAX_PAGES);

    const items = [...first.items];
    for (let page = 2; page <= pages; page++) {
        const data = await fetchPage(page);
        items.push(...data.items);
    }

    if (totalCount > SEARCH_PER_PAGE * SEARCH_MAX_PAGES) {
        // The API refuses to return results past this ceiling, so files beyond it are
        // invisible to us. Narrow or split the query if this ever fires.
        process.stderr.write(
            `⚠️  GitHub search matched ${totalCount} files but the API caps results at ` +
                `${SEARCH_PER_PAGE * SEARCH_MAX_PAGES}; some color sources may be missing.\n`
        );
    }

    const files = items
        .map((item) => item.path)
        .filter((path) => !TS_SEARCH_EXCLUDES.some((re) => re.test(path)));
    process.stderr.write(`GitHub search: discovered ${files.length} TS color source files\n`);
    return files;
}

/**
 * Fetch and parse all TS color source files, returning a resolved hex map.
 */
async function fetchTsDefaults() {
    const rawMap = {};
    const constToToken = {};

    const tsColorSources = await fetchTsColorSources();
    const allFiles = [...tsColorSources, ...EXTENSION_PACKAGE_SOURCES];
    const sources = await Promise.all(allFiles.map((f) => fetchText(RAW_BASE + f)));
    const tsSources = sources.slice(0, tsColorSources.length);
    const extSources = sources.slice(tsColorSources.length);

    tsColorSources.forEach((_file, i) => {
        const source = tsSources[i];
        if (!source) return;
        const { results, constToToken: fileConstMap } = parseTsColorDefaults(source);
        // The 16 terminal.ansi* tokens live in an ansiColorMap object literal (not registerColor
        // calls), historically only in terminalColorRegistry.ts. Run the ANSI parser on every
        // source rather than gating on that filename: its regex only matches the
        // 'terminal.ansi…': { index, defaults } shape, so it is a no-op elsewhere, and this keeps
        // the tokens resolving even if upstream renames or relocates the file.
        Object.assign(rawMap, parseAnsiColorMap(source));
        Object.assign(rawMap, results);
        Object.assign(constToToken, fileConstMap);
    });

    for (const source of extSources) {
        if (!source) continue;
        Object.assign(rawMap, parseExtensionPackageColors(source));
    }

    return resolveColorExpressions(rawMap, constToToken);
}

// ─── main ────────────────────────────────────────────────────────────────────

function applyColor(variable, modeId, newHex, key, changed) {
    const currentRgba = variable.valuesByMode[modeId];
    if (!currentRgba) return;
    if (!colorsEqual(currentRgba, newHex)) {
        changed.push({ key, oldHex: figmaRgbaToHex(currentRgba), newHex });
        const newRgba = hexToFigmaRgba(newHex);
        variable.valuesByMode[modeId] = newRgba;
        if (variable.resolvedValuesByMode?.[modeId]) {
            variable.resolvedValuesByMode[modeId].resolvedValue = newRgba;
        }
    }
}

// Apply upstream theme-file color overrides for one mode, recording changes.
function collectThemeFileChanges(vscodeColors, modeId, varByName, addedFigmaNames, changed) {
    for (const [vscodeKey, rawHex] of Object.entries(vscodeColors)) {
        if (rawHex === null) continue;

        const newHex = normalizeHex(rawHex);
        if (!newHex) continue;

        const figmaName = resolveFigmaName(vscodeKey, varByName);
        if (!figmaName) continue;
        if (addedFigmaNames.has(figmaName)) continue; // skip tokens added this run — their values are already correct

        applyColor(varByName.get(figmaName), modeId, newHex, vscodeKey, changed);
    }
}

// Apply TS-default color values for tokens not covered by the theme file for this mode.
function collectTsDefaultChanges(tsDefaults, vscodeColors, modeId, tsKey, varByName, addedFigmaNames, changed) {
    for (const [tokenName, modes] of Object.entries(tsDefaults)) {
        const figmaName = resolveFigmaName(tokenName, varByName);
        if (!figmaName) continue;
        if (addedFigmaNames.has(figmaName)) continue;

        // Only update if this token has NO value in the theme JSON for this mode
        // (i.e. it wasn't covered by the theme file loop above)
        if (themeValueOf(vscodeColors, tokenName) != null) {
            continue; // already handled by theme file loop
        }

        const rawDefault = modes[tsKey];
        if (!rawDefault) continue;
        const newHex = normalizeHex(rawDefault);
        if (!newHex) continue;

        applyColor(varByName.get(figmaName), modeId, newHex, tokenName, changed);
    }
}

async function main() {
    const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));

    const varByName = new Map(tokens.variables.map((v) => [v.name, v]));

    // 1/2/3. Fetch known-variables, theme JSONs, and TS defaults concurrently.
    const [knownVarsJson, upstreamEntries, tsDefaults] = await Promise.all([
        fetch(KNOWN_VARS_URL).then((r) => {
            if (!r.ok) throw new Error(`Failed to fetch known variables: ${r.status}`);
            return r.json();
        }),
        Promise.all(
            THEMES.map(async ({ file, modeId, label, base, includes }) => [
                modeId,
                { label, colors: await fetchThemeColors(file, base, includes) },
            ])
        ),
        fetchTsDefaults(),
    ]);
    const { colors: knownVarsCss } = knownVarsJson;
    if (!Array.isArray(knownVarsCss)) {
        throw new Error(
            `Unexpected shape for vscode-known-variables.json: expected a "colors" array, got ${typeof knownVarsCss}. ` +
                'The upstream file format may have changed — review KNOWN_VARS_URL.'
        );
    }
    // Convert CSS custom properties to hyphen-form token names:
    // '--vscode-editor-background' → 'editor-background'
    const knownVarsHyphen = new Set(knownVarsCss.map((v) => v.replace(/^--vscode-/, '')));
    const upstream = Object.fromEntries(upstreamEntries);
    const allUpstreamColors = Object.fromEntries(Object.entries(upstream).map(([k, v]) => [k, v.colors]));

    // 4. Compute the next available VariableID index.
    let nextId =
        tokens.variables.reduce((max, v) => {
            const match = v.id.match(/VariableID:1:(\d+)/);
            return match ? Math.max(max, parseInt(match[1])) : max;
        }, 0) + 1;

    // 5. Build the valid set from known-variables.json (authoritative pruning list).
    //    Any token in vscode_themes.json whose hyphen-form name is NOT in the known vars list will be pruned.
    //    This removes GitLens tokens, Rainbow CSV tokens, git extension tokens, and obsolete tokens.

    const isInTsDefaults = (name) => toDotForm(name) in tsDefaults || name in tsDefaults;

    // Add new tokens from known-variables that don't exist in the current file.
    const added = [];
    const addedFigmaNames = new Set();

    for (const cssVar of knownVarsCss) {
        const hyphenName = cssVar.replace(/^--vscode-/, '');
        if (varByName.has(hyphenName)) continue;

        const newVar = createFigmaVariable(hyphenName, allUpstreamColors, tsDefaults, nextId++);

        // Detect modes where we have no upstream source at all:
        // the token has no registerColor() entry anywhere AND no theme JSON override.
        // Note: inTsDefaults=true with a null value means VSCode intentionally set it to null — not flagged.
        const noUpstream = !isInTsDefaults(hyphenName) && THEMES.every(
            ({ modeId }) => themeValueOf(allUpstreamColors[modeId] ?? {}, hyphenName) == null
        );
        tokens.variables.push(newVar);
        tokens.variableIds.push(newVar.id);
        varByName.set(newVar.name, newVar);
        addedFigmaNames.add(newVar.name);
        added.push({ name: hyphenName, noUpstream });
    }

    // 6. Prune tokens NOT in known-variables.json.
    const removed = [];
    const removedIds = new Set();
    tokens.variables = tokens.variables.filter((v) => {
        if (knownVarsHyphen.has(v.name)) return true;
        removed.push(v.name);
        removedIds.add(v.id);
        return false;
    });
    tokens.variableIds = tokens.variableIds.filter((id) => !removedIds.has(id));
    for (const name of removed) varByName.delete(name);

    // 6b. Sync the ⚠️ description tag on every surviving variable.
    //     This runs on every execution so the tag self-corrects in both directions:
    //     - tokens with no upstream registerColor() get tagged
    //     - tokens that gained a registerColor() upstream have the tag removed
    const UNREGISTERED_TAG = '⚠️ no upstream registerColor — token has no default color value in any VSCode source file';
    const upstreamColorValues = Object.values(allUpstreamColors);
    for (const v of tokens.variables) {
        const hasAnyThemeValue = upstreamColorValues.some(
            (colors) => themeValueOf(colors, v.name) != null
        );
        const isUnregistered = !isInTsDefaults(v.name) && !hasAnyThemeValue;
        if (isUnregistered && v.description !== UNREGISTERED_TAG) {
            v.description = UNREGISTERED_TAG;
        } else if (!isUnregistered && v.description === UNREGISTERED_TAG) {
            v.description = '';
        }
    }

    // 7. Update values for existing tokens that changed in upstream theme files.
    const changesByTheme = {};

    for (const { modeId, label, tsKey } of THEMES) {
        const vscodeColors = upstream[modeId].colors;
        const changed = [];

        collectThemeFileChanges(vscodeColors, modeId, varByName, addedFigmaNames, changed);
        collectTsDefaultChanges(tsDefaults, vscodeColors, modeId, tsKey, varByName, addedFigmaNames, changed);

        if (changed.length) {
            changesByTheme[modeId] = { label, changed };
        }
    }

    const anyChanges = Object.keys(changesByTheme).length > 0 || added.length > 0 || removed.length > 0;
    if (!anyChanges) {
        process.exit(0);
    }

    // Write updated tokens file
    writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2) + '\n', 'utf8');

    const summaryParts = [];
    for (const { label, changed } of Object.values(changesByTheme)) {
        summaryParts.push(`${label}: ${changed.length} changed`);
    }
    if (added.length) summaryParts.push(`${added.length} added`);
    if (removed.length) summaryParts.push(`${removed.length} removed`);
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
        const noSource = added.filter(({ noUpstream }) => noUpstream).length;
        const noSourceNote = noSource
            ? `\n\n> ⚠️ ${noSource} token${noSource === 1 ? '' : 's'} added with no upstream default in any mode — no \`registerColor()\` call was found. These tokens may resolve to transparent at runtime.`
            : '';
        const rows = added
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(({ name, noUpstream }) => noUpstream
                ? `| \`${name}\` ⚠️ no upstream registerColor |`
                : `| \`${name}\` |`)
            .join('\n');
        sections.push(`### Added (${added.length} new tokens)${noSourceNote}\n\n| Token |\n|-------|\n${rows}`);
    }

    if (removed.length) {
        const rows = removed
            .sort()
            .map((name) => `| \`${name}\` |`)
            .join('\n');
        sections.push(`### Removed (${removed.length} tokens)\n\n| Token |\n|-------|\n${rows}`);
    }

    const unregistered = tokens.variables
        .filter((v) => typeof v.description === 'string' && v.description.startsWith('⚠️ no upstream registerColor'))
        .map((v) => v.name)
        .sort();
    if (unregistered.length) {
        const rows = unregistered.map((name) => `| \`${name}\` |`).join('\n');
        sections.push(
            `### ⚠️ All unregistered tokens (${unregistered.length})\n\nThese tokens have no \`registerColor()\` call — their CSS custom property is never set by VSCode and will resolve to transparent at runtime.\n\n| Token |\n|-------|\n${rows}`
        );
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
