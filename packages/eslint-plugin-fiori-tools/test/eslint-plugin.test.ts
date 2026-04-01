import { ESLint } from 'eslint';
import { join } from 'node:path';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
// Import the plugin to use it directly
import * as plugin from '../src/index';

describe('ESLint Plugin Integration Tests', () => {
    const testProjectPath = join(__dirname, 'test-output', 'integration-test-project');
    const webappPath = join(testProjectPath, 'webapp');

    beforeAll(() => {
        // Create test project directory structure
        mkdirSync(webappPath, { recursive: true });

        // Create tsconfig.json for TypeScript linting
        const tsconfigContent = {
            'compilerOptions': {
                'target': 'es2022',
                'module': 'es2022',
                'skipLibCheck': true,
                'allowJs': true,
                'strict': true,
                'strictPropertyInitialization': false,
                'moduleResolution': 'node',
                'rootDir': './webapp',
                'outDir': './dist',
                'baseUrl': './',
                'paths': {
                    'nods1/*': ['./webapp/*']
                },
                'typeRoots': ['./node_modules/@types', './node_modules/@sapui5/types']
            },
            'include': ['./webapp/**/*']
        };
        writeFileSync(join(testProjectPath, 'tsconfig.json'), JSON.stringify(tsconfigContent, null, 2));

        // Create sample JS file with violations
        const sampleCode = `
sap.ui.define([
    "sap/ui/core/UIComponent"
], function(UIComponent) {
    "use strict";

    return UIComponent.extend("test.Component", {
        init: function() {
            // This should trigger sap-no-absolute-component-path
            var component = sap.ui.getCore().getComponent("absolute.path.Component");

            // This should trigger sap-no-localstorage
            localStorage.setItem("key", "value");

            // This should trigger sap-no-hardcoded-url
            var url = "https://example.com/api";

            UIComponent.prototype.init.apply(this, arguments);
        }
    });
});
`;
        writeFileSync(join(webappPath, 'Component.js'), sampleCode);

        // Create a TypeScript file
        const sampleTsCode = `
import UIComponent from "sap/ui/core/UIComponent";

export default class Component extends UIComponent {
    public init(): void {
        // This should trigger sap-no-sessionstorage
        sessionStorage.setItem("key", "value");

        super.init();
    }
}
`;
        writeFileSync(join(webappPath, 'Component.ts'), sampleTsCode);
    });

    afterAll(() => {
        // Clean up test directory
        rmSync(testProjectPath, { recursive: true, force: true });
    });

    test('plugin loads successfully and can lint JavaScript files', async () => {
        const eslint = new ESLint({
            cwd: testProjectPath,
            overrideConfigFile: true,
            overrideConfig: plugin.configs.recommended
        });

        const results = await eslint.lintFiles([join(webappPath, 'Component.js')]);

        // Verify linting completed without errors
        expect(results).toBeDefined();
        expect(results.length).toBeGreaterThan(0);

        const result = results[0];

        // Verify the file was linted
        expect(result.filePath).toContain('Component.js');

        // Verify violations were detected
        expect(result.messages.length).toBeGreaterThan(0);

        // Check for specific rule violations
        const ruleIds = result.messages.map((msg) => msg.ruleId);
        expect(ruleIds).toContain('@sap-ux/fiori-tools/sap-no-localstorage');
        expect(ruleIds).toContain('@sap-ux/fiori-tools/sap-no-hardcoded-url');
    });

    test('plugin can lint TypeScript files', async () => {
        const eslint = new ESLint({
            cwd: testProjectPath,
            overrideConfigFile: true,
            overrideConfig: plugin.configs.recommended
        });

        const results = await eslint.lintFiles([join(webappPath, 'Component.ts')]);

        expect(results).toBeDefined();
        expect(results.length).toBeGreaterThan(0);

        const result = results[0];
        expect(result.filePath).toContain('Component.ts');

        // Verify violations were detected
        expect(result.messages.length).toBeGreaterThan(0);
        const ruleIds = result.messages.map((msg) => msg.ruleId);
        expect(ruleIds).toContain('@sap-ux/fiori-tools/sap-no-sessionstorage');
    });

    test('plugin registers correctly with ESLint', async () => {
        const eslint = new ESLint({
            cwd: testProjectPath,
            overrideConfigFile: true,
            overrideConfig: plugin.configs.recommended
        });

        // This should not throw an error about plugin not found
        await expect(eslint.lintFiles([join(webappPath, 'Component.js')])).resolves.toBeDefined();
    });

    test('recommended config includes plugin registration', async () => {
        // Verify configs exist
        expect(plugin.configs).toBeDefined();
        expect(plugin.configs.recommended).toBeDefined();

        // Verify the first config item registers the plugin
        const firstConfig = plugin.configs.recommended[0];
        expect(firstConfig.plugins).toBeDefined();
        expect(firstConfig.plugins?.['@sap-ux/fiori-tools']).toBeDefined();

        // Verify plugin has meta and rules
        const pluginDef = firstConfig.plugins?.['@sap-ux/fiori-tools'];
        expect(pluginDef?.meta).toBeDefined();
        expect(pluginDef?.rules).toBeDefined();
    });

    test('recommended-for-s4hana config exists and includes plugin registration', async () => {
        // Verify recommended-for-s4hana config exists
        expect(plugin.configs['recommended-for-s4hana']).toBeDefined();

        // Verify the first config item registers the plugin
        const firstConfig = plugin.configs['recommended-for-s4hana'][0];
        expect(firstConfig.plugins).toBeDefined();
        expect(firstConfig.plugins?.['@sap-ux/fiori-tools']).toBeDefined();

        // Verify plugin has meta, languages, and rules
        const pluginDef = firstConfig.plugins?.['@sap-ux/fiori-tools'];
        expect(pluginDef?.meta).toBeDefined();
        expect(pluginDef?.languages).toBeDefined();
        expect(pluginDef?.rules).toBeDefined();
    });

    test('recommended-for-s4hana config applies ESLint recommended rules as warnings', async () => {
        const eslint = new ESLint({
            cwd: testProjectPath,
            overrideConfigFile: true,
            overrideConfig: plugin.configs['recommended-for-s4hana']
        });

        // Create a file with standard ESLint violations (e.g., no-undef)
        const codeWithViolations = `
sap.ui.define([], function() {
    "use strict";

    // This should trigger no-undef as warning (not error) in S/4HANA config
    undefinedVariable = 123;

    return {};
});
`;
        writeFileSync(join(webappPath, 'ViolationTest.js'), codeWithViolations);

        const results = await eslint.lintFiles([join(webappPath, 'ViolationTest.js')]);
        expect(results).toBeDefined();
        expect(results.length).toBeGreaterThan(0);

        const result = results[0];
        const noUndefMessages = result.messages.filter((msg) => msg.ruleId === 'no-undef');

        // Verify that no-undef violations exist and have severity 1 (warning) not 2 (error)
        expect(noUndefMessages[0].severity).toBe(1); // 1 = warning
    });

    test('recommended-for-s4hana config includes fiori language configuration', async () => {
        // Verify that recommended-for-s4hana includes a config for manifest.json, xml, and cds files
        const s4hanaConfig = plugin.configs['recommended-for-s4hana'];

        // Find the config that specifies fiori language
        const fioriLanguageConfig = s4hanaConfig.find((config) => config.language === '@sap-ux/fiori-tools/fiori');

        expect(fioriLanguageConfig).toBeDefined();
        expect(fioriLanguageConfig?.files).toBeDefined();

        // Verify it includes manifest.json, xml, and cds files
        const files = fioriLanguageConfig?.files;
        expect(files).toContain('**/manifest.json');
        expect(files).toContain('**/*.xml');
        expect(files).toContain('**/*.cds');

        // Verify it includes fiori-specific rules
        const rules = fioriLanguageConfig?.rules;
        expect(rules).toBeDefined();
        expect(rules?.['@sap-ux/fiori-tools/sap-anchor-bar-visible']).toBe('warn');
        expect(rules?.['@sap-ux/fiori-tools/sap-condensed-table-layout']).toBe('warn');
        expect(rules?.['@sap-ux/fiori-tools/sap-flex-enabled']).toBe('warn');
    });

    test('baseFioriToolsRules are applied in both recommended and recommended-for-s4hana configs', async () => {
        const recommendedConfig = plugin.configs.recommended;
        const s4hanaConfig = plugin.configs['recommended-for-s4hana'];

        // Find configs that have rules containing fiori-tools rules
        const recommendedConfigsWithRules = recommendedConfig.filter((config) => {
            const rules = config.rules;
            if (!rules) {
                return false;
            }
            return Object.keys(rules).some((key) => key.includes('@sap-ux/fiori-tools'));
        });

        const s4hanaConfigsWithRules = s4hanaConfig.filter((config) => {
            const rules = config.rules;
            if (!rules) {
                return false;
            }
            return Object.keys(rules).some((key) => key.includes('@sap-ux/fiori-tools'));
        });

        expect(recommendedConfigsWithRules.length).toBeGreaterThan(0);
        expect(s4hanaConfigsWithRules.length).toBeGreaterThan(0);

        // Verify both configs include shared Fiori Tools rules
        const sharedRule = '@sap-ux/fiori-tools/sap-no-localstorage';
        const recommendedHasRule = recommendedConfigsWithRules.some((config) => config.rules?.[sharedRule]);
        const s4hanaHasRule = s4hanaConfigsWithRules.some((config) => config.rules?.[sharedRule]);

        expect(recommendedHasRule).toBe(true);
        expect(s4hanaHasRule).toBe(true);
    });

    test('recommended-for-s4hana config ignores mockserver.js in localService directory', async () => {
        // Create localService directory
        const localServicePath = join(webappPath, 'localService');
        mkdirSync(localServicePath, { recursive: true });

        // Create mockserver.js file with violations
        const mockserverCode = `
sap.ui.define([], function() {
    "use strict";

    // This should trigger sap-no-localstorage if not ignored
    localStorage.setItem("mock", "data");

    return {};
});
`;

        writeFileSync(join(localServicePath, 'mockserver.js'), mockserverCode);

        // Create custom extension file that should be linted
        const customExtensionCode = `
sap.ui.define([], function() {
    "use strict";

    // This should trigger sap-no-localstorage and be reported
    localStorage.setItem("custom", "data");

    return {};
});
`;

        writeFileSync(join(localServicePath, 'customExtension.js'), customExtensionCode);

        const eslint = new ESLint({
            cwd: testProjectPath,
            overrideConfigFile: true,
            overrideConfig: plugin.configs['recommended-for-s4hana']
        });

        // Lint all files in webapp
        const results = await eslint.lintFiles([join(webappPath, '**/*.js')]);

        // Normalize paths for cross-platform comparison (use forward slashes)
        const normalizePathForComparison = (filePath: string) => filePath.replace(/\\/g, '/');

        // Find results for each file
        const mockserverResult = results.find((r) =>
            normalizePathForComparison(r.filePath).includes('localService/mockserver.js')
        );

        // mockserver.js should have no violations (it should be ignored)
        expect(mockserverResult?.messages.length).toBe(0);

        const customExtensionResult = results.find((r) =>
            normalizePathForComparison(r.filePath).includes('localService/customExtension.js')
        );
        // custom extension file should have violations
        expect(customExtensionResult?.messages.length).toBeGreaterThan(0);

        // Ensure the test validated something - at minimum, we should have Component.js violations
        expect(results.length).toBeGreaterThan(0);
        const hasComponentViolations = results.some(
            (r) => normalizePathForComparison(r.filePath).includes('Component.js') && r.messages.length > 0
        );
        expect(hasComponentViolations).toBe(true);
    });
});
