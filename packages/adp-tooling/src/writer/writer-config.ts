import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { getAbapTarget } from '../client';
import { getCustomConfig } from './project-utils';
import { getNewModelEnhanceWithChange } from './descriptor-content';
import type { AdpWriterConfig, ConfigAnswers, FlexLayer, PackageJson } from '../types';

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

    const target = await getAbapTarget(configAnswers.system, logger);
    const customConfig = getCustomConfig(operationsType, packageJson);

    return {
        app: {
            id: defaults.namespace,
            reference: configAnswers.application.id,
            layer,
            title: '',
            content: [getNewModelEnhanceWithChange()]
        },
        customConfig,
        target,
        options: {
            fioriTools: true,
            enableTypeScript: false
        }
    };
}
