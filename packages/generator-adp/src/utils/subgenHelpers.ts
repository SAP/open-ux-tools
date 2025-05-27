import type Generator from 'yeoman-generator';
import { MessageType, type AppWizard } from '@sap-devx/yeoman-ui-types';

import type { Manifest } from '@sap-ux/project-access';
import type { ILogWrapper } from '@sap-ux/fiori-generator-shared';
import type { ConfigAnswers, AttributesAnswers, SystemLookup } from '@sap-ux/adp-tooling';

import { t } from './i18n';
import { getExtensionProjectData, resolveNodeModuleGenerator } from '../app/extension-project';

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
    projectRootPath: string;
    system: string;
    manifest: Manifest;
}

/**
 * Options required to invoke the deploy-config subgenerator.
 */
interface DeployGenOptions {
    projectName: string;
    targetFolder: string;
    applicationType: string;
    client?: string;
    connectedSystem: string;
    destinationName?: string;
}

/**
 * Composes the FLP config sub-generator using `composeWith`. This generator is used to scaffold
 * the FLP (Fiori Launchpad) configuration for the project.
 *
 * @param {FlpGenProps} options - Configuration object for the FLP generator.
 * @param {string} options.projectRootPath - Full path to the root of the project.
 * @param {string} options.system - System identifier string.
 * @param {Manifest} options.manifest - The manifest object to pass to the FLP generator.
 * @param {Generator['composeWith']} composeWith - `composeWith` method provided by Yeoman Generator instance.
 * @param {ILogWrapper} logger - Logger instance for tracking operations and errors.
 * @param {AppWizard} appWizard - AppWizard instance for interacting with the UI (optional).
 */
export function addFlpGen(
    { projectRootPath, system, manifest }: FlpGenProps,
    composeWith: Generator['composeWith'],
    logger: ILogWrapper,
    appWizard?: AppWizard
): void {
    try {
        composeWith(require.resolve('@sap-ux/adp-flp-config-sub-generator/generators/app'), {
            launchAsSubGen: true,
            manifest,
            system,
            data: { projectRootPath },
            appWizard
        });
        logger.info(`'@sap-ux/adp-flp-config-sub-generator' was called.`);
    } catch (e) {
        logger.error(e);
        throw new Error(`Could not call sub-generator: ${e.message}`);
    }
}

/**
 * Composes the Fiori deploy-config sub-generator using `composeWith`. This sub-generator configures
 * deployment for Fiori applications, such as to ABAP or Cloud Foundry environments.
 *
 * Optional properties on the `service` object will be passed only if present.
 *
 * @param options - Deployment generator input options
 * @param composeWith - The composeWith method from the main Yeoman generator
 * @param logger - Logger for diagnostics
 * @param appWizard - Optional AppWizard instance for UI events
 */
export function addDeployGen(
    { projectName, targetFolder, applicationType, client, connectedSystem, destinationName }: DeployGenOptions,
    composeWith: Generator['composeWith'],
    logger: ILogWrapper,
    appWizard?: AppWizard
): void {
    try {
        const generatorOptions = {
            launchDeployConfigAsSubGenerator: true,
            projectName,
            projectPath: targetFolder,
            telemetryData: { appType: applicationType },
            appWizard,
            logWrapper: logger,
            ...(client && { appGenClient: client }),
            ...(connectedSystem && { connectedSystem }),
            ...(destinationName && { appGenDestination: destinationName })
        };

        composeWith(require.resolve('@sap-ux/deploy-config-sub-generator/generators/app'), generatorOptions);
        logger.info(`'@sap-ux/deploy-config-sub-generator' was called.`);
    } catch (e: any) {
        logger.error(`Could not call deploy-config sub-generator: ${e.message}`);
        appWizard?.showError?.(t('error.callingDeployGen'), MessageType.notification);
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
 * @param {ILogWrapper} logger - Logger instance for tracking operations and errors.
 * @param {AppWizard} appWizard - AppWizard instance for interacting with the UI (optional).
 */
export async function addExtProjectGen(
    { configAnswers, attributeAnswers, systemLookup }: ExtProjectGenProps,
    composeWith: Generator['composeWith'],
    logger: ILogWrapper,
    appWizard?: AppWizard
): Promise<void> {
    try {
        const data = await getExtensionProjectData(configAnswers, attributeAnswers, systemLookup);
        const generator = resolveNodeModuleGenerator();

        composeWith(generator!, {
            arguments: [JSON.stringify(data)],
            appWizard
        });
        logger.info(`'@bas-dev/generator-extensibility-sub' was called.`);
    } catch (e: any) {
        logger.info(t('error.creatingExtensionProjectError'));
        logger.error(e.message);
        appWizard?.showError(e.message, MessageType.notification);
    }
}
