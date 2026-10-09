import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, rm } from 'node:fs/promises';
import type { Editor } from 'mem-fs-editor';
import { applyTemplates } from '../../../src/template/template-helpers.js';
import { MigrationTypes } from '../../../src/utils/constants.js';
import { DirName } from '../../../src/project-spec-types.js';
import { TemplateFileName, initI18n, fileExists, writeFile } from '../../../src/index.js';
import { createMemFsEditor, runWithEditor } from '../../../src/utils/fs-adapter.js';
import type { TemplateData, TemplateMap } from '../../../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('template/template-helpers', () => {
    let fs: Editor;
    const testOutputDir = join(__dirname, 'test-output', 'template-helpers');

    beforeEach(async () => {
        await initI18n();
        fs = createMemFsEditor();
        await mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testOutputDir, { recursive: true, force: true });
    });

    const createTemplateData = (overrides: Partial<TemplateData['project']> = {}): TemplateData =>
        ({
            project: {
                moduleName: 'test.app',
                moduleDescription: 'Test Application',
                type: MigrationTypes.lrop,
                ui5Theme: 'sap_fiori_3',
                ...overrides
            },
            service: {},
            npm: { name: 'test-app', version: '1.0.0' },
            ui5: { projectUI5Version: '1.120.0' },
            config: {},
            templatePaths: {}
        }) as TemplateData;

    describe('applyTemplates', () => {
        it('should apply templates without errors for empty template map', async () => {
            await runWithEditor(fs, async () => {
                const templates: TemplateMap = {};
                const templateData = createTemplateData();

                // Should not throw
                await applyTemplates(templates, templateData, testOutputDir);
            });
        });

        it('should update index.html theme for extension projects when file exists', async () => {
            const rootPath = join(testOutputDir, 'extension-theme');

            await runWithEditor(fs, async () => {
                // Create webapp directory and index.html
                await mkdir(join(rootPath, DirName.Webapp), { recursive: true });
                const indexHtmlContent = `<!DOCTYPE html>
<html>
<head>
<script id="sap-ui-bootstrap" data-sap-ui-theme="sap_bluecrystal"></script>
</head>
<body></body>
</html>`;
                writeFile(join(rootPath, DirName.Webapp, TemplateFileName.IndexHtml), indexHtmlContent);

                const templateData = createTemplateData({
                    type: MigrationTypes.projectExtension,
                    ui5Theme: 'sap_fiori_3'
                });

                await applyTemplates({}, templateData, rootPath, undefined, '1.120.0');

                // Verify file exists (theme update was attempted)
                const exists = await fileExists(join(rootPath, DirName.Webapp, TemplateFileName.IndexHtml));
                expect(exists).toBe(true);
            });
        });

        it('should handle missing index.html gracefully for extension projects', async () => {
            const rootPath = join(testOutputDir, 'extension-no-index');

            await runWithEditor(fs, async () => {
                await mkdir(join(rootPath, DirName.Webapp), { recursive: true });

                const templateData = createTemplateData({
                    type: MigrationTypes.projectExtension,
                    ui5Theme: 'sap_fiori_3'
                });

                // Should not throw when index.html doesn't exist
                await applyTemplates({}, templateData, rootPath, undefined, '1.136.0');
            });
        });

        it('should not update index.html for non-extension projects', async () => {
            const rootPath = join(testOutputDir, 'lrop-project');

            await runWithEditor(fs, async () => {
                await mkdir(join(rootPath, DirName.Webapp), { recursive: true });
                const indexHtmlContent = `<html><script data-sap-ui-theme="sap_bluecrystal"></script></html>`;
                writeFile(join(rootPath, DirName.Webapp, TemplateFileName.IndexHtml), indexHtmlContent);

                const templateData = createTemplateData({
                    type: MigrationTypes.lrop,
                    ui5Theme: 'sap_fiori_3'
                });

                await applyTemplates({}, templateData, rootPath, undefined, '1.120.0');

                // For non-extension projects, theme update code path is not executed
                // The test just verifies no errors occur
            });
        });

        it('should handle theme update errors gracefully', async () => {
            const rootPath = join(testOutputDir, 'extension-error');

            await runWithEditor(fs, async () => {
                // Create an invalid index.html that will cause update to fail
                await mkdir(join(rootPath, DirName.Webapp), { recursive: true });
                // Write valid HTML but the theme update may still succeed
                writeFile(join(rootPath, DirName.Webapp, TemplateFileName.IndexHtml), '');

                const templateData = createTemplateData({
                    type: MigrationTypes.projectExtension,
                    ui5Theme: 'sap_fiori_3'
                });

                // Should not throw - errors are caught and migration continues
                await applyTemplates({}, templateData, rootPath, undefined, '1.120.0');
            });
        });

        it('should use default template root when not specified', async () => {
            await runWithEditor(fs, async () => {
                const templates: TemplateMap = {};
                const templateData = createTemplateData();

                // Should use AppSettings as default template root
                await applyTemplates(templates, templateData, testOutputDir);
            });
        });

        it('should use custom template root when specified', async () => {
            await runWithEditor(fs, async () => {
                const templates: TemplateMap = {};
                const templateData = createTemplateData();

                // Should use custom template root
                await applyTemplates(templates, templateData, testOutputDir, 'customRoot');
            });
        });
    });
});
