import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import type { MockserverConfig } from '../types';
import { enhancePackageJson, removeFromPackageJson } from './package-json';
import { enhanceYaml, removeUi5MockYaml } from './ui5-mock-yaml';

/**
 *  Add mockserver configuration to a UI5 application.
 *
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param data - configuration of the mockserver
 * @param overwriteServices - optional, whether to overwrite existing services in mock-server config
 * @param fs - the memfs editor instance
 * @returns Promise<Editor> - memfs editor instance with updated files
 */
export async function generateMockserverConfig(
    basePath: string,
    data: MockserverConfig,
    overwriteServices = false,
    fs?: Editor
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    enhancePackageJson(fs, basePath, data.packageJsonConfig);
    await enhanceYaml(fs, basePath, data.webappPath, data.ui5MockYamlConfig, overwriteServices);
    return fs;
}

/**
 * Remove mockserver configuration.
 *
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param fs - the memfs editor instance
 * @returns Promise<Editor> - memfs editor instance with updated files
 */
export function removeMockserverConfig(basePath: string, fs?: Editor): Editor {
    if (!fs) {
        fs = create(createStorage());
    }
    removeFromPackageJson(fs, basePath);
    removeUi5MockYaml(fs, basePath);
    return fs;
}
