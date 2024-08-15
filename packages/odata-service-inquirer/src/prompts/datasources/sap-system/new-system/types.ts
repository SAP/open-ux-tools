import type { ODataVersion } from '@sap-ux/axios-extension';

/**
 * Sap System service answer
 */
export type ServiceAnswer = {
    servicePath: string;
    serviceODataVersion: ODataVersion;
    toString: () => string;
    serviceType?: string;
};

export const newSystemPromptNames = {
    newSystemType: 'newSystemType',
    newSystemUrl: 'newSystemUrl',
    newSystemAuthType: 'newSystemAuthType'
} as const;
