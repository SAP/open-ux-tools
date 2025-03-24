import type { AbapProvider } from '../client';
import { getCustomConfig } from './project-utils';
import { getNewModelEnhanceWithChange } from './descriptor-content';
import type { AdpWriterConfig, ConfigAnswers, FlexLayer } from '../types';

/**
 * A class that handles the construction of the ADP writer configuration needed from generating an Adaptation Project.
 */
export class WriterConfig {
    /**
     * Constructs an instance of WriterConfig class.
     *
     * @param {AbapProvider} abapProvider - The instance of AbapProvider class.
     * @param {FlexLayer} layer - The FlexLayer used to determine the base (customer or otherwise).
     */
    constructor(private readonly abapProvider: AbapProvider, private readonly layer: FlexLayer) {}

    /**
     * Generates the configuration object for the Adaptation Project.
     *
     * @param {ConfigAnswers} configAnswers - The configuration answers (i.e system, application).
     * @param {object} defaults - Default project parameters.
     * @param {string} defaults.namespace - The namespace for the project.
     * @returns {Promise<AdpWriterConfig>} The generated project configuration.
     */
    public async getConfig(
        configAnswers: ConfigAnswers,
        defaults: {
            namespace: string;
        }
    ): Promise<AdpWriterConfig> {
        const provider = this.abapProvider.getProvider();
        const ato = await provider.getAtoInfo();
        const operationsType = ato.operationsType ?? 'P';

        const target = await this.abapProvider.determineTarget(configAnswers.system, {});
        const customConfig = getCustomConfig(operationsType);

        return {
            app: {
                id: defaults.namespace,
                reference: configAnswers.application.id,
                layer: this.layer,
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
}
