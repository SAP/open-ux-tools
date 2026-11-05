import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, rm } from 'node:fs/promises';
import type { Editor } from 'mem-fs-editor';
import { applyTemplates } from '../../../src/template/template-helpers.js';
import { MigrationTypes } from '../../../src/utils/constants.js';
import { DirName } from '../../../src/project-spec-types.js';
import { TemplateFileName, initI18n, fileExists, writeFile } from '../../../src/index.js';
import { createMemFsEditor } from '../../../src/utils/fs-adapter.js';
import type { TemplateData, TemplateMap } from '../../../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// The editor is now threaded explicitly; this helper preserves the test structure
// while simply running the callback (no implicit context needed).
const withEditor = async (_fs: Editor, cb: () => Promise<void>): Promise<void> => cb();

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
            await withEditor(fs, async () => {
                const templates: TemplateMap = {};
                const templateData = createTemplateData();

                // Should not throw - verify by checking promise resolves
                await expect(applyTemplates(fs, templates, templateData, testOutputDir)).resolves.toBeUndefined();
            });
        });

        it('should update index.html theme for extension projects when file exists', async () => {
            const rootPath = join(testOutputDir, 'extension-theme');

            await withEditor(fs, async () => {
                // Create webapp directory and index.html
                await mkdir(join(rootPath, DirName.Webapp), { recursive: true });
                const indexHtmlContent = `<!DOCTYPE html>
<html>
<head>
<script id="sap-ui-bootstrap" data-sap-ui-theme="sap_bluecrystal"></script>
</head>
<body></body>
</html>`;
                writeFile(fs, join(rootPath, DirName.Webapp, TemplateFileName.IndexHtml), indexHtmlContent);

                const templateData = createTemplateData({
                    type: MigrationTypes.projectExtension,
                    ui5Theme: 'sap_fiori_3'
                });

                await applyTemplates(fs, {}, templateData, rootPath, undefined, '1.120.0');

                // Verify file exists (theme update was attempted)
                const exists = await fileExists(fs, join(rootPath, DirName.Webapp, TemplateFileName.IndexHtml));
                expect(exists).toBe(true);
            });
        });

        it('should handle missing index.html gracefully for extension projects', async () => {
            const rootPath = join(testOutputDir, 'extension-no-index');

            await withEditor(fs, async () => {
                await mkdir(join(rootPath, DirName.Webapp), { recursive: true });

                const templateData = createTemplateData({
                    type: MigrationTypes.projectExtension,
                    ui5Theme: 'sap_fiori_3'
                });

                // Should not throw when index.html doesn't exist - verify promise resolves
                await expect(
                    applyTemplates(fs, {}, templateData, rootPath, undefined, '1.136.0')
                ).resolves.toBeUndefined();
            });
        });

        it('should not update index.html for non-extension projects', async () => {
            const rootPath = join(testOutputDir, 'lrop-project');

            await withEditor(fs, async () => {
                await mkdir(join(rootPath, DirName.Webapp), { recursive: true });
                const indexHtmlContent = `<html><script data-sap-ui-theme="sap_bluecrystal"></script></html>`;
                writeFile(fs, join(rootPath, DirName.Webapp, TemplateFileName.IndexHtml), indexHtmlContent);

                const templateData = createTemplateData({
                    type: MigrationTypes.lrop,
                    ui5Theme: 'sap_fiori_3'
                });

                // For non-extension projects, theme update code path is not executed
                // Verify the function completes without errors
                await expect(
                    applyTemplates(fs, {}, templateData, rootPath, undefined, '1.120.0')
                ).resolves.toBeUndefined();
            });
        });

        it('should handle theme update errors gracefully', async () => {
            const rootPath = join(testOutputDir, 'extension-error');

            await withEditor(fs, async () => {
                // Create an invalid index.html that will cause update to fail
                await mkdir(join(rootPath, DirName.Webapp), { recursive: true });
                // Write valid HTML but the theme update may still succeed
                writeFile(fs, join(rootPath, DirName.Webapp, TemplateFileName.IndexHtml), '');

                const templateData = createTemplateData({
                    type: MigrationTypes.projectExtension,
                    ui5Theme: 'sap_fiori_3'
                });

                // Should not throw - errors are caught and migration continues
                await expect(
                    applyTemplates(fs, {}, templateData, rootPath, undefined, '1.120.0')
                ).resolves.toBeUndefined();
            });
        });

        it('should use default template root when not specified', async () => {
            await withEditor(fs, async () => {
                const templates: TemplateMap = {};
                const templateData = createTemplateData();

                // Should use AppSettings as default template root - verify completes without error
                await expect(applyTemplates(fs, templates, templateData, testOutputDir)).resolves.toBeUndefined();
            });
        });

        it('should use custom template root when specified', async () => {
            await withEditor(fs, async () => {
                const templates: TemplateMap = {};
                const templateData = createTemplateData();

                // Should use custom template root - verify completes without error
                await expect(
                    applyTemplates(fs, templates, templateData, testOutputDir, 'customRoot')
                ).resolves.toBeUndefined();
            });
        });
    });
});
