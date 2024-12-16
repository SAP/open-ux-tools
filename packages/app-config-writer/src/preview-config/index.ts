import { checkPrerequisites, getExplicitApprovalToAdjustFiles } from './prerequisites';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { deleteNoLongerUsedFiles, renameDefaultSandboxes, renameDefaultTestFiles } from './preview-files';
import { updatePreviewMiddlewareConfigs, updateTestConfig } from './ui5-yaml';
import { updateVariantsCreationScript } from './package-json';
import { type ToolsLogger } from '@sap-ux/logger';
import { readUi5Yaml, FileName } from '@sap-ux/project-access';
import { join } from 'path';
import { getPreviewMiddleware } from '../variants-config/utils';
import type { CustomMiddleware, UI5Config } from '@sap-ux/ui5-config';
import type { MiddlewareConfig as PreviewConfig, TestConfig } from '@sap-ux/preview-middleware';

/**
 * Converts the local preview files of a project to virtual files.
 *
 * It will check the prerequisites and confirm an explicit approval to convert the project.
 * If the prerequisites and approval are met, the corresponding UI5 yaml configuration for the preview middleware will be converted.
 * Corresponding files which are used for the preview are renamed or deleted.
 *
 * @param basePath - base path to be used for the conversion
 * @param convertTests - indicator if test suite and test runner should be included in the conversion (default: false)
 * @param logger logger to report info to the user
 * @param fs - file system reference
 * @returns file system reference
 */
export async function convertToVirtualPreview(
    basePath: string,
    convertTests: boolean = false,
    logger?: ToolsLogger,
    fs?: Editor
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    if (!(await checkPrerequisites(basePath, fs, logger))) {
        throw Error('The prerequisites are not met. For more information, see the log messages above.');
    }

    if (!(await getExplicitApprovalToAdjustFiles())) {
        logger?.error('You have not approved the conversion. The conversion has been aborted.');
        return fs;
    }

    await updatePreviewMiddlewareConfigs(fs, basePath, convertTests, logger);
    await renameDefaultSandboxes(fs, basePath, logger);
    if (convertTests) {
        await renameDefaultTestFiles(fs, basePath, logger);
        await updateDefaultTestConfig(fs, basePath);
    }
    await deleteNoLongerUsedFiles(fs, basePath, logger);
    await updateVariantsCreationScript(fs, basePath, logger);

    return fs;
}

/**
 * Updates the default test configurations in the UI5 yaml file in case it does not yet exist.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 */
async function updateDefaultTestConfig(fs: Editor, basePath: string): Promise<void> {
    let ui5YamlConfig: UI5Config;
    try {
        //todo: is adjusting ui5.yaml sufficient? Or do other yaml files neeed to be adjusted as well?
        ui5YamlConfig = await readUi5Yaml(basePath, FileName.Ui5Yaml, fs);
    } catch (error) {
        return;
    }
    const previewMiddleware = (await getPreviewMiddleware(ui5YamlConfig)) as CustomMiddleware<PreviewConfig>;
    (
        [
            { framework: 'Testsuite', path: 'test/testsuite.qunit.html' },
            { framework: 'OPA5', path: 'test/opaTests.qunit.html' },
            { framework: 'QUnit', path: 'test/unitTests.qunit.html' }
        ] satisfies TestConfig[]
    ).forEach((defaultTest) => {
        if (
            previewMiddleware.configuration?.test?.some((testConfig) => testConfig.framework === defaultTest.framework)
        ) {
            //skip existing test config
            return;
        }
        updateTestConfig(previewMiddleware.configuration.test, defaultTest.path);
    });
    ui5YamlConfig.updateCustomMiddleware(previewMiddleware);
    const yamlPath = join(basePath, FileName.Ui5Yaml);
    fs.write(yamlPath, ui5YamlConfig.toString());
}
