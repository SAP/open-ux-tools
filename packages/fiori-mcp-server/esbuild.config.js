const { build } = require('esbuild');

const baseConfig = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outdir: 'dist',
    external: ['vscode', '@lancedb/lancedb', '@xenova/transformers', '@sap-ux/fiori-docs-embeddings'],
    mainFields: ['module', 'main'],
    loader: {
        '.md': 'text'
    }
};

const isDev = process.argv.includes('--dev');
const isProd = process.argv.includes('--minify');

build({
    ...baseConfig,
    sourcemap: isDev ? 'inline' : false,
    minify: isProd
}).catch(() => process.exit(1));
