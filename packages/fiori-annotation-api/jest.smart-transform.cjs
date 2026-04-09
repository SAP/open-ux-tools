/**
 * Smart transformer for fiori-annotation-api tests.
 * 
 * - .ts files: use ts-jest ESM transformer (normal path)
 * - .js/.mjs files (workspace dist): convert ESM syntax to CJS directly
 *   without TypeScript compiler to avoid "Identifier 'require' already declared" errors
 */
const { TsJestTransformer } = require('ts-jest');
const crypto = require('crypto');

const esmTransformer = new TsJestTransformer({
    useESM: true,
    tsconfig: {
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        isolatedModules: true
    },
    diagnostics: {
        ignoreCodes: [151001]
    }
});

/**
 * Convert ESM JavaScript to CJS JavaScript using regex.
 */
function esmToCjs(code) {
    let result = code;

    // PHASE 0: Handle createRequire(import.meta.url) pattern
    // In CJS context, require is already available, so we just remove the createRequire setup.
    // Must happen BEFORE import.meta.url replacement.
    result = result.replace(/^const\s+require\s*=\s*createRequire\s*\(\s*import\.meta\.url\s*\)\s*;?\s*$/gm, '// createRequire removed - require is native in CJS');
    result = result.replace(/^import\s+\{\s*createRequire\s*\}\s*from\s+['"]node:module['"];?\s*$/gm, '// createRequire import removed');

    // PHASE 1: Replace import.meta
    result = result.replace(/import\.meta\.url/g, 'require("url").pathToFileURL(__filename).href');
    result = result.replace(/import\.meta/g, '({ url: require("url").pathToFileURL(__filename).href })');

    // PHASE 2: Collect exports
    const exportNames = [];

    // export { Foo, Bar } from 'module' or export { Foo, Bar }
    result = result.replace(/^export\s*\{([^}]+)\}\s*(?:from\s*(['"][^'"]+['"]))?\s*;?$/gm, (match, names, from) => {
        const items = names.split(',').map(s => s.trim()).filter(Boolean);
        if (from) {
            const tempVar = '_reexport_' + Math.random().toString(36).slice(2, 8);
            const lines = [`const ${tempVar} = require(${from});`];
            for (const item of items) {
                const parts = item.split(/\s+as\s+/);
                const source = parts[0].trim();
                const target = (parts[1] || parts[0]).trim();
                if (target === 'default') {
                    lines.push(`Object.defineProperty(exports, "default", { enumerable: true, get() { return ${tempVar}.${source}; } });`);
                } else {
                    exportNames.push(target);
                    lines.push(`const ${target} = ${tempVar}.${source};`);
                }
            }
            return lines.join('\n');
        } else {
            for (const item of items) {
                const parts = item.split(/\s+as\s+/);
                const source = parts[0].trim();
                const target = (parts[1] || parts[0]).trim();
                if (target === 'default') {
                    exportNames.push('__default__:' + source);
                } else {
                    exportNames.push(target);
                }
            }
            return '';
        }
    });

    // export * from 'module'
    result = result.replace(/^export\s+\*\s+from\s+(['"][^'"]+['"]);?$/gm, (match, mod) => {
        const tmpVar = '_star_' + Math.random().toString(36).slice(2, 8);
        return `const ${tmpVar} = require(${mod});\nObject.keys(${tmpVar}).forEach(k => { if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, { enumerable: true, get() { return ${tmpVar}[k]; } }); });`;
    });

    // export * as name from 'module'
    result = result.replace(/^export\s+\*\s+as\s+(\w+)\s+from\s+(['"][^'"]+['"]);?$/gm, (match, name, mod) => {
        exportNames.push(name);
        return `const ${name} = require(${mod});`;
    });

    // export default <expression>
    result = result.replace(/^export\s+default\s+/gm, 'exports.default = ');

    // export async function name
    result = result.replace(/^export\s+async\s+function\s+(\w+)/gm, (match, name) => {
        exportNames.push(name);
        return `async function ${name}`;
    });

    // export function name
    result = result.replace(/^export\s+function\s+(\w+)/gm, (match, name) => {
        exportNames.push(name);
        return `function ${name}`;
    });

    // export class name
    result = result.replace(/^export\s+class\s+(\w+)/gm, (match, name) => {
        exportNames.push(name);
        return `class ${name}`;
    });

    // export const/let/var name
    result = result.replace(/^export\s+(const|let|var)\s+(\w+)/gm, (match, kind, name) => {
        exportNames.push(name);
        return `${kind} ${name}`;
    });

    // PHASE 3: Convert imports (most specific first)

    // Side-effect imports: import 'module'
    result = result.replace(/^import\s+(['"][^'"]+['"]);?$/gm, (match, mod) => {
        return `require(${mod});`;
    });

    // Namespace imports: import * as name from 'module'
    result = result.replace(/^import\s+\*\s+as\s+(\w+)\s+from\s+(['"][^'"]+['"]);?$/gm, (match, name, mod) => {
        return `const ${name} = require(${mod});`;
    });

    // Default + named: import def, { a, b } from 'module'
    result = result.replace(/^import\s+(\w+)\s*,\s*\{([^}]+)\}\s*from\s+(['"][^'"]+['"]);?$/gm, (match, def, named, mod) => {
        const tmpVar = '_mod_' + def;
        const names = named.split(',').map(s => s.trim()).filter(Boolean);
        const destructured = names.map(n => {
            const parts = n.split(/\s+as\s+/);
            return parts.length > 1 ? `${parts[0].trim()}: ${parts[1].trim()}` : parts[0].trim();
        }).join(', ');
        return `const ${tmpVar} = require(${mod});\nconst ${def} = ${tmpVar}.default || ${tmpVar};\nconst { ${destructured} } = ${tmpVar};`;
    });

    // Named imports: import { a, b \n c, d } from 'module' (may span multiple lines)
    // First handle single-line
    result = result.replace(/^import\s+\{([^}]+)\}\s*from\s+(['"][^'"]+['"]);?$/gm, (match, named, mod) => {
        const names = named.split(',').map(s => s.trim()).filter(Boolean);
        const destructured = names.map(n => {
            const parts = n.split(/\s+as\s+/);
            return parts.length > 1 ? `${parts[0].trim()}: ${parts[1].trim()}` : parts[0].trim();
        }).join(', ');
        return `const { ${destructured} } = require(${mod});`;
    });

    // Default import: import name from 'module'
    result = result.replace(/^import\s+(\w+)\s+from\s+(['"][^'"]+['"]);?$/gm, (match, name, mod) => {
        return `const _imp_${name} = require(${mod});\nconst ${name} = _imp_${name} && _imp_${name}.__esModule ? _imp_${name}.default : _imp_${name};`;
    });

    // PHASE 4: Add named exports at end
    if (exportNames.length > 0) {
        const exportLines = exportNames.map(n => {
            if (n.startsWith('__default__:')) {
                const source = n.slice('__default__:'.length);
                return `Object.defineProperty(exports, "default", { enumerable: true, get() { return ${source}; } });`;
            }
            return `Object.defineProperty(exports, "${n}", { enumerable: true, get() { return ${n}; } });`;
        });
        result += '\n' + exportLines.join('\n');
    }

    // PHASE 5: Prepend CJS boilerplate
    result = '"use strict";\nObject.defineProperty(exports, "__esModule", { value: true });\n' + result;

    return result;
}

module.exports = {
    process(sourceText, sourcePath, options) {
        const isJs = sourcePath.endsWith('.js') || sourcePath.endsWith('.mjs');
        if (isJs) {
            const code = esmToCjs(sourceText);
            return { code };
        }
        return esmTransformer.process(sourceText, sourcePath, options);
    },

    getCacheKey(sourceText, sourcePath, options) {
        if (sourcePath.endsWith('.js') || sourcePath.endsWith('.mjs')) {
            return 'cjs-regex-v3:' + crypto.createHash('md5').update(sourceText).digest('hex');
        }
        return 'esm:' + esmTransformer.getCacheKey(sourceText, sourcePath, options);
    }
};
