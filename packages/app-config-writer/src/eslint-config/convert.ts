import { create, type Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { create as createStorage } from 'mem-fs';
import { join } from 'node:path';
import { FileName, hasDependency, type Package } from '@sap-ux/project-access';
import { isLowerThanMinimalVersion } from '../common/package-json';
import crossSpawn from 'cross-spawn';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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

    await addFioriToolsToExistingConfig(basePath, fs, options.config, logger);
    await runMigrationCommand(basePath, fs);
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
    if (!hasDependency(packageJson, 'eslint')) {
        logger?.error(
            `Did not find ESLint dependency in package.json at path '${packageJsonPath}. You might want to use the \`add eslint-config\` command instead.'`
        );
        return false;
    }
    if (!isLowerThanMinimalVersion(packageJson, 'eslint', '9.0.0')) {
        logger?.error(
            `ESLint version is already 9.0.0 or higher in this project. Found ESLint dependency with version '${packageJson.devDependencies?.eslint}' in package.json at path '${packageJsonPath}'`
        );
        return false;
    }
    if (!fs.exists(join(basePath, '.eslintrc.json'))) {
        logger?.error(`No .eslintrc.json found at path '${join(basePath, '.eslintrc.json')}'`);
        return false;
    }
    return true;
}

/**
 * Adds SAP Fiori tools plugin to existing eslint configuration.
 *
 * @param basePath - base path to be used for the conversion
 * @param fs - file system reference
 * @param config - the name of the SAP Fiori tools eslint plugin config to be used
 * @param logger - logger to report info to the user
 * @throws {Error} if the existing .eslintrc.json file is not a valid JSON object
 */
async function addFioriToolsToExistingConfig(
    basePath: string,
    fs: Editor,
    config = 'recommended',
    logger?: ToolsLogger
): Promise<void> {
    const eslintrcPath = join(basePath, '.eslintrc.json');
    const eslintConfig = fs.readJSON(eslintrcPath) as EslintRcJson | undefined;

    if (!eslintConfig || typeof eslintConfig !== 'object') {
        throw new Error(
            `Existing .eslintrc.json at path '${join(basePath, '.eslintrc.json')}' is not a valid JSON object.`
        );
    }

    eslintConfig.plugins ??= [];
    eslintConfig.extends ??= [];

    if (!eslintConfig.plugins.includes(packageName.ESLINT_PLUGIN_FIORI_TOOLS)) {
        eslintConfig.plugins.push(packageName.ESLINT_PLUGIN_FIORI_TOOLS);
    }

    const fioriConfig = `plugin:${packageName.ESLINT_PLUGIN_FIORI_TOOLS}/${config}`;

    if (typeof eslintConfig.extends === 'string') {
        eslintConfig.extends = eslintConfig.extends.includes(packageName.ESLINT_PLUGIN_FIORI_TOOLS)
            ? fioriConfig
            : [eslintConfig.extends, fioriConfig];
    } else if (Array.isArray(eslintConfig.extends)) {
        const fioriToolsIndex = eslintConfig.extends.findIndex((config) =>
            config.includes(packageName.ESLINT_PLUGIN_FIORI_TOOLS)
        );
        if (fioriToolsIndex === -1) {
            eslintConfig.extends.push(fioriConfig);
        } else {
            eslintConfig.extends[fioriToolsIndex] = fioriConfig;
        }
    }

    fs.writeJSON(eslintrcPath, eslintConfig);
    logger?.debug(`Applied SAP Fiori tools settings to ${eslintrcPath}`);
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
        const eslintrcPath = join(basePath, '.eslintrc.json');
        copyFileSync(eslintrcPath, join(tempDir, '.eslintrc.json'));
        const eslintignorePath = join(basePath, '.eslintignore');
        if (existsSync(eslintignorePath)) {
            copyFileSync(eslintignorePath, join(tempDir, '.eslintignore'));
        }

        // 2. Run migration in temp directory
        await spawnMigrationCommand(tempDir);

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
 * @returns a promise that resolves when the migration command finishes successfully, or rejects if the command fails
 */
async function spawnMigrationCommand(basePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = crossSpawn('npx', ['--yes', packageName.ESLINT_MIGRATE_CONFIG, '.eslintrc.json'], {
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
    fs.writeJSON(packageJsonPath, packageJson);
}
