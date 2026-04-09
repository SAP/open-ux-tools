// Custom Jest transformer that converts JSON files to ESM modules with named exports
import { readFileSync } from 'fs';

export default {
    process(sourceText, sourcePath) {
        const json = JSON.parse(sourceText);
        // Generate named exports for top-level keys and a default export
        const namedExports = Object.keys(json)
            .map((key) => `export const ${key} = ${JSON.stringify(json[key])};`)
            .join('\n');
        return {
            code: `${namedExports}\nexport default ${JSON.stringify(json)};`
        };
    }
};
