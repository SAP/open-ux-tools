import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';
import type { MockserverConfig } from '../types/index.js';
import { MOCKGEN_MODULE } from './mockgen.js';
import { enhancePackageJson, removeFromPackageJson } from './package-json.js';
import { canConfigureMockgenProvider, enhanceYaml, removeMockDataFolders, removeUi5MockYaml } from './ui5-mock-yaml.js';

/**
 *  Add mockserver configuration to a UI5 application.
 *
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param data - configuration of the mockserver
 * @param fs - the memfs editor instance
 * @returns Promise<Editor> - memfs editor instance with updated files
 */
export async function generateMockserverConfig(basePath: string, data: MockserverConfig, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    if (data.packageJsonConfig?.skip) {
        await enhanceYaml(fs, basePath, data.webappPath, data.ui5MockYamlConfig, 'preserve');
        return fs;
    }
    const mockgenProviderAvailable = await canConfigureMockgenProvider(fs, basePath);
    const configureMockgen = enhancePackageJson(fs, basePath, data.packageJsonConfig, mockgenProviderAvailable);
    await enhanceYaml(fs, basePath, data.webappPath, data.ui5MockYamlConfig, configureMockgen);
    return fs;
}

/**
 * Reconcile only the package.json side of MockGen wiring after another writer has finalized application scripts.
 * The provider slot in ui5-mock.yaml remains the source of truth, so a custom provider is never overwritten.
 *
 * @param basePath - the base path where package.json and ui5-mock.yaml are located
 * @param fs - the memfs editor instance
 * @returns Promise<Editor> - memfs editor instance with consistent package wiring
 */
export async function reconcileMockgenPackageJson(basePath: string, fs: Editor): Promise<Editor> {
    const packageJson = fs.readJSON(join(basePath, 'package.json')) as Package;
    if (!packageJson.devDependencies?.[MOCKGEN_MODULE]) {
        return fs;
    }
    const mockgenProviderAvailable = await canConfigureMockgenProvider(fs, basePath);
    enhancePackageJson(fs, basePath, undefined, mockgenProviderAvailable);
    return fs;
}

/**
 * Remove mockserver configuration.
 *
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param fs - the memfs editor instance
 * @returns Promise<Editor> - memfs editor instance with updated files
 */
export async function removeMockserverConfig(basePath: string, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    removeFromPackageJson(fs, basePath);
    removeUi5MockYaml(fs, basePath);
    await removeMockDataFolders(fs, basePath);
    return fs;
}
