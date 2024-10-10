import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { updateMiddlewares } from './ui5-yaml';
import { addVariantsManagementScript } from './package-json';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';

/**
 * Add variants configuration to an app or project.
 *
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param logger - logger
 * @param fs - the memfs editor instance
 * @returns Promise<Editor> - memfs editor instance with updated files
 */
export async function generateVariantsConfig(basePath: string, logger?: ToolsLogger, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    await addVariantsManagementScript(fs, basePath, logger).catch((error) => {
        logger?.error(`Script 'start-variants-management' cannot be written to package.json. ${error.message}.`);
        return fs;
    });
    await updateMiddlewares(fs, basePath, logger);
    return fs;
}
