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
