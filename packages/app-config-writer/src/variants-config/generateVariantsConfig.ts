import { basename } from 'node:path';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { updateMiddlewaresForPreview } from '../common/ui5-yaml.js';
import { addVariantsManagementScript } from './package-json.js';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { getProjectType, findCapProjectRoot } from '@sap-ux/project-access';
import { readManifest } from '../common/utils.js';
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

    const capRoot = await findCapProjectRoot(basePath, false, fs);
    const projectType = await getProjectType(capRoot ?? basePath);

    if (projectType === 'CAPJava') {
        throw new Error('The variants-config command is not supported for CAP Java projects.');
    }

    if (projectType === 'CAPNodejs' && !capRoot) {
        throw new Error(`Could not find CAP project root for path '${basePath}'.`);
    }

    await updateMiddlewaresForPreview(fs, basePath, yamlPath, logger);

    if (projectType === 'CAPNodejs') {
        const { manifest } = await readManifest(basePath, fs);
        const appId = manifest['sap.app']?.id;
        if (!appId) {
            throw new Error(`The 'sap.app.id' property is missing in the manifest.json file.`);
        }
        // capRoot is non-null here: the early guard above throws when projectType === 'CAPNodejs' && !capRoot.
        // TypeScript cannot narrow across the intervening function call boundary, so the cast is required.
        await updateCapRootPackageJsonForVariants(
            capRoot as string,
            appId,
            basename(basePath),
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
