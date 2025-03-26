import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { getAbapTarget } from '../client';
import { getCustomConfig } from './project-utils';
import { getNewModelEnhanceWithChange } from './descriptor-content';
import type { AdpWriterConfig, ConfigAnswers, FlexLayer } from '../types';

/**
 * Generates the configuration object for the Adaptation Project.
 *
 * @param {AbapServiceProvider} provider - The ABAP service provider instance used for retrieving system-specific information.
 * @param {ConfigAnswers} configAnswers - The configuration answers provided by the user, including system and application details.
 * @param {FlexLayer} layer - The FlexLayer indicating the deployment layer (e.g., CUSTOMER_BASE or VENDOR).
 * @param {object} defaults - The default project parameters.
 * @param {string} defaults.namespace - The default namespace to be used for the project.
 * @param {ToolsLogger} logger - The logger instance for logging debug and error messages.
 * @returns {Promise<AdpWriterConfig>} A promise that resolves to the generated ADP writer configuration.
 */
export async function getConfig(
    provider: AbapServiceProvider,
    configAnswers: ConfigAnswers,
    layer: FlexLayer,
    defaults: {
        namespace: string;
    },
    logger: ToolsLogger
): Promise<AdpWriterConfig> {
    const ato = await provider.getAtoInfo();
    const operationsType = ato.operationsType ?? 'P';

    const target = await getAbapTarget(configAnswers.system, logger);
    const customConfig = getCustomConfig(operationsType);

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
