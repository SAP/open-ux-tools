import { checkPrerequisites, getExplicitApprovalToAdjustFiles } from './prerequisites';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { deleteNoLongerUsedFiles, renameDefaultSandboxes, renameDefaultTestFiles } from './preview-files';
import { updatePreviewMiddlewareConfigs, updateDefaultTestConfig } from './ui5-yaml';
import { updateVariantsCreationScript } from './package-json';
import { type ToolsLogger } from '@sap-ux/logger';

/**
 * Converts the local preview files of a project to virtual files.
 *
 * It will check the prerequisites and confirm an explicit approval to convert the project.
 * If the prerequisites and approval are met, the corresponding UI5 yaml configuration for the preview middleware will be converted.
 * Corresponding files which are used for the preview are renamed or deleted.
 *
 * @param basePath - base path to be used for the conversion
 * @param options - options for the conversion
 * @param options.convertTests - if set to true, then test suite and test runners fill be included in the conversion
 * @param options.logger - logger to report info to the user
 * @param options.fs - file system reference
 * @returns file system reference
 */
export async function convertToVirtualPreview(
    basePath: string,
    options: { convertTests?: boolean; logger?: ToolsLogger; fs?: Editor }
): Promise<Editor> {
    const fs = options.fs ?? create(createStorage());
    const logger = options.logger;
    const convertTests = options.convertTests ?? false;

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
        await updateDefaultTestConfig(fs, basePath, logger);
    }
    await deleteNoLongerUsedFiles(fs, basePath, logger);
    await updateVariantsCreationScript(fs, basePath, logger);

    return fs;
}
