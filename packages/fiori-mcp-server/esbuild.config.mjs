/**
 * esbuild configuration for fiori-mcp-server
 *
 * Key decisions:
 * - Bundle semantic-search: Yes, it's a pure JS/TS package
 * - Keep onnxruntime-web external: Has WASM binaries that must be loaded at runtime
 * - Keep fiori-docs-embeddings external: Uses import.meta.url for path resolution
 * - Code splitting for search functionality: Lazy load search to reduce startup time
 */
import * as esbuild from 'esbuild';
import { readFileSync } from 'node:fs';

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
    // - fiori-docs-embeddings: Uses import.meta.url for path resolution to data files
    external: [
        'vscode',
        'onnxruntime-web',
        '@sap-ux/fiori-docs-embeddings'
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

    // Banner for the output
    banner: {
        js: '#!/usr/bin/env node\n// @sap-ux/fiori-mcp-server - SAP Fiori MCP Server'
    },

    // Log level
    logLevel: 'info'
};

// Build
esbuild.build(buildOptions).catch(() => process.exit(1));
