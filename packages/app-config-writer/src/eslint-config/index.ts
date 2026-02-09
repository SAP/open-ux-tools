import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { type ToolsLogger } from '@sap-ux/logger';
import { type Package, hasDependency, FileName } from '@sap-ux/project-access';
import { join } from 'node:path';

/**
 * Adds eslint configuration to the project.
 *
 * It will check the prerequisites and confirm an explicit approval to add the configuration.
 * If the prerequisites and approval are met, the corresponding eslint configuration and packages will be added.
 *
 * @param basePath - base path to be used for the conversion
 * @param options - options for the conversion
 * @param options.logger - logger to report info to the user
 * @param options.fs - file system reference
 * @param options.config - the name of the SAP Fiori tools eslint plugin config to be used
 * @returns file system reference
 */
export async function generateEslintConfig(
    basePath: string,
    options: { logger?: ToolsLogger; fs?: Editor; config?: string }
): Promise<Editor> {
    const fs = options.fs ?? create(createStorage());
    const logger = options.logger;

    if (!(await checkPrerequisites(basePath, fs, logger))) {
        throw new Error('The prerequisites are not met. For more information, see the log messages above.');
    }
    await updatePackageJson(basePath, fs);
    await addEslintConfig(basePath, fs, options?.config);

    return fs;
}

/**
 * Checks the prerequisites for adding eslint configuration to the project.
 *
 * @param basePath - base path to be used for the conversion
 * @param fs - file system reference
 * @param logger - logger to report info to the user
 * @returns true if the prerequisites are met, false otherwise
 */
async function checkPrerequisites(basePath: string, fs: Editor, logger?: ToolsLogger): Promise<boolean> {
    const packageJsonPath = join(basePath, FileName.Package);
    const packageJson = fs.readJSON(packageJsonPath);
    if (!packageJson) {
        logger?.error(`No package.json found at path '${packageJsonPath}'`);
        return false;
    }
    const eslintExists = hasDependency(packageJson as Package, 'eslint');
    if (eslintExists) {
        logger?.error(
            `ESLint already exists in this project. Found 'eslint' dependency in package.json at path '${packageJsonPath}'`
        );
        return false;
    }
    return true;
}

/**
 * Updates the package.json file of the project by adding the required eslint dependency.
 *
 * @param basePath - base path to be used for the conversion
 * @param fs - file system reference
 */
async function updatePackageJson(basePath: string, fs: Editor): Promise<void> {
    const packageJsonPath = join(basePath, FileName.Package);
    const packageJson = fs.readJSON(packageJsonPath) as Package;
    packageJson.devDependencies ??= {};
    packageJson.devDependencies['eslint'] = '^9.0.0';
    packageJson.devDependencies['@sap-ux/eslint-plugin-fiori-tools'] = '^9.0.0';
    packageJson.scripts ??= {};
    //todo: check if lint script already exists?
    packageJson.scripts['lint'] = 'eslint .';
    fs.writeJSON(packageJsonPath, packageJson);
}

/**
 * Adds the eslint configuration file to the project.
 *
 * @param basePath - base path to be used for the conversion
 * @param fs - file system reference
 * @param config - the name of the SAP Fiori tools eslint plugin config to be used
 */
async function addEslintConfig(basePath: string, fs: Editor, config: string = 'recommended'): Promise<void> {
    //todo:
    // * mjs
    const templatePath = require.resolve('@sap-ux/ui5-application-writer/templates/optional/eslint/eslint.config.js');
    let templateContent = await fs.read(templatePath);
    if (config === 'recommended-for-s4hana') {
        templateContent = templateContent.replace(
            '...fioriTools.configs.recommended',
            "...fioriTools.configs['recommended-for-s4hana']"
        );
    }
    await fs.write(join(basePath, 'eslint.config.mjs'), templateContent);
}
