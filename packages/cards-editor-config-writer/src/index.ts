import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';
import { UI5Config } from '@sap-ux/ui5-config';

/**
 * Check if package.json has devDependency to @ui5/cli version  > 2.
 *
 * @param devDependencies - parsed devDependencies from package.json
 * @returns - true: @ui/cli higher version 2; false: @ui/cli
 */
function isUi5CliHigherTwo(devDependencies: Partial<Record<string, string>>): boolean {
    let isHigherTwo = false;
    try {
        const versionString = devDependencies['@ui5/cli'];
        if (typeof versionString === 'string') {
            const regex = /\d+/;
            const result = regex.exec(versionString.split('.')[0]);
            const majorVersionValue = result ? result[0] : '0';
            const majorVersion = parseInt(majorVersionValue, 10);
            isHigherTwo = majorVersion > 2;
        }
    } catch {
        // if something went wrong we don't have @ui/cli > version 2
    }
    return isHigherTwo;
}

/**
 * Updates the package.json file to include the cards editor middleware and the start-cards-generator script.
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

    packageJson.devDependencies ??= {};
    packageJson.devDependencies['@sap-ux/cards-editor-middleware'] ??= '0';

    packageJson.scripts ??= {};
    packageJson.scripts['start-cards-generator'] = `fiori run --open 'test/flpGeneratorSandbox.html#Cards-generator'`;

    if (!isUi5CliHigherTwo(packageJson.devDependencies)) {
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
        middlewares
            .filter((name) => !config.findCustomMiddleware(name))
            .map((name) => ({
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
export async function enableCardsEditor(basePath: string, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    updatePackageJson(basePath, fs);
    await updateYaml(basePath, fs, ['sap-cards-generator']);

    return fs;
}
