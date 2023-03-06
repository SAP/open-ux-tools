import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import type { TargetConfig } from '../types';
import { deleteSmartLinksConfig, writeSmartLinksConfig } from './utils';

/**
 * @description Add smartlinks configuration to a UI5 application.
 * @param basePath - the base path where the ui5-deploy/ui5.yaml is
 * @param config - configuration of the target system for smartlinks
 * @param logger - logger
 * @param fs - the memfs editor instance
 * @returns Promise<Editor> - memfs editor instance with updated files
 */
export async function generateSmartLinksConfig(
    basePath: string,
    config: TargetConfig,
    logger?: ToolsLogger,
    fs?: Editor
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    await writeSmartLinksConfig(basePath, config, fs, logger);
    return fs;
}

/**
 * @description Remove smartlinks configuration.
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param logger - logger
 * @param fs - the memfs editor instance
 * @returns Promise<Editor> - memfs editor instance with updated files
 */
export async function removeSmartLinksConfig(basePath: string, logger?: ToolsLogger, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    await deleteSmartLinksConfig(basePath, fs, logger);
    return fs;
}
