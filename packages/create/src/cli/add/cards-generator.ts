import type { Command } from 'commander';
import { enableCardGeneratorConfig } from '@sap-ux/app-config-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { FileName, getProjectType, findFioriArtifacts, type Package, type Manifest } from '@sap-ux/project-access';
import { join, relative } from 'node:path';
import type { Editor } from 'mem-fs-editor';

/**
 * Add the cards-editor command.
 *
 * @param cmd - commander command for adding card editor config command
 */
export function addCardsEditorConfigCommand(cmd: Command): void {
    cmd.command('cards-editor [path]')
        .description(
            `Add the necessary configuration to an existing YAML file and the script to the \`package.json\` file for cards generation. It uses the configuration from the YAML file passed by the CLI or default to \`ui5.yaml\`, as provided by the \`fiori-tools-preview\` or \`preview-middleware\`.\n
Example:
    \`npx --yes @sap-ux/create@latest add cards-editor\`
    
For CAP projects, use the --app option to specify the app folder:
    \`npx --yes @sap-ux/create@latest add cards-editor --app app/travel\``
        )
        .option('-c, --config <string>', 'Path to the project configuration file in YAML format.', FileName.Ui5Yaml)
        .option('-a, --app <string>', 'Path to the app folder (relative to project root). Required for CAP projects.')
        .option('-s, --simulate', 'Simulate only. Do not write to the config file. Also, sets `--verbose`')
        .option('-v, --verbose', 'Show verbose information.')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addCardsGeneratorConfig(path ?? process.cwd(), !!options.simulate, options.config, options.app);
        });
}

/**
 * Adds a script to the root package.json for CAP projects to start the card generator.
 *
 * @param fs - mem-fs-editor instance
 * @param rootPath - path to the CAP project root
 * @param appPath - path to the app folder
 * @param appRelativePath - relative path from root to app folder
 * @param logger - logger instance
 */
async function addRootScript(
    fs: Editor,
    rootPath: string,
    appPath: string,
    appRelativePath: string,
    logger: ReturnType<typeof getLogger>
): Promise<void> {
    const rootPackageJsonPath = join(rootPath, 'package.json');
    if (!fs.exists(rootPackageJsonPath)) {
        logger.warn(`Root package.json not found at ${rootPackageJsonPath}`);
        return;
    }

    const rootPackageJson = fs.readJSON(rootPackageJsonPath) as Package;
    rootPackageJson.scripts ??= {};

    // Read the app's manifest to get the app ID
    const manifestPath = join(appPath, 'webapp', 'manifest.json');
    let appId = 'app';
    if (fs.exists(manifestPath)) {
        const manifest = fs.readJSON(manifestPath) as unknown as Manifest;
        appId = manifest?.['sap.app']?.id ?? 'app';
    }

    // Create a sanitized script name from the app folder name
    const appFolderName = appRelativePath.split('/').pop() ?? 'app';
    const scriptName = `cards-generator:${appFolderName}`;

    // The script uses cds watch with --open to open the card generator sandbox
    const sandboxPath = `${appId}/test/flpCardGeneratorSandbox.html#app-preview`;
    rootPackageJson.scripts[scriptName] = `cds watch --open ${sandboxPath}`;

    fs.writeJSON(rootPackageJsonPath, rootPackageJson);
    logger.info(`Added script '${scriptName}' to root package.json`);
}

/**
 * Adds an cards generator config to an app. To prevent overwriting existing inbounds will be checked.
 *
 * @param basePath - path to application root
 * @param simulate - if true, do not write but just show what would be changed; otherwise write
 * @param yamlPath - path to the ui5*.yaml file passed by cli
 * @param appPath - path to the app folder (relative to project root) for CAP projects
 */
async function addCardsGeneratorConfig(
    basePath: string,
    simulate: boolean,
    yamlPath: string,
    appPath?: string
): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(
            `Called add cards-generator-config for path '${basePath}', simulate is '${simulate}', appPath is '${appPath}'`
        );

        // Check if this is a CAP project
        const projectType = await getProjectType(basePath);
        const isCapProject = projectType === 'CAPJava' || projectType === 'CAPNodejs';

        let effectiveBasePath = basePath;
        let effectiveYamlPath = yamlPath;

        if (isCapProject) {
            if (appPath) {
                // Use the provided app path
                effectiveBasePath = join(basePath, appPath);
                effectiveYamlPath = join(effectiveBasePath, yamlPath);
                logger.info(`CAP project detected. Using app path: ${effectiveBasePath}`);
            } else {
                // Try to find Fiori apps in the CAP project
                const artifacts = await findFioriArtifacts({
                    wsFolders: [basePath],
                    artifacts: ['applications']
                });
                if (artifacts.applications && artifacts.applications.length > 0) {
                    // Use the first app found - applications has appRoot which is the app folder
                    effectiveBasePath = artifacts.applications[0].appRoot;
                    effectiveYamlPath = join(effectiveBasePath, yamlPath);
                    logger.info(`CAP project detected. Found app at: ${effectiveBasePath}`);
                } else {
                    logger.error(
                        `CAP project detected but no Fiori apps found. Please use the --app option to specify the app folder.`
                    );
                    return;
                }
            }
        } else {
            // For non-CAP projects, validate the base path
            await validateBasePath(basePath);
        }

        const fs = await enableCardGeneratorConfig(effectiveBasePath, effectiveYamlPath, logger);

        // For CAP projects, add script to root package.json
        if (isCapProject) {
            const appRelativePath = relative(basePath, effectiveBasePath);
            await addRootScript(fs, basePath, effectiveBasePath, appRelativePath, logger);
        }

        if (!simulate) {
            fs.commit(() => logger.info(`Card Generator configuration written.`));
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(`Error while executing add cards generator configuration '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}
