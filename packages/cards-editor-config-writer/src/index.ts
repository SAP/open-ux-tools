import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Package, ManifestNamespace } from '@sap-ux/project-access';
import { UI5Config } from '@sap-ux/ui5-config';

export type Manifest = ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile & { [key: string]: unknown };
/**
 * Updates the package.json file to include the cards editor middleware and the start-cards-generator script.
 *
 * @param basePath - The path to the project root
 * @param fs - Mem-fs editor instance
 * @param isOvp - Whether the project is an OVP project or not
 */
function updatePackageJson(basePath: string, fs: Editor, isOvp?: boolean) {
    const packageJsonPath = join(basePath, 'package.json');
    if (!fs.exists(packageJsonPath)) {
        throw new Error('package.json not found');
    }

    const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;

    packageJson.devDependencies ??= {};
    packageJson.devDependencies['@sap-ux/cards-editor-middleware'] ??= '*';

    packageJson.scripts ??= {};
    packageJson.scripts['start-cards-generator'] = `fiori run --open \"test/flpGeneratorSandbox.html${
        isOvp ? '?mode=myInsight&sap-theme=sap_horizon' : ''
    }#Cards-generator\"`;

    if (!packageJson.devDependencies['@ui5/cli']?.startsWith('3')) {
        packageJson.ui5 ??= {};
        packageJson.ui5.dependencies ??= [];
        if (!packageJson.ui5.dependencies.includes('@sap-ux/cards-editor-middleware')) {
            packageJson.ui5.dependencies.push('@sap-ux/cards-editor-middleware');
        }
    }
    fs.writeJSON(packageJsonPath, packageJson);
}

/**
 * Updates the ui5.yaml file to include the cards editor middleware.
 *
 * @param basePath - The path to the project root
 * @param fs - Mem-fs editor instance
 * @param middlewares - The middlewares to add to the ui5.yaml file
 */
async function updateYaml(basePath: string, fs: Editor, middlewares: string[]) {
    const ui5ConfigPath = join(basePath, 'ui5.yaml');
    if (!fs.exists(ui5ConfigPath)) {
        throw new Error('ui5.yaml not found');
    }
    const config = await UI5Config.newInstance(fs.read(ui5ConfigPath));
    config.addCustomMiddleware(
        middlewares.map((name) => ({
            name,
            afterMiddleware: 'compression',
            configuration: undefined
        }))
    );
    fs.write(ui5ConfigPath, config.toString());
}

/**
 * Enables the cards editor in the given project.
 *
 * @param basePath - path to the project root
 * @param fs - optional mem-fs editor instance
 * @returns updated mem-fs editor instance
 */
export async function enableCardEditor(basePath: string, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    const manifestFilePath = join(basePath, 'webapp/manifest.json');
    if (!fs.exists(manifestFilePath)) {
        throw new Error(`No manifest found at ${manifestFilePath}`);
    }
    const manifest = fs.readJSON(manifestFilePath) as Manifest;

    if (manifest.hasOwnProperty('sap.ovp')) {
        updatePackageJson(basePath, fs, true);
        await updateYaml(basePath, fs, ['ovp-card-generator']);
    } else {
        updatePackageJson(basePath, fs);
        await updateYaml(basePath, fs, ['sap-cards-generator']);
    }

    return fs;
}
