import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { updateMiddlewaresForPreview } from '../common/ui5-yaml.js';
import { addVariantsManagementScript } from './package-json.js';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { getCapProjectInfo } from '../common/cap-utils.js';
import { updateCapRootPackageJsonForVariants } from './cap.js';

/**
 * Add variants configuration to an app or project.
 *
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param yamlPath - path to the ui5*.yaml file passed by cli
 * @param logger - logger
 * @param fs - the memfs editor instance
 * @returns Promise<Editor> - memfs editor instance with updated files
 */
export async function generateVariantsConfig(
    basePath: string,
    yamlPath?: string,
    logger?: ToolsLogger,
    fs?: Editor
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    const projectInfo = await getCapProjectInfo(basePath, fs);

    if (projectInfo.projectType === 'CAPJava') {
        throw new Error('The variants-config command is not supported for CAP Java projects.');
    }

    await updateMiddlewaresForPreview(fs, basePath, yamlPath, logger);

    if (projectInfo.projectType === 'CAPNodejs') {
        await updateCapRootPackageJsonForVariants(
            projectInfo.capRoot,
            projectInfo.appId,
            projectInfo.appFolderName,
            basePath,
            fs,
            yamlPath,
            logger
        );
    } else {
        await addVariantsManagementScript(fs, basePath, yamlPath, logger);
    }

    return fs;
}
