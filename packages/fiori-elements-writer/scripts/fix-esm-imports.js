/**
 * Post-build script to add .js extensions to relative imports in compiled ESM output.
 * TypeScript with module: "ESNext" and moduleResolution: "node" does not add .js extensions,
 * but Node.js ESM requires explicit file extensions for relative imports.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '..', 'dist');

function walkDir(dir) {
    let files = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(walkDir(fullPath));
        } else if (entry.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    return files;
}

const jsFiles = walkDir(distDir);

for (const file of jsFiles) {
    let content = readFileSync(file, 'utf8');
    const originalContent = content;

    content = content.replace(
        /((?:import|export)\s+(?:[^;]*?\s+from\s+|)['"])(\.\.?(?:\/[^'"]*)?)(['"])/g,
        (match, prefix, importPath, suffix) => {
            if (/\.(js|json|mjs|cjs)$/.test(importPath)) {
                return match;
            }

            const fileDir = dirname(file);
            const resolvedDir = resolve(fileDir, importPath);
            const resolvedFile = resolve(fileDir, importPath + '.js');

            if (existsSync(resolvedDir) && statSync(resolvedDir).isDirectory() && existsSync(join(resolvedDir, 'index.js'))) {
                const sep = importPath.endsWith('/') ? '' : '/';
                return prefix + importPath + sep + 'index.js' + suffix;
            } else if (existsSync(resolvedFile)) {
                return prefix + importPath + '.js' + suffix;
            }

            return match;
        }
    );

    if (content !== originalContent) {
        writeFileSync(file, content);
    }
}
