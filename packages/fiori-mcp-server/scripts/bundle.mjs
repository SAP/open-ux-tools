/**
 * Full esbuild bundle script for @sap-ux/fiori-mcp-server.
 *
 * Produces a self-contained dist/ directory:
 *
 *   dist/index.js                         bundled JS (TS source + all deps inlined)
 *   dist/ort-wasm-simd-threaded.wasm      ONNX WASM runtime binary (~12 MB)
 *   dist/ort-wasm-simd-threaded.mjs       WASM factory loader (loaded by ort.node.min.mjs)
 *   dist/ort-wasm-simd-threaded.jsep.mjs  JSEP WASM factory (used by transformers internally)
 *   dist/prebuilds/                       @zowe/secrets-for-zowe-sdk .node binaries
 *   dist/data/embeddings/                 pre-built binary vector store (embeddings.bin + records.jsonl)
 *   dist/icon.png, dist/icon.svg
 *
 * Model strategy:
 *   The ONNX model (all-MiniLM-L6-v2, ~86 MB) is NOT bundled. It is downloaded
 *   from HuggingFace Hub on first use and cached in the default @huggingface/transformers
 *   cache directory (respects HF_HOME / TRANSFORMERS_CACHE env vars; defaults to
 *   ~/.cache/huggingface/hub on Linux/macOS).
 *
 * ONNX runtime strategy:
 *   onnxruntime-node (native binaries, ~140 MB across all platforms) is replaced
 *   by onnxruntime-web (WASM, ~12 MB, single platform-independent binary).
 *   scripts/onnxruntime-node-wasm-shim.cjs is aliased as 'onnxruntime-node' in
 *   the esbuild bundle; it sets globalThis[Symbol.for('onnxruntime')] so that
 *   @huggingface/transformers uses the WASM backend instead of native.
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

// onnxruntime-web is a dep of @huggingface/transformers. Resolve via transformers' context
// so pnpm symlinks resolve correctly even though onnxruntime-web is not a direct dep here.
const hfReq = createRequire(req.resolve('@huggingface/transformers'));

// ── resolve key package paths ────────────────────────────────────────────────

// @huggingface/transformers doesn't expose package.json via exports;
// resolve from the dist CJS entry and walk up.
const hfNodeCjs = req.resolve('@huggingface/transformers');
const hfPkgDir = findPkgRoot(hfNodeCjs, '@huggingface/transformers');
const hfDistDir = path.join(hfPkgDir, 'dist');

// onnxruntime-web is a direct dep of @huggingface/transformers.
const ortWebPkgDir = findPkgRoot(hfReq.resolve('onnxruntime-web'), 'onnxruntime-web');
const ortWebDistDir = path.join(ortWebPkgDir, 'dist');
// ort.node.min.js is the Node.js entry point that registers cpu+wasm WASM backends.
const ortWebNodeEntry = hfReq.resolve('onnxruntime-web');

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

// ── onnxruntime-node WASM alias plugin ────────────────────────────────────────
// Replaces native onnxruntime-node (multi-platform binaries, ~140 MB) with
// onnxruntime-web (WASM, ~12 MB, platform-independent).
//
// The generated shim:
//   1. Requires onnxruntime-web via its resolved absolute path (so esbuild can
//      inline it without needing it as a direct dependency of this package).
//   2. Sets env.wasm.wasmPaths so onnxruntime-web finds the .wasm binary at
//      runtime relative to dist/ (where bundle.mjs copies it in Step 4).
//
// The shim intentionally does NOT set globalThis[Symbol.for('onnxruntime')].
// Setting that global causes @huggingface/transformers to skip its IS_NODE_ENV
// device registration branch entirely, leaving supportedDevices=[] and making
// pipeline() fail with "Unsupported device: cpu. Should be one of: .".
// Instead transformers uses its normal Node.js path (which registers 'cpu') and
// resolves require('onnxruntime-node') to this shim (i.e. onnxruntime-web/WASM).
const onnxNodeWasmPlugin = {
    name: 'onnxruntime-node-wasm',
    setup(build) {
        build.onResolve({ filter: /^onnxruntime-node$/ }, () => ({
            path: 'onnxruntime-node-wasm-shim',
            namespace: 'onnxruntime-node-wasm-shim'
        }));
        build.onLoad({ filter: /.*/, namespace: 'onnxruntime-node-wasm-shim' }, () => ({
            // Use the resolved absolute path so esbuild can locate and inline
            // onnxruntime-web without it being a direct dep of this package.
            //
            // Do NOT set globalThis[Symbol.for('onnxruntime')] here — doing so causes
            // @huggingface/transformers to skip its Node.js device registration branch
            // entirely, leaving supportedDevices=[] and making all device validation fail
            // (error: "Unsupported device: cpu. Should be one of: .").
            // Instead, let transformers run its normal IS_NODE_ENV path which registers
            // 'cpu' as a supported device — it will require('onnxruntime-node') which
            // esbuild aliases to onnxruntime-web (this shim), so the WASM backend is
            // used transparently.
            contents: [
                `const ort = require(${JSON.stringify(ortWebNodeEntry)});`,
                `if (!ort.env?.wasm) throw new Error('onnxruntime-web: env.wasm not available');`,
                // Use a file:// URL so onnxruntime-web can resolve WASM files on all
                // platforms — __dirname uses backslashes on Windows, which would break
                // the path-based lookup in the WASM loader.
                `ort.env.wasm.wasmPaths = require('url').pathToFileURL(__dirname).href + '/';`,
                `module.exports = ort;`
            ].join('\n'),
            loader: 'js',
            resolveDir: path.dirname(ortWebNodeEntry)
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
    sourcemap: isDev ? 'linked' : false,
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
    external: ['vscode'],
    plugins: [onnxNodeWasmPlugin, pkgJsonShimPlugin, sharpStubPlugin]
});

console.log('✓ esbuild bundle complete');

// ── Step 1b: rewrite @zowe/secrets-for-zowe-sdk require in bundle ────────────
// @sap-ux/store calls require('@zowe/secrets-for-zowe-sdk') at runtime via a
// createRequire-based dynamic require. esbuild inlines the string verbatim and
// cannot intercept it via onResolve. Post-process the bundle to replace every
// occurrence with an inline shim that loads the native keyring binary directly
// from dist/prebuilds/ — no node_modules lookup needed.
const ZOWE_SHIM = `(()=>{const{join:_j}=require("path"),{existsSync:_e}=require("fs");function _t(){switch(process.platform){case"win32":return"win32-"+process.arch+"-msvc";case"linux":{const m=process.report.getReport().header.glibcVersionRuntime==null,a=m?"musl":"gnu";return process.arch==="arm"?"linux-arm-"+a+"eabihf":"linux-"+process.arch+"-"+a;}default:return process.platform+"-"+process.arch;}}const _p=_j(__dirname,"prebuilds","keyring."+_t()+".node");if(!_e(_p))throw new Error("Zowe keyring native module not found: "+_p);const{deletePassword:dP,findCredentials:fC,findPassword:fP,getPassword:gP,setPassword:sP}=require(_p);return{keyring:{deletePassword:dP,findCredentials:fC,findPassword:fP,getPassword:gP,setPassword:sP}};})()`;

const bundleFile = path.join(DIST, 'index.js');
let bundleSource = fs.readFileSync(bundleFile, 'utf8');
const zowePattern = /\w+\(["']@zowe\/secrets-for-zowe-sdk["']\)/g;
const matchCount = (bundleSource.match(zowePattern) || []).length;
if (matchCount === 0) {
    throw new Error(
        'No require("@zowe/secrets-for-zowe-sdk") found in bundle — shim not applied. ' +
        'The bundle may have changed; update the zowePattern regex in bundle.mjs.'
    );
} else {
    bundleSource = bundleSource.replace(zowePattern, ZOWE_SHIM);
    fs.writeFileSync(bundleFile, bundleSource, 'utf8');
    console.log(`✓ Rewrote ${matchCount} @zowe/secrets-for-zowe-sdk require(s) to inline prebuilds shim`);
}

// ── Step 2: copy @zowe/secrets-for-zowe-sdk prebuilds ────────────────────────
// The inline shim (above) loads the native keyring binary directly from
// dist/prebuilds/ at runtime. Copy only the platform-specific prebuilds here;
// ia32 is excluded as Node 22 dropped ia32 Windows support.
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

// ── Step 3: copy embeddings data ─────────────────────────────────────────────

const embeddingsOut = path.join(DIST, 'data', 'embeddings');
copyDir(embeddingsDataDir, embeddingsOut);
console.log('✓ Copied embeddings data');

// ── Step 4: copy WASM runtime files ──────────────────────────────────────────
// onnxruntime-web's WASM backend needs three files alongside dist/index.js:
//
//   ort-wasm-simd-threaded.wasm  — the main ONNX WASM binary (~12 MB)
//   ort-wasm-simd-threaded.mjs   — WASM factory loaded by ort.node.min.mjs;
//                                  uses import.meta.url to locate the .wasm
//   ort-wasm-simd-threaded.jsep.mjs — JSEP factory used by transformers internally
//
// The shim sets env.wasm.wasmPaths = __dirname + '/' so onnxruntime-web resolves
// all three files relative to dist/.

for (const wasmFile of [
    'ort-wasm-simd-threaded.wasm',
    'ort-wasm-simd-threaded.mjs',
    'ort-wasm-simd-threaded.jsep.mjs'
]) {
    // Prefer onnxruntime-web's copy; fall back to the transformers dist copy
    const src = fs.existsSync(path.join(ortWebDistDir, wasmFile))
        ? path.join(ortWebDistDir, wasmFile)
        : path.join(hfDistDir, wasmFile);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(DIST, wasmFile));
        console.log(`✓ Copied ${wasmFile}`);
    } else {
        const msg = `⚠ WASM file not found: ${wasmFile}`;
        if (wasmFile.endsWith('.wasm')) {
            throw new Error(msg);
        }
        console.warn(msg);
    }
}

// ── Step 5: copy icons ────────────────────────────────────────────────────────

for (const icon of ['icon.png', 'icon.svg']) {
    fs.copyFileSync(path.join(PKG_ROOT, 'assets', icon), path.join(DIST, icon));
}
console.log('✓ Copied icons');

console.log('\nBuild complete. dist/ layout:');
for (const entry of fs.readdirSync(DIST)) {
    const stat = fs.statSync(path.join(DIST, entry));
    console.log(`  ${stat.isDirectory() ? '[dir]' : '     '} ${entry}`);
}
