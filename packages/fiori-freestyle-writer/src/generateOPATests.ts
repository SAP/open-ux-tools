import { generateFreestyleOPAFiles } from '@sap-ux/ui5-test-writer';
import type { Package } from '@sap-ux/ui5-application-writer';
import type { FreestyleApp, BasicAppSettings } from './types';
import { TemplateType } from './types';
import type { Logger } from '@sap-ux/logger';
import type { Editor } from 'mem-fs-editor';
import { t } from './i18n';

/**
 * Adds test scripts to the package.json object.
 *
 * @param {Package} packageJson - The package.json object to update.
 * @param {boolean} addMock - Whether to include the UI5 mock YAML configuration.
 */
function addTestScripts(packageJson: Package, addMock: boolean): void {
    // Note: 'ui5MockYamlScript' is empty when no data source is selected.
    const ui5MockYamlScript = addMock ? '--config ./ui5-mock.yaml ' : '';
    packageJson.scripts = {
        ...packageJson.scripts,
        'unit-test': `fiori run ${ui5MockYamlScript}--open test/unit/unitTests.qunit.html`,
        'int-test': `fiori run ${ui5MockYamlScript}--open test/integration/opaTests.qunit.html`
    };
}

/**
 * Generates OPA tests for a freestyle application.
 *
 * @param {string} basePath - The base directory path.
 * @param {FreestyleApp} ffApp - The freestyle application configuration.
 * @param {boolean} addMock - Whether to include the UI5 mock YAML configuration.
 * @param {Package} packageJson - The package.json object to update.
 * @param {Editor} [fs] - Optional file system editor instance.
 * @param {Logger} [log] - Optional logger instance.
 * @returns {Promise<Editor>} - The modified file system editor.
 */
export async function generateOPATests<T>(
    basePath: string,
    ffApp: FreestyleApp<T>,
    addMock: boolean,
    packageJson: Package,
    fs?: Editor,
    log?: Logger
): Promise<void> {
    if (ffApp.template.type === TemplateType.Basic) {
        addTestScripts(packageJson, addMock);
        const config = {
            appId: ffApp.app.id,
            applicationDescription: ffApp.app.description,
            applicationTitle: ffApp.app.title,
            viewName: (ffApp.template.settings as BasicAppSettings).viewName,
            ui5Theme: ffApp.ui5?.ui5Theme,
            ui5Version: ffApp.ui5?.version,
            enableTypeScript: ffApp.appOptions?.typescript
        };
        await generateFreestyleOPAFiles(basePath, config, fs, log);
    } else {
        log?.info(t('info.unsupportedTestTemplateMessage', { templateType: ffApp.template.type }));
    }
}
