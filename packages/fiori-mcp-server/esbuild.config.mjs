/**
 * esbuild configuration for fiori-mcp-server
 *
 * Key decisions:
 * - Bundle semantic-search: Yes, it's a pure JS/TS package
 * - Bundle fiori-docs-embeddings: Code is bundled, data files are copied to dist/data
 * - Keep onnxruntime-web external: Has WASM binaries that must be loaded at runtime
 */
import * as esbuild from 'esbuild';
import { readFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const isProduction = process.argv.includes('--minify');
const isDev = process.argv.includes('--dev');

// Read package.json to get the version
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

/** @type {esbuild.BuildOptions} */
const buildOptions = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outdir: 'dist',
    mainFields: ['module', 'main'],

    // Keep these external - they have special runtime requirements:
    // - vscode: VSCode extension API
    // - onnxruntime-web: Has WASM binaries loaded at runtime
    external: [
        'vscode',
        'onnxruntime-web'
    ],

    // Code splitting for better startup performance
    // Search functionality is loaded on-demand
    splitting: false, // CJS doesn't support splitting, would need ESM

    // Minify in production
    minify: isProduction,

    // Source maps for dev
    sourcemap: isDev ? 'inline' : false,

    // Define build-time constants
    define: {
        'process.env.PACKAGE_VERSION': JSON.stringify(pkg.version)
    },

    // Banner for the output (shebang is already in src/index.ts)
    banner: {
        js: '// @sap-ux/fiori-mcp-server - SAP Fiori MCP Server'
    },

    // Log level
    logLevel: 'info'
};

// Build
esbuild.build(buildOptions).then(() => {
    // Copy only embeddings data from fiori-docs-embeddings package
    const embeddingsSrc = resolve(__dirname, '../fiori-docs-embeddings/data/embeddings');
    const embeddingsDest = resolve(__dirname, 'dist/data/embeddings');

    if (existsSync(embeddingsSrc)) {
        mkdirSync(embeddingsDest, { recursive: true });
        cpSync(embeddingsSrc, embeddingsDest, { recursive: true });
        console.log('✓ Copied embeddings data to dist/data/embeddings');
    } else {
        console.warn('⚠️ Embeddings data not found at', embeddingsSrc);
    }
}).catch(() => process.exit(1));
