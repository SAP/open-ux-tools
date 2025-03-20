import { AbapTarget } from '@sap-ux/ui5-config';
import { isAppStudio } from '@sap-ux/btp-utils';
import { getCustomConfig } from './project-utils';
import { AuthenticationType } from '@sap-ux/store';
import { OperationsType } from '@sap-ux/axios-extension';

import { AbapProvider } from '../client';
import { getNewModelEnhanceWithChange } from './descriptor-content';
import { AdpWriterConfig, ConfigAnswers, FlexLayer, SystemDetails } from '../types';

/**
 * Constructs the ABAP target configuration based on the operational context and project type.
 *
 * @param {ConfigAnswers} configAnswers - Detailed configuration answers for the project setup.
 * @param {SystemDetails} systemDetails - Details about the system including URL and client information.
 * @param {boolean} isCloudProject - Flag indicating whether the project is a cloud project.
 * @returns {AbapTarget} The configured ABAP target object.
 */
export function getTarget(
    configAnswers: ConfigAnswers,
    systemDetails: SystemDetails,
    isCloudProject: boolean
): AbapTarget {
    const target: AbapTarget = {
        client: systemDetails.client,
        ...(isAppStudio() ? { destination: configAnswers.system } : { url: systemDetails?.url })
    };

    if (!isAppStudio() && isCloudProject && systemDetails?.authenticationType === AuthenticationType.ReentranceTicket) {
        target['authenticationType'] = AuthenticationType.ReentranceTicket;
    }

    return target;
}

export class WriterConfig {
    constructor(private abapProvider: AbapProvider, private layer: FlexLayer) {}

    /**
     * Generates the configuration object for the Adaptation Project.
     *
     * @param {object} defaults - Default project parameters.
     * @param {string} defaults.namespace - The namespace for the project.
     * @param {string} [defaults.title] - Optional title for the project.
     * @returns {Promise<AdpWriterConfig>} The generated project configuration.
     */
    public async getConfig(
        configAnswers: ConfigAnswers,
        systemDetails: SystemDetails,
        defaults: {
            namespace: string;
        }
    ): Promise<AdpWriterConfig> {
        const provider = this.abapProvider.getProvider();
        const ato = await provider.getAtoInfo();
        const operationsType = ato.operationsType ?? 'P';
        const isCloudProject = operationsType === 'C';

        const target = getTarget(configAnswers, systemDetails, isCloudProject);
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
