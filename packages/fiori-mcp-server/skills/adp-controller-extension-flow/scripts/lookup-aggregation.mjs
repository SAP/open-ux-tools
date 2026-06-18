#!/usr/bin/env node
// Look up an aggregation's metadata (description, type, cardinality, etc.) for a
// SAPUI5 control. Reads ui5.yaml to discover the configured UI5 base URL and
// version; falls back to https://ui5.sap.com (latest) on miss.
//
// Usage:
//   node lookup-aggregation.mjs \
//     --lib sap.ui.comp \
//     --control sap.ui.comp.smarttable.SmartTable \
//     --aggregation customToolbar \
//     [--ui5-yaml /path/to/ui5.yaml]
//
// Output: JSON on stdout. Non-zero exit on error with { error: "..." }.

import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const FALLBACK_BASE = 'https://ui5.sap.com';
const CACHE_DIR = join(homedir(), '.cache', 'adp-aggregation-lookup');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val === undefined || val.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = val;
        i++;
      }
    }
  }
  return out;
}

function fail(msg, extra = {}) {
  process.stdout.write(JSON.stringify({ error: msg, ...extra }) + '\n');
  process.exit(1);
}

// Walk up from `start` looking for ui5.yaml. Stops at filesystem root.
function findUi5Yaml(start) {
  let dir = resolve(start);
  while (true) {
    const candidate = join(dir, 'ui5.yaml');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// Tiny YAML reader for the two fields we need: a `version:` and a `url:` that
// live under a `ui5:` mapping. We do NOT pull in a YAML lib — the file is
// well-known and our needs are narrow. Algorithm:
//   1. Find every line whose trimmed content is `ui5:` and remember its indent.
//   2. For each such line, scan following lines that are indented deeper than
//      the `ui5:` indent (i.e. children of that mapping). Collect `url:` and
//      `version:` from those children. Stop at the first line whose indent is
//      <= the `ui5:` indent (sibling/ancestor) or EOF.
//   3. Prefer a (url, version) pair that comes from the same `ui5:` block.
//      Multiple `ui5:` blocks can appear (preview vs. proxy); take the first
//      that has at least a non-empty `url`.
function parseUi5Yaml(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const blocks = [];
  const indentOf = (line) => line.match(/^(\s*)/)[1].length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === 'ui5:' || trimmed.startsWith('ui5:')) {
      // tolerate inline comments after `ui5:`
      const before = line.split('#')[0].trim();
      if (before !== 'ui5:') continue;
      const baseIndent = indentOf(line);
      const block = { url: null, version: null };
      for (let j = i + 1; j < lines.length; j++) {
        const ln = lines[j];
        if (ln.trim() === '' || ln.trim().startsWith('#')) continue;
        const ind = indentOf(ln);
        if (ind <= baseIndent) break;
        // direct children only (one indent level deeper). If deeper, it's a
        // nested mapping (e.g. `path:` list items) — skip.
        // We don't know the indent step, so we just match `key: value` shapes.
        const m = ln.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
        if (!m) continue;
        const key = m[1];
        const rest = m[2].split('#')[0].trim();
        // Strip surrounding quotes if present.
        const value = rest.replace(/^['"](.*)['"]$/, '$1');
        if (key === 'url' && value) block.url = value;
        if (key === 'version') block.version = value || null;
      }
      blocks.push(block);
    }
  }

  // Prefer a block with both url and version, then one with url, then one with
  // just version.
  const withBoth = blocks.find((b) => b.url && b.version);
  if (withBoth) return withBoth;
  const withUrl = blocks.find((b) => b.url);
  const withVersion = blocks.find((b) => b.version);
  return {
    url: withUrl ? withUrl.url : null,
    version: withVersion ? withVersion.version : null,
  };
}

function libToPath(libraryName) {
  return libraryName.replace(/\./g, '/');
}

function apiJsonUrl(base, version, libraryName) {
  const libPath = libToPath(libraryName);
  const cleanBase = base.replace(/\/+$/, '');
  if (version) {
    return `${cleanBase}/${version}/test-resources/${libPath}/designtime/api.json`;
  }
  return `${cleanBase}/test-resources/${libPath}/designtime/api.json`;
}

function cachePathFor(base, version, libraryName) {
  const safeBase = base.replace(/[^a-z0-9]+/gi, '_');
  const safeVersion = version || 'latest';
  return join(CACHE_DIR, `${safeBase}__${safeVersion}__${libraryName}.json`);
}

function readCache(path) {
  if (!existsSync(path)) return null;
  try {
    const stat = statSync(path);
    if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) return null;
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function writeCache(path, data) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(data));
  } catch {
    // cache failures are non-fatal
  }
}

async function fetchApiJson(base, version, libraryName) {
  const cachePath = cachePathFor(base, version, libraryName);
  const cached = readCache(cachePath);
  if (cached) return { data: cached, source: 'cache', url: apiJsonUrl(base, version, libraryName) };

  const url = apiJsonUrl(base, version, libraryName);
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    return { error: `network error fetching ${url}: ${e.message}`, url };
  }
  if (!res.ok) {
    return { error: `HTTP ${res.status} fetching ${url}`, status: res.status, url };
  }
  let data;
  try {
    data = await res.json();
  } catch (e) {
    return { error: `invalid JSON from ${url}: ${e.message}`, url };
  }
  writeCache(cachePath, data);
  return { data, source: 'network', url };
}

// Try preferred base+version, fall back through the chain:
//   1. configured base + version (if both)
//   2. configured base + latest (no version segment)
//   3. fallback base + version (https://ui5.sap.com/<version>/...)
//   4. fallback base + latest
async function resolveApiJson(configuredBase, version, libraryName) {
  const attempts = [];
  if (configuredBase && version) attempts.push({ base: configuredBase, version });
  if (configuredBase) attempts.push({ base: configuredBase, version: null });
  if (version) attempts.push({ base: FALLBACK_BASE, version });
  attempts.push({ base: FALLBACK_BASE, version: null });

  // dedupe (configuredBase may equal FALLBACK_BASE)
  const seen = new Set();
  const errors = [];
  for (const a of attempts) {
    const key = `${a.base}|${a.version || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const res = await fetchApiJson(a.base, a.version, libraryName);
    if (res.data) {
      return { ...res, base: a.base, version: a.version };
    }
    errors.push(res);
  }
  return { error: 'all fetch attempts failed', attempts: errors };
}

function findControl(apiJson, controlName) {
  if (!apiJson || !Array.isArray(apiJson.symbols)) return null;
  return apiJson.symbols.find((s) => s.name === controlName) || null;
}

function findAggregation(symbol, aggregationName) {
  const aggs = symbol?.['ui5-metadata']?.aggregations;
  if (!Array.isArray(aggs)) return null;
  return aggs.find((a) => a.name === aggregationName) || null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.lib) fail('missing --lib (e.g. --lib sap.ui.comp)');
  if (!args.control) fail('missing --control (e.g. --control sap.ui.comp.smarttable.SmartTable)');
  if (!args.aggregation) fail('missing --aggregation (e.g. --aggregation customToolbar)');

  // Resolve ui5.yaml: explicit > walk up from cwd. Either is optional —
  // missing yaml means we go straight to the public fallback.
  let yamlPath = args['ui5-yaml'];
  if (!yamlPath) yamlPath = findUi5Yaml(process.cwd());
  let configuredBase = null;
  let version = null;
  if (yamlPath && existsSync(yamlPath)) {
    try {
      const text = readFileSync(yamlPath, 'utf8');
      const parsed = parseUi5Yaml(text);
      configuredBase = parsed.url;
      version = parsed.version;
    } catch (e) {
      // non-fatal — fall through to public base
    }
  }

  const result = await resolveApiJson(configuredBase, version, args.lib);
  if (!result.data) {
    fail(`could not fetch api.json for ${args.lib}`, {
      configuredBase,
      version,
      attempts: result.attempts,
    });
  }

  const symbol = findControl(result.data, args.control);
  if (!symbol) {
    fail(`control ${args.control} not found in ${args.lib} api.json`, {
      source: result.url,
      sourceMode: result.source,
    });
  }

  const agg = findAggregation(symbol, args.aggregation);
  if (!agg) {
    const known = (symbol['ui5-metadata']?.aggregations || []).map((a) => a.name);
    fail(`aggregation ${args.aggregation} not defined on ${args.control}`, {
      source: result.url,
      knownAggregations: known,
      hint:
        'Pass the control listed under aggregationsByClass[].definedIn for this aggregation. ' +
        'This script does not walk the inheritance chain.',
    });
  }

  const out = {
    library: args.lib,
    control: args.control,
    aggregation: agg.name,
    type: agg.type,
    cardinality: agg.cardinality,
    visibility: agg.visibility,
    since: agg.since || null,
    description: agg.description || null,
    source: {
      url: result.url,
      mode: result.source, // 'cache' or 'network'
      base: result.base,
      version: result.version,
      fallbackUsed:
        configuredBase &&
        result.base !== configuredBase
          ? true
          : version && !result.version
          ? true
          : false,
    },
  };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main().catch((e) => fail(`unexpected error: ${e.stack || e.message}`));
