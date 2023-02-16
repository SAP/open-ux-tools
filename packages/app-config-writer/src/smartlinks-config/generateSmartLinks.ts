import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import type { SmartLinksConfig } from '..';
import { getCredentials, getServices, writeSmartLinksConfig } from '.';

/**
 * @description Add smartlinks configuration to a UI5 application.
 * @param basePath - the base path where the ui5-deploy/ui5.yaml is
 * @param config - configuration of the smartlinks
 * @param logger - logger
 * @param fs - the memfs editor instance
 * @returns Promise<Editor> - memfs editor instance with updated files
 */
export async function generateSmartLinksConfig(
    basePath: string,
    config: SmartLinksConfig,
    logger?: ToolsLogger,
    fs?: Editor
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    if (!config.service) {
        const service = (await getServices(basePath, logger, fs))[0];
        const credentials = await getCredentials(service, logger);
        config.service = { ...service, credentials };
    }
    await writeSmartLinksConfig(basePath, config.service, fs, logger);
    return fs;
}

/**
 * Remove smartlinks configuration.
 *
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param fs - the memfs editor instance
 * @returns Promise<Editor> - memfs editor instance with updated files
 */
export function removeSmartLinksConfig(basePath: string, fs?: Editor): Editor {
    if (!fs) {
        fs = create(createStorage());
    }
    // ToDo:
    // [ ] remove write appconfig/fioriSandboxConfig.json
    // removeSmartLinksConfiguration(fs, basePath);
    return fs;
}
