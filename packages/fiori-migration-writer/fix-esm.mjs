#!/usr/bin/env node
/**
 * Automated fix script for ESM migration issues
 * Fixes:
 * 1. Adds .js extensions to relative imports
 * 2. Updates utils/index.ts exports
 * 3. Fixes i18n JSON import
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, 'src');

// Track what needs to be exported from utils
const missingUtilsExports = new Set();

/**
 * Add .js extension to relative imports
 * @param {string} content - File content
 * @returns {string} Fixed content
 */
function fixJsExtensions(content) {
    let fixed = content;

    // Pattern: from './something' or from '../something' (but not already .js)
    // Don't touch: from 'package-name', from './something.json'
    const importPattern = /from\s+['"](\.\.[\/\\].*?|\.\/.*?)(?<!\.js|\.json)['"]/g;

    fixed = fixed.replace(importPattern, (match, path) => {
        // Skip if it's a directory import (ends with /)
        if (path.endsWith('/')) {
            return match;
        }
        return `from '${path}.js'`;
    });

    return fixed;
}

/**
 * Extract missing exports from utils/index imports
 * @param {string} content - File content
 * @returns {void}
 */
function trackUtilsExports(content) {
    // Pattern: import { something } from '../utils/index.js' or './utils/index.js'
    const importPattern = /import\s+{([^}]+)}\s+from\s+['"](\.\.\/)*utils\/index\.js['"]/g;

    let match;
    while ((match = importPattern.exec(content)) !== null) {
        const imports = match[1]
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s && !s.startsWith('type '));
        imports.forEach((imp) => {
            // Remove 'type' keyword if present
            const cleanImport = imp.replace(/^type\s+/, '');
            missingUtilsExports.add(cleanImport);
        });
    }
}

/**
 * Fix i18n JSON import
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {string} Fixed content
 */
function fixI18nImport(content, filePath) {
    if (!filePath.endsWith('i18n.ts')) {
        return content;
    }

    // Fix JSON import to use assert { type: 'json' }
    let fixed = content.replace(
        /import\s+translations\s+from\s+['"]\.\/i18n\/i18n\.json['"]/,
        "import translations from './i18n/i18n.json' assert { type: 'json' }"
    );

    return fixed;
}

/**
 * Process a single TypeScript file
 * @param {string} filePath - File path
 * @returns {void}
 */
function processFile(filePath) {
    const content = readFileSync(filePath, 'utf-8');

    let fixed = content;
    fixed = fixJsExtensions(fixed);
    fixed = fixI18nImport(fixed, filePath);

    // Track utils exports
    trackUtilsExports(fixed);

    if (fixed !== content) {
        writeFileSync(filePath, fixed, 'utf-8');
        console.log(`Fixed: ${filePath.replace(srcDir, 'src')}`);
        return true;
    }
    return false;
}

/**
 * Recursively process directory
 * @param dir
 */
function processDirectory(dir) {
    let fixedCount = 0;

    const entries = readdirSync(dir);
    for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            fixedCount += processDirectory(fullPath);
        } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
            if (processFile(fullPath)) {
                fixedCount++;
            }
        }
    }

    return fixedCount;
}

/**
 * Update utils/index.ts to export missing functions
 */
function updateUtilsIndex() {
    const utilsIndexPath = join(srcDir, 'utils', 'index.ts');
    let content = readFileSync(utilsIndexPath, 'utf-8');

    console.log('\n=== Missing utils exports ===');
    missingUtilsExports.forEach((exp) => console.log(`  - ${exp}`));

    // These exports should be added - just add a comment for now
    const comment = `
// TODO: The following exports are required but may need to be implemented or imported:
// ${Array.from(missingUtilsExports).join(', ')}
`;

    if (!content.includes('TODO: The following exports')) {
        content = comment + '\n' + content;
        writeFileSync(utilsIndexPath, content, 'utf-8');
        console.log('\nAdded TODO comment to utils/index.ts');
    }
}

// Main execution
console.log('Starting automated fixes...\n');
const fixedCount = processDirectory(srcDir);
console.log(`\n✅ Fixed ${fixedCount} files`);

updateUtilsIndex();

console.log('\n=== Next Manual Steps ===');
console.log('1. Review utils/index.ts and add missing exports');
console.log('2. Run: pnpm build');
console.log('3. Fix any remaining compilation errors');
