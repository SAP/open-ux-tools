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
});
