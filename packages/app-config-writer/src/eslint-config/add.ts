import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { type ToolsLogger } from '@sap-ux/logger';
import { type Package, hasDependency, FileName } from '@sap-ux/project-access';
import { join } from 'node:path';
import { addEslintFeature } from '@sap-ux/ui5-application-writer';
/**
 * Adds eslint configuration to the project.
 *
 * It checks the prerequisites to add the configuration.
 * If the prerequisites are met, the corresponding eslint configuration and packages are added.
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
    await addEslintConfig(basePath, fs, options?.config);

    return fs;
}

/**
 * Checks the prerequisites for adding an eslint configuration to the project.
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
            `EsLint already exists in this project. Found 'eslint' dependency in package.json at path '${packageJsonPath}'`
        );
        return false;
    }
    return true;
}

/**
 * Adds the eslint configuration file to the project.
 *
 * @param basePath - base path to be used for the conversion
 * @param fs - file system reference
 * @param config - the name of the SAP Fiori tools eslint plugin config to be used
 */
async function addEslintConfig(basePath: string, fs: Editor, config: string = 'recommended'): Promise<void> {
    await addEslintFeature(basePath, fs);
    if (config === 'recommended-for-s4hana') {
        const eslintConfigPath = join(basePath, 'eslint.config.mjs');
        let eslintConfigContent = fs.read(eslintConfigPath);
        eslintConfigContent = eslintConfigContent.replace(
            '...fioriTools.configs.recommended',
            "...fioriTools.configs['recommended-for-s4hana']"
        );
        await fs.write(join(basePath, 'eslint.config.mjs'), eslintConfigContent);
    }
}
