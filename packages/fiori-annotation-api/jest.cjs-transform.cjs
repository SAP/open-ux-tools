/**
 * CJS-output transformer for workspace dist .js files.
 * Converts ESM syntax to CJS and handles import.meta.url.
 */
const { TsJestTransformer } = require('ts-jest');

class CjsDistTransformer extends TsJestTransformer {
    constructor() {
        super({
            useESM: false,
            tsconfig: {
                allowJs: true,
                module: 'CommonJS',
                moduleResolution: 'Node',
                isolatedModules: true,
                esModuleInterop: true,
                target: 'ES2021'
            },
            diagnostics: false
        });
    }

    process(sourceText, sourcePath, options) {
        const result = super.process(sourceText, sourcePath, options);
        let code = typeof result === 'string' ? result : result.code;

        // Replace import.meta.url with CJS equivalent
        if (code.includes('import.meta.url')) {
            code = code.replace(/import\.meta\.url/g, 'require("url").pathToFileURL(__filename).href');
        }
        // Replace remaining import.meta references
        if (code.includes('import.meta')) {
            code = code.replace(/import\.meta/g, '({ url: require("url").pathToFileURL(__filename).href })');
        }

        if (typeof result === 'string') return code;
        return { ...result, code };
    }
}

module.exports = new CjsDistTransformer();
