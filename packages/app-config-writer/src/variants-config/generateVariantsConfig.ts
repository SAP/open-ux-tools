import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { addPreviewMiddlewareToYaml } from './ui5-yaml';
import { addVariantsManagementScript } from './package-json';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
/**
 * Add variants configuration to a UI5 application.
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
    addVariantsManagementScript(fs, basePath);
    await addPreviewMiddlewareToYaml(fs, basePath, logger);
    return fs;
}
