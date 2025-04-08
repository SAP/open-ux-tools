import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { FlexLayer } from '../types';
import { getProviderConfig } from '../abap';
import { getCustomConfig } from './project-utils';
import { getNewModelEnhanceWithChange } from './descriptor-content';
import type { AdpWriterConfig, ConfigAnswers, PackageJson } from '../types';
import { UI5VersionInfo, getFormattedVersion, getOfficialBaseUI5VersionUrl } from '../ui5';

interface ConfigOptions {
    /**
     * The ABAP service provider instance used to retrieve system-specific information.
     */
    provider: AbapServiceProvider;
    /**
     * User-provided configuration details, including system and application data.
     */
    configAnswers: ConfigAnswers;
    /**
     * The FlexLayer indicating the deployment layer (e.g., CUSTOMER_BASE or VENDOR).
     */
    layer: FlexLayer;
    /**
     * Default project parameters.
     */
    defaults: {
        /**
         * The default namespace for the project.
         */
        namespace: string;
    };
    /**
     * The package.json information used to generate custom configuration.
     */
    packageJson: PackageJson;
    /**
     * Logger instance for debugging and error reporting.
     */
    logger: ToolsLogger;
}

/**
 * Generates the configuration object for the Adaptation Project.
 *
 * @param {ConfigOptions} options - The configuration options.
 * @param {AbapServiceProvider} options.provider - The ABAP service provider instance.
 * @param {ConfigAnswers} options.configAnswers - User-provided configuration details (system, application, etc.).
 * @param {FlexLayer} options.layer - The FlexLayer indicating the deployment layer.
 * @param {object} options.defaults - Default project parameters.
 * @param {string} options.defaults.namespace - The default namespace to be used.
 * @param {PackageJson} options.packageJson - The package.json information for generating custom configuration.
 * @param {ToolsLogger} options.logger - The logger for debugging and error logging.
 * @returns {Promise<AdpWriterConfig>} A promise that resolves to the generated ADP writer configuration.
 */
export async function getConfig(options: ConfigOptions): Promise<AdpWriterConfig> {
    const { configAnswers, defaults, layer, logger, packageJson, provider } = options;
    const ato = await provider.getAtoInfo();
    const operationsType = ato.operationsType ?? 'P';

    const target = await getProviderConfig(configAnswers.system, logger);
    const customConfig = getCustomConfig(operationsType, packageJson);

    const isCloudProject = await provider.isAbapCloud();
    const isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;

    const ui5Info = UI5VersionInfo.getInstance(layer);
    const ui5Version = isCloudProject ? ui5Info.getLatestVersion() : ui5Info.getVersionToBeUsed('', isCustomerBase);

    return {
        app: {
            id: defaults.namespace,
            reference: configAnswers.application.id,
            layer,
            title: '',
            content: [getNewModelEnhanceWithChange()]
        },
        ui5: {
            minVersion: ui5Version?.split(' ')[0],
            version: getFormattedVersion(ui5Version),
            frameworkUrl: getOfficialBaseUI5VersionUrl(ui5Version)
        },
        customConfig,
        target,
        options: {
            fioriTools: true,
            enableTypeScript: false
        }
    };
}
