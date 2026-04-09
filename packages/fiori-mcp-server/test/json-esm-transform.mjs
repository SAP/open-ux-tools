/**
 * Custom Jest transform for JSON files in ESM mode.
 * Converts JSON to ES module with named exports + default export,
 * so `import { version } from './package.json'` and
 * `import packageJson from './package.json'` both work.
 */
export default {
    process(sourceText) {
        const json = JSON.parse(sourceText);
        const namedExports = Object.entries(json)
            .filter(([key]) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key))
            .map(([key, value]) => `export const ${key} = ${JSON.stringify(value)};`)
            .join('\n');
        return {
            code: `${namedExports}\nexport default ${JSON.stringify(json)};`
        };
    }
};
