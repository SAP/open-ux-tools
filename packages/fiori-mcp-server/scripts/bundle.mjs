/**
 * Full esbuild bundle script for @sap-ux/fiori-mcp-server.
 *
 * Produces a self-contained dist/ directory:
 *
 *   dist/index.js                         bundled JS (TS source + most deps inlined)
 *   dist/node_modules/onnxruntime-node/   ONNX runtime (native .node files)
 *   dist/prebuilds/                       @zowe/secrets-for-zowe-sdk .node binaries
 *   dist/data/embeddings/                 pre-built binary vector store (embeddings.bin + records.jsonl)
 *   dist/icon.png, dist/icon.svg
 *
 * Model strategy:
 *   The ONNX model (all-MiniLM-L6-v2, ~86 MB) is NOT bundled. It is downloaded
 *   from HuggingFace Hub on first use and cached in the default @huggingface/transformers
 *   cache directory (respects HF_HOME / TRANSFORMERS_CACHE env vars; defaults to
 *   ~/.cache/huggingface/hub on Linux/macOS).
 *   This keeps the published tgz under npm's 100 MB limit.
 *
 * Native binary strategy:
 *   onnxruntime-node — kept external (uses a dynamic require template literal
 *     that esbuild cannot bundle). Copied to
 *     dist/node_modules/onnxruntime-node/ with its bin/ tree intact.
 */

import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');
const DIST = path.join(PKG_ROOT, 'dist');
const isDev = process.env.NODE_ENV === 'development';

// ── helpers ──────────────────────────────────────────────────────────────────

function copyDir(src, dst) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dst, entry.name);
        if (entry.isDirectory()) {
            copyDir(s, d);
        } else {
            fs.copyFileSync(s, d);
        }
    }
}

// Strip dependency/script fields from package.json files inside dist/node_modules/
// so package managers (bun, npm, yarn) don't try to resolve or run them when
// installing the tarball. Node's require() only needs name/main/exports/type.
function scrubNestedPackageJsons(nodeModulesDir) {
    const FIELDS_TO_REMOVE = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'scripts'];
    for (const entry of fs.readdirSync(nodeModulesDir, { withFileTypes: true })) {
        const dir = path.join(nodeModulesDir, entry.name);
        if (!entry.isDirectory()) continue;
        // Handle scoped packages (@scope/pkg)
        if (entry.name.startsWith('@')) {
            scrubNestedPackageJsons(dir);
            continue;
        }
        const pkgFile = path.join(dir, 'package.json');
        if (fs.existsSync(pkgFile)) {
            const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
            let changed = false;
            for (const field of FIELDS_TO_REMOVE) {
                if (field in pkg) {
                    delete pkg[field];
                    changed = true;
                }
            }
            if (changed) fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
        }
    }
}

// Walk up from a resolved entry point to find the package root (the directory
// whose package.json has name === pkgName). Needed for packages like
// onnxruntime-common whose main entry is at dist/cjs/index.js — a naive
// single `..` lands in dist/ which has no package.json.
function findPkgRoot(entryPath, pkgName) {
    let dir = path.dirname(entryPath);
    while (dir !== path.dirname(dir)) {
        const pkgFile = path.join(dir, 'package.json');
        if (fs.existsSync(pkgFile)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
                if (pkg.name === pkgName) return dir;
            } catch {
                /* keep walking */
            }
        }
        dir = path.dirname(dir);
    }
    throw new Error(`Could not find package root for ${pkgName} starting from ${entryPath}`);
}

// createRequire rooted at the package so pnpm symlinks resolve correctly
const req = createRequire(path.join(PKG_ROOT, 'package.json'));

// onnxruntime-node is not in fiori-mcp-server's direct deps — it lives inside
// @huggingface/transformers' node_modules. Resolve via transformers' context.
const hfReq = createRequire(req.resolve('@huggingface/transformers'));

// ── resolve key package paths ────────────────────────────────────────────────

// @huggingface/transformers doesn't expose package.json via exports;
// resolve from the dist CJS entry and walk up.
const hfNodeCjs = req.resolve('@huggingface/transformers');
const hfPkgDir = findPkgRoot(hfNodeCjs, '@huggingface/transformers');
const hfDistDir = path.join(hfPkgDir, 'dist');

// onnxruntime packages also don't expose package.json — walk up from main entry
// until the package.json whose name matches is found (onnxruntime-common's entry
// is at dist/cjs/index.js so a naive single .. would land in dist/, not the root).
const onnxPkgDir = findPkgRoot(hfReq.resolve('onnxruntime-node'), 'onnxruntime-node');
const onnxCommonPkgDir = findPkgRoot(hfReq.resolve('onnxruntime-common'), 'onnxruntime-common');

const embeddingsPkgJson = req.resolve('@sap-ux/fiori-docs-embeddings/package.json');
const embeddingsDataDir = path.join(path.dirname(embeddingsPkgJson), 'data', 'embeddings');

// ── Step 1: esbuild JS bundle ────────────────────────────────────────────────

fs.mkdirSync(DIST, { recursive: true });

// ── package.json shim plugin ──────────────────────────────────────────────────
// src/ files import ../../package.json to read name/version for telemetry and
// MCP server metadata. esbuild inlines the full object — including devDependencies
// and scripts — into the bundle. Bun's global-install scanner then parses those
// fields and creates a self-referencing dependency loop.
//
// This plugin intercepts every import whose resolved path ends with the root
// package.json and replaces it with a minimal shim that only exports name/version.
const rootPkgJson = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8'));
const pkgJsonShimPlugin = {
    name: 'package-json-shim',
    setup(build) {
        build.onLoad({ filter: /package\.json$/ }, (args) => {
            if (args.path !== path.join(PKG_ROOT, 'package.json')) return undefined;
            // Split the package name into an array joined at runtime so esbuild cannot
            // constant-fold it back to a single string literal. This prevents bun's
            // bundle-scanner from reconstructing "@sap-ux/fiori-mcp-server" and pairing
            // it with the inlined version to create a self-referencing dep constraint.
            const [scope, pkg] = rootPkgJson.name.split('/');
            return {
                contents: `const name = [${JSON.stringify(scope)}, ${JSON.stringify(pkg)}].join("/"); export { name }; export const version = ${JSON.stringify(rootPkgJson.version)}; export default { name, version };`,
                loader: 'js'
            };
        });
    }
};

// ── sharp stub plugin ─────────────────────────────────────────────────────────
// @huggingface/transformers requires 'sharp' for image processing. We only use
// it for text embeddings (feature-extraction), so sharp is never called.
// Replace it with an empty stub so the bundle doesn't fail at runtime when
// sharp is not installed.
const sharpStubPlugin = {
    name: 'sharp-stub',
    setup(build) {
        build.onResolve({ filter: /^sharp$/ }, () => ({ path: 'sharp-stub', namespace: 'sharp-stub' }));
        build.onLoad({ filter: /.*/, namespace: 'sharp-stub' }, () => ({
            // Must be a truthy default export so @huggingface/transformers' module-level
            // `if (import_sharp.default)` branch is taken instead of the `else { throw }`.
            // We never actually process images (text-only pipeline), so the stub is never called.
            contents:
                'module.exports = function sharp() { throw new Error("sharp not available"); }; module.exports.default = module.exports;',
            loader: 'js'
        }));
    }
};

await esbuild.build({
    entryPoints: [path.join(PKG_ROOT, 'src/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: path.join(DIST, 'index.js'),
    minify: !isDev,
    sourcemap: isDev ? 'inline' : false,
    mainFields: ['module', 'main'],
    // Force CJS condition for @huggingface/transformers so esbuild picks
    // transformers.node.cjs rather than transformers.node.mjs (which has a
    // static `import sharp from "sharp"` that esbuild would try to bundle).
    conditions: ['require', 'node', 'default'],
    banner: {
        js: [
            "import { createRequire as __cr } from 'node:module';",
            "import { fileURLToPath as __ftu } from 'node:url';",
            "import { dirname as __dn } from 'node:path';",
            'const require = __cr(import.meta.url);',
            'const __filename = __ftu(import.meta.url);',
            'const __dirname = __dn(__filename);'
        ].join('\n')
    },
    external: [
        'vscode',
        // Kept external — copied to dist/node_modules/
        'onnxruntime-node'
    ],
    plugins: [pkgJsonShimPlugin, sharpStubPlugin]
});

console.log('✓ esbuild bundle complete');

// ── Step 2: copy onnxruntime-node into dist/node_modules/onnxruntime-node/ ───
// onnxruntime-node uses require(`../bin/napi-v6/${platform}/${arch}/...node`)
// relative to dist/binding.js, so the entire package directory must be intact.
//
// Covered platforms in onnxruntime-node@1.24.3:
//   darwin/arm64, linux/x64, linux/arm64, win32/x64, win32/arm64
// Note: darwin/x64 is NOT shipped by onnxruntime-node upstream — macOS Intel
// is unsupported at this version.
//
// DirectML/dxcompiler/dxil DLLs are excluded: they are only loaded by
// onnxruntime.dll when the DML execution provider is explicitly requested for
// GPU inference. The MCP server runs CPU-only inference, so these ~80 MB of
// GPU acceleration DLLs are never needed.

const GPU_DLLS = new Set(['DirectML.dll', 'dxcompiler.dll', 'dxil.dll']);

function copyDirExcludeFiles(src, dst, excludeFileNames) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (entry.isFile() && excludeFileNames.has(entry.name)) continue;
        const s = path.join(src, entry.name);
        const d = path.join(dst, entry.name);
        entry.isDirectory() ? copyDirExcludeFiles(s, d, excludeFileNames) : fs.copyFileSync(s, d);
    }
}

const onnxOut = path.join(DIST, 'node_modules', 'onnxruntime-node');
copyDirExcludeFiles(onnxPkgDir, onnxOut, GPU_DLLS);
console.log('✓ Copied onnxruntime-node (GPU DLLs excluded)');

// ── Step 3: copy onnxruntime-common (required by onnxruntime-node) ───────────

const onnxCommonOut = path.join(DIST, 'node_modules', 'onnxruntime-common');
copyDir(onnxCommonPkgDir, onnxCommonOut);
console.log('✓ Copied onnxruntime-common');

// ── Step 4: copy @zowe/secrets-for-zowe-sdk prebuilds ────────────────────────
// @sap-ux/store's keyring loader calls findPrebuildsDir(__dirname) at runtime.
// When esbuild inlines src/keyring/index.js, __dirname becomes dist/. The loader
// walks up until it finds a package.json (the root package.json), then looks for
// prebuilds/keyring.<platform>.node relative to that directory. Copying only the
// prebuilds/ folder to dist/prebuilds/ satisfies this lookup — same pattern as
// packages/sap-systems-ext/esbuild.js.
//
// @zowe/secrets-for-zowe-sdk is a direct dep of @sap-ux/store, not of this
// package. Resolve it via store's require context so we don't need to add it
// to our own devDependencies.
// @sap-ux/store has a restrictive `exports` field that doesn't expose
// package.json. Resolve via main entry and walk up to find the package root.
const storePkgDir = findPkgRoot(req.resolve('@sap-ux/store'), '@sap-ux/store');
const storeReq = createRequire(path.join(storePkgDir, 'package.json'));
const zowePkgEntry = storeReq.resolve('@zowe/secrets-for-zowe-sdk');
const zowePrebuildsDir = path.join(path.dirname(zowePkgEntry), '..', 'prebuilds');
const zowePrebuildsOut = path.join(DIST, 'prebuilds');
// ia32 binaries are excluded: Node 22 dropped ia32 Windows support and no
// supported platform (darwin/arm64, darwin/x64, linux/x64, linux/arm64, win32/x64,
// win32/arm64) is 32-bit.
function copyPrebuilds(src, dst) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.includes('-ia32-')) continue;
        const s = path.join(src, entry.name);
        const d = path.join(dst, entry.name);
        entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
    }
}

if (fs.existsSync(zowePrebuildsDir)) {
    copyPrebuilds(zowePrebuildsDir, zowePrebuildsOut);
    console.log('✓ Copied @zowe/secrets-for-zowe-sdk prebuilds (ia32 excluded)');
} else {
    console.warn('⚠ @zowe/secrets-for-zowe-sdk prebuilds not found at', zowePrebuildsDir);
}

// ── Step 5: copy embeddings data ─────────────────────────────────────────────

const embeddingsOut = path.join(DIST, 'data', 'embeddings');
copyDir(embeddingsDataDir, embeddingsOut);
console.log('✓ Copied embeddings data');

// ── Step 6: copy WASM runtime ─────────────────────────────────────────────────
// @huggingface/transformers loads ort-wasm-simd-threaded.jsep.mjs from its own
// dist/ at runtime via a path relative to the transformers bundle. When inlined
// by esbuild the WASM load path becomes relative to dist/, so we copy it there.

const wasmFile = 'ort-wasm-simd-threaded.jsep.mjs';
const wasmSrc = path.join(hfDistDir, wasmFile);
if (fs.existsSync(wasmSrc)) {
    fs.copyFileSync(wasmSrc, path.join(DIST, wasmFile));
    console.log('✓ Copied WASM runtime');
} else {
    console.warn('⚠ WASM file not found at', wasmSrc);
}

// ── Step 7: copy icons ────────────────────────────────────────────────────────

for (const icon of ['icon.png', 'icon.svg']) {
    fs.copyFileSync(path.join(PKG_ROOT, 'assets', icon), path.join(DIST, icon));
}
console.log('✓ Copied icons');

// ── Step 8: scrub nested package.json files ──────────────────────────────────
// Remove dependency/script fields from package.json files inside dist/node_modules/
// so package managers (bun, npm) don't try to resolve or run them at install time.

scrubNestedPackageJsons(path.join(DIST, 'node_modules'));
console.log('✓ Scrubbed nested package.json files');

console.log('\nBuild complete. dist/ layout:');
for (const entry of fs.readdirSync(DIST)) {
    const stat = fs.statSync(path.join(DIST, entry));
    console.log(`  ${stat.isDirectory() ? '[dir]' : '     '} ${entry}`);
}
