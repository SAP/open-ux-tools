import { create, type Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { create as createStorage } from 'mem-fs';
import { join } from 'node:path';
import { FileName, hasDependency, type Package } from '@sap-ux/project-access';
import { isLowerThanMinimalVersion } from '../common/package-json';
import crossSpawn from 'cross-spawn';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

/**
 * Partial type definition of an eslint configuration file (.eslintrc.json) that is relevant for the conversion.
 */
export type EslintRcJson = {
    /**
     * A list of plugins to load.
     */
    plugins?: string[];

    /**
     * Configurations to extend.
     * Either a string that represents a single configuration or an array of strings that represents multiple configurations.
     */
    extends?: string | string[];
};

const packageName = {
    ESLINT: 'eslint',
    ESLINT_MIGRATE_CONFIG: '@eslint/migrate-config',
    ESLINT_PLUGIN_FIORI_TOOLS: '@sap-ux/eslint-plugin-fiori-tools',
    ESLINT_PLUGIN_FIORI_CUSTOM: 'eslint-plugin-fiori-custom'
} as const;

const MIGRATION_ERROR_TEXT = `Migration to eslint version 9 failed. Check if there are error messages above. You can also delete the existing eslint \`devDependency\` and run \`create add eslint\` to create a eslint.config.mjs file with the flat config where you can transfer your old eslint config manually.\` For more information, see [https://eslint.org/docs/latest/use/migrate-to-9.0.0#flat-config](Migrate to v9.x).`;

/**
 * Converts an eslint config to flat config format (eslint version 9).
 *
 * It checks the prerequisites to add the configuration.
 * If the prerequisites are met, the corresponding eslint configuration is converted and packages are added/removed.
 *
 * @param basePath - base path to be used for the conversion
 * @param options - options for the conversion
 * @param options.logger - logger to report info to the user
 * @param options.fs - file system reference
 * @param options.config - the name of the SAP Fiori tools eslint plugin config to be used
 * @returns file system reference
 * @throws {Error} if the prerequisites are not met or if the conversion fails
 */
export async function convertEslintConfig(
    basePath: string,
    options: { logger?: ToolsLogger; fs?: Editor; config?: string }
): Promise<Editor> {
    const fs = options.fs ?? create(createStorage());
    const logger = options.logger;

    if (!(await checkPrerequisites(basePath, fs, logger))) {
        throw new Error('The prerequisites are not met. For more information, see the log messages above.');
    }

    await removeFioriToolsFromExistingConfig(basePath, fs, logger);
    await runMigrationCommand(basePath, fs);
    await injectFioriToolsIntoMigratedConfig(basePath, fs, options.config, logger);
    await updatePackageJson(basePath, fs);

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
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    if (!packageJson) {
        logger?.error(`No package.json found at path '${packageJsonPath}'`);
        return false;
    }
    if (!hasDependency(packageJson, packageName.ESLINT)) {
        logger?.error(
            `Did not find ESLint dependency in package.json at path '${packageJsonPath}'. You might want to use the \`add eslint-config\` command instead.'`
        );
        return false;
    }
    if (!isLowerThanMinimalVersion(packageJson, packageName.ESLINT, '9.0.0')) {
        logger?.error(
            `ESLint version is already 9.0.0 or higher in this project. Found ESLint dependency with version '${packageJson.devDependencies?.eslint}' in package.json at path '${packageJsonPath}'`
        );
        return false;
    }
    if (hasDependency(packageJson, '@fxu/fincode')) {
        logger?.error(
            `Dependency to '@fxu/fincode' found at path '${basePath}'. Please remove the dependency and any usage of this package before running the conversion.`
        );
        return false;
    }
    if (!fs.exists(join(basePath, '.eslintrc.json')) && !fs.exists(join(basePath, '.eslintrc'))) {
        logger?.error(`No .eslintrc.json or .eslintrc found at path '${basePath}'`);
        return false;
    }
    return true;
}

/**
 * Removes all traces of the SAP Fiori tools plugin from the existing legacy eslint configuration,
 * so that the migration tool does not attempt to translate it and produce broken output.
 *
 * @param basePath - base path to be used for the conversion
 * @param fs - file system reference
 * @param logger - logger to report info to the user
 * @throws {Error} if the existing .eslintrc.json file is not a valid JSON object
 */
async function removeFioriToolsFromExistingConfig(basePath: string, fs: Editor, logger?: ToolsLogger): Promise<void> {
    const eslintrcJsonPath = join(basePath, '.eslintrc.json');
    const eslintrcPath = join(basePath, '.eslintrc');
    const configPath = fs.exists(eslintrcJsonPath) ? eslintrcJsonPath : eslintrcPath;
    const eslintConfig = fs.readJSON(configPath) as EslintRcJson | undefined;

    if (!eslintConfig || typeof eslintConfig !== 'object') {
        throw new Error(`Existing eslint config at path '${configPath}' is not a valid JSON object.`);
    }

    // Remove fiori-tools from plugins array
    if (Array.isArray(eslintConfig.plugins)) {
        eslintConfig.plugins = eslintConfig.plugins.filter(
            (plugin) => !plugin.includes(packageName.ESLINT_PLUGIN_FIORI_TOOLS)
        );
        if (eslintConfig.plugins.length === 0) {
            delete eslintConfig.plugins;
        }
    }

    // Remove fiori-tools entries from extends
    if (typeof eslintConfig.extends === 'string') {
        if (eslintConfig.extends.includes(packageName.ESLINT_PLUGIN_FIORI_TOOLS)) {
            delete eslintConfig.extends;
        }
    } else if (Array.isArray(eslintConfig.extends)) {
        eslintConfig.extends = eslintConfig.extends.filter(
            (ext) => !ext.includes(packageName.ESLINT_PLUGIN_FIORI_TOOLS)
        );
        if (eslintConfig.extends.length === 0) {
            delete eslintConfig.extends;
        }
    }

    fs.writeJSON(configPath, eslintConfig);
    logger?.debug(`Removed SAP Fiori tools plugin references from ${configPath}`);
}

/**
 * Injects the SAP Fiori tools plugin import and config spread into the migrated flat-config file.
 *
 * After the migration tool produces `eslint.config.mjs`, this function:
 * 1. Prepends `import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';` to the imports section.
 * 2. Inserts `...fioriTools.configs.recommended` (or the requested config variant) as the last
 *    element of the exported config array, right before the closing `]);`.
 *
 * @param basePath - base path of the project
 * @param fs - file system reference
 * @param config - the name of the SAP Fiori tools eslint plugin config to be used
 * @param logger - logger to report info to the user
 */
async function injectFioriToolsIntoMigratedConfig(
    basePath: string,
    fs: Editor,
    config = 'recommended',
    logger?: ToolsLogger
): Promise<void> {
    const migratedConfigPath = join(basePath, 'eslint.config.mjs');
    let content = fs.read(migratedConfigPath);

    const importStatement = `import fioriTools from '${packageName.ESLINT_PLUGIN_FIORI_TOOLS}';\n`;
    if (!content.includes(importStatement)) {
        content = importStatement + content;
    }

    const lastBracketIndex = content.lastIndexOf(']);');
    if (lastBracketIndex === -1) {
        throw new Error(
            'Unexpected format of migrated eslint config. Could not inject the SAP Fiori tools plugin configuration.'
        );
    } else {
        content =
            content.slice(0, lastBracketIndex) +
            `,\n    ...fioriTools.configs['${config}'],\n` +
            content.slice(lastBracketIndex);
    }

    fs.write(migratedConfigPath, content);
    logger?.debug(`Injected SAP Fiori tools plugin into ${migratedConfigPath}`);
}

/**
 * Runs the eslint migration command to convert the existing eslint configuration to flat config format.
 * The command is executed in a temporary directory to avoid modifying the project files directly.
 *
 * @param basePath - base path to be used for the conversion
 * @param fs - file system reference
 * @returns a promise that resolves when the migration command finishes successfully, or rejects if the command fails
 */
async function runMigrationCommand(basePath: string, fs: Editor): Promise<void> {
    const tempDir = mkdtempSync(join(tmpdir(), 'eslint-migration-'));

    try {
        // 1. Copy necessary files to temp directory
        const eslintrcJsonPath = join(basePath, '.eslintrc.json');
        const eslintrcPath = join(basePath, '.eslintrc');
        const configPath = fs.exists(eslintrcJsonPath) ? eslintrcJsonPath : eslintrcPath;
        const configFileName = fs.exists(eslintrcJsonPath) ? '.eslintrc.json' : '.eslintrc';

        // Read from mem-fs (which has the modified content) and write to temp directory
        const eslintrcContent = fs.read(configPath);
        writeFileSync(join(tempDir, configFileName), eslintrcContent, 'utf-8');

        const eslintignorePath = join(basePath, '.eslintignore');
        if (existsSync(eslintignorePath)) {
            writeFileSync(join(tempDir, '.eslintignore'), readFileSync(eslintignorePath, 'utf-8'), 'utf-8');
        }

        // 2. Run migration in temp directory
        await spawnMigrationCommand(tempDir, configFileName);

        // 3. Write migrated config to mem-fs
        const migratedConfigPath = join(basePath, 'eslint.config.mjs');
        const migratedContent = readFileSync(join(tempDir, 'eslint.config.mjs'), 'utf-8');
        fs.write(migratedConfigPath, migratedContent);
    } finally {
        rmSync(tempDir, { recursive: true, force: true });
    }
}

/**
 * Spawns the eslint migration command using cross-spawn to convert the eslint configuration to flat config format.
 *
 * @param basePath - base path to be used for the conversion
 * @param configFileName - the name of the config file to migrate
 * @returns a promise that resolves when the migration command finishes successfully, or rejects if the command fails
 */
async function spawnMigrationCommand(basePath: string, configFileName: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = crossSpawn('npx', ['--yes', packageName.ESLINT_MIGRATE_CONFIG, configFileName], {
            cwd: basePath,
            shell: false,
            stdio: 'inherit'
        });

        child.on('close', (code: number | null) => {
            if (code === 0) {
                resolve();
            } else {
                reject(
                    new Error(`Migration command failed with exit code ${code ?? 'unknown'}. ${MIGRATION_ERROR_TEXT}`)
                );
            }
        });

        child.on('error', (error: Error) => {
            reject(new Error(`Migration command failed: ${error.message}. ${MIGRATION_ERROR_TEXT}`));
        });
    });
}

/**
 * Updates the package.json file of the project by adding or updating the required devDependencies.
 *
 * @param basePath - base path to be used for the conversion
 * @param fs - file system reference
 */
async function updatePackageJson(basePath: string, fs: Editor): Promise<void> {
    const packageJsonPath = join(basePath, FileName.Package);
    const packageJson = fs.readJSON(packageJsonPath) as Package;
    packageJson.devDependencies ??= {};
    packageJson.devDependencies[packageName.ESLINT] = '^9.0.0';
    packageJson.devDependencies[packageName.ESLINT_PLUGIN_FIORI_TOOLS] = '^9.0.0';
    delete packageJson.devDependencies[packageName.ESLINT_PLUGIN_FIORI_CUSTOM];
    packageJson.scripts ??= {};
    packageJson.scripts['lnit'] = 'eslint ./';
    fs.writeJSON(packageJsonPath, packageJson);
}
