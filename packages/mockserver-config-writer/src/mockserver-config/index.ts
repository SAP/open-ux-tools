import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { MemFsEditor, VinylMemFsEditorFile } from 'mem-fs-editor';
import type { MockserverConfig } from '../types/index.js';
import { enhancePackageJson, removeFromPackageJson } from './package-json.js';
import { enhanceYaml, removeMockDataFolders, removeUi5MockYaml } from './ui5-mock-yaml.js';

/**
 *  Add mockserver configuration to a UI5 application.
 *
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param data - configuration of the mockserver
 * @param fs - the memfs editor instance
 * @returns Promise<MemFsEditor> - memfs editor instance with updated files
 */
export async function generateMockserverConfig(
    basePath: string,
    data: MockserverConfig,
    fs?: MemFsEditor
): Promise<MemFsEditor> {
    if (!fs) {
        fs = create(createStorage<VinylMemFsEditorFile>());
    }
    if (!data.packageJsonConfig?.skip) {
        enhancePackageJson(fs, basePath, data.packageJsonConfig);
    }
    await enhanceYaml(fs, basePath, data.webappPath, data.ui5MockYamlConfig);
    return fs;
}

/**
 * Remove mockserver configuration.
 *
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param fs - the memfs editor instance
 * @returns Promise<MemFsEditor> - memfs editor instance with updated files
 */
export async function removeMockserverConfig(basePath: string, fs?: MemFsEditor): Promise<MemFsEditor> {
    if (!fs) {
        fs = create(createStorage<VinylMemFsEditorFile>());
    }
    removeFromPackageJson(fs, basePath);
    removeUi5MockYaml(fs, basePath);
    await removeMockDataFolders(fs, basePath);
    return fs;
}
