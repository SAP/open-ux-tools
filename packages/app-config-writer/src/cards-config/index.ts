import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { type Package } from '@sap-ux/project-access';

/**
 * Updates the package.json file to include the start-cards-generator script.
 *
 * @param basePath - The path to the project root
 * @param fs - Mem-fs editor instance
 */
function updatePackageJson(basePath: string, fs: Editor) {
    const packageJsonPath = join(basePath, 'package.json');
    if (!fs.exists(packageJsonPath)) {
        throw new Error('package.json not found');
    }

    const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;

    packageJson.scripts ??= {};
    packageJson.scripts['start-cards-generator'] = `fiori run --open 'test/flpGeneratorSandbox.html#Cards-generator'`;
    fs.writeJSON(packageJsonPath, packageJson);
}

/**
 * Enables the card generator for the given application.
 *
 * @param basePath - path to the project root
 * @param fs - optional mem-fs editor instance
 * @returns updated mem-fs editor instance
 */
export async function enableCardGeneratorConfig(basePath: string, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    updatePackageJson(basePath, fs);
    return fs;
}
