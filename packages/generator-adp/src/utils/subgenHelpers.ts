import type Generator from 'yeoman-generator';
import type { AppWizard, Prompts } from '@sap-devx/yeoman-ui-types';

import type { ToolsLogger } from '@sap-ux/logger';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { ConfigAnswers, AttributesAnswers, SystemLookup, FlexLayer, Endpoint } from '@sap-ux/adp-tooling';

import { t } from './i18n';
import { getExtensionProjectData } from '../app/extension-project';
/**
 * Parameters required for composing the extension project generator.
 */
interface ExtProjectGenProps {
    configAnswers: ConfigAnswers;
    attributeAnswers: AttributesAnswers;
    systemLookup: SystemLookup;
}

/**
 * Parameters required for composing the FLP config generator.
 */
interface FlpGenProps {
    vscode: unknown;
    projectRootPath: string;
    inbounds?: ManifestNamespace.Inbound;
    layer: FlexLayer;
    prompts: Prompts;
}

/**
 * Options required to invoke the deploy-config subgenerator.
 */
interface DeployGenOptions {
    projectName: string;
    projectPath: string;
    connectedSystem: string;
    system?: Endpoint;
}

/**
 * Static validation configuration for package prompts in ADP deployment.
 */
const PACKAGE_ADDITIONAL_VALIDATION = {
    shouldValidatePackageForStartingPrefix: true,
    shouldValidatePackageType: true,
    shouldValidateFormatAndSpecialCharacters: true
} as const;

/**
 * Composes the FLP config sub-generator using `composeWith`. This generator is used to scaffold
 * the FLP (Fiori Launchpad) configuration for the project.
 *
 * @param {FlpGenProps} options - Configuration object for the FLP generator.
 * @param {string} options.projectRootPath - Full path to the root of the project.
 * @param {string} options.system - System identifier string.
 * @param {Generator['composeWith']} composeWith - `composeWith` method provided by Yeoman Generator instance.
 * @param {ToolsLogger} logger - Logger instance for tracking operations and errors.
 * @param {AppWizard} appWizard - AppWizard instance for interacting with the UI (optional).
 */
export function addFlpGen(
    { projectRootPath, vscode, inbounds, layer, prompts }: FlpGenProps,
    composeWith: Generator['composeWith'],
    logger: ToolsLogger,
    appWizard: AppWizard
): void {
    try {
        /**
         * We are using this namespace for now because '@sap/fiori:adp-flp-config' is not yet bundled in '@sap/generator-fiori'.
         */
        composeWith('@sap/fiori:adp-flp-config', {
            launchAsSubGen: true,
            vscode,
            inbounds,
            layer,
            prompts,
            data: { projectRootPath },
            appWizard
        });
        logger.info(`'@sap/fiori:adp-flp-config' was called.`);
    } catch (e) {
        logger.error(e);
        throw new Error(`Could not call '@sap/fiori:adp-flp-config' sub-generator: ${e.message}`);
    }
}

/**
 * Composes the Fiori deploy-config sub-generator using `composeWith`. This sub-generator configures
 * deployment for Fiori applications, such as to ABAP or Cloud Foundry environments.
 *
 * @param {DeployGenOptions} options - Deployment generator input options
 * @param {string} options.projectName - Project name
 * @param {string} options.targetFolder - Folder where project will be generated
 * @param {string} options.connectedSystem - Connected system data
 * @param {Endpoint} options.system - (Optional) System endpoint with connection details
 * @param {Generator['composeWith']} composeWith - Yeoman composeWith method from generator context
 * @param {ToolsLogger} logger - Logger for info and error output
 * @param {AppWizard} appWizard - Optional AppWizard instance for displaying UI messages
 */
export function addDeployGen(
    { projectName, projectPath, connectedSystem, system }: DeployGenOptions,
    composeWith: Generator['composeWith'],
    logger: ToolsLogger,
    appWizard: AppWizard
): void {
    try {
        const subGenPromptOptions = {
            ui5AbapRepo: { hideIfOnPremise: true },
            transportInputChoice: { hideIfOnPremise: true },
            overwriteAbapConfig: { hide: true },
            packageAutocomplete: {
                additionalValidation: PACKAGE_ADDITIONAL_VALIDATION
            },
            packageManual: {
                additionalValidation: PACKAGE_ADDITIONAL_VALIDATION
            },
            targetSystem: { additionalValidation: { shouldRestrictDifferentSystemType: true } }
        };

        const generatorOptions = {
            launchDeployConfigAsSubGenerator: true,
            projectName,
            projectPath,
            telemetryData: { appType: 'Fiori Adaptation' },
            appWizard,
            logWrapper: logger,
            target: 'abap',
            subGenPromptOptions,
            ...(connectedSystem && { connectedSystem }),
            ...(system?.Name && { appGenDestination: system.Name }),
            ...(system?.Client && { appGenClient: system.Client }),
            ...(system?.Url && { appGenServiceHost: system.Url })
        };

        composeWith('@sap/fiori:deploy-config', generatorOptions);
        logger.info(`'@sap/fiori:deploy-config' was called.`);
    } catch (e) {
        logger.error(e);
        throw new Error(`Could not call '@sap/fiori:deploy-config' sub-generator: ${e.message}`);
    }
}

/**
 * Composes the extension project sub-generator if the base app is unsupported.
 *
 * @param {ExtProjectGenProps} options - Required options for composing the generator.
 * @param {ConfigAnswers} options.configAnswers - The collected config prompt answers.
 * @param {AttributesAnswers} options.attributeAnswers - The collected attribute prompt answers.
 * @param {SystemLookup} options.systemLookup - Instance of the system lookup.
 * @param {Generator['composeWith']} composeWith - `composeWith` method provided by Yeoman Generator instance.
 * @param {ToolsLogger} logger - Logger instance for tracking operations and errors.
 * @param {AppWizard} appWizard - AppWizard instance for interacting with the UI (optional).
 */
export async function addExtProjectGen(
    { configAnswers, attributeAnswers, systemLookup }: ExtProjectGenProps,
    composeWith: Generator['composeWith'],
    logger: ToolsLogger,
    appWizard?: AppWizard
): Promise<void> {
    try {
        const data = await getExtensionProjectData(configAnswers, attributeAnswers, systemLookup);

        composeWith('@bas-dev/extensibility-sub', {
            arguments: [JSON.stringify(data)],
            appWizard
        });
        logger.info(`'@bas-dev/generator-extensibility-sub' was called.`);
    } catch (e) {
        logger.info(t('error.creatingExtensionProjectError'));
        logger.error(e);
        throw new Error(`Could not call '@bas-dev/generator-extensibility-sub' sub-generator: ${e.message}`);
    }
}
