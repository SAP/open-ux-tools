import { checkPrerequisites, getExplicitApprovalToAdjustFiles } from './prerequisites';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { deleteNoLongerUsedFiles, renameDefaultSandboxes } from './preview-files';
import { updatePreviewMiddlewareConfigs } from './ui5-yaml';
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
 * @param logger logger to report info to the user
 * @param fs - file system reference
 * @returns file system reference
 */
export async function convertToVirtualPreview(basePath: string, logger?: ToolsLogger, fs?: Editor): Promise<Editor> {
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

    await updatePreviewMiddlewareConfigs(fs, basePath, logger);
    await renameDefaultSandboxes(fs, basePath, logger);
    await deleteNoLongerUsedFiles(fs, basePath, logger);
    await updateVariantsCreationScript(fs, basePath, logger);

    return fs;
}
