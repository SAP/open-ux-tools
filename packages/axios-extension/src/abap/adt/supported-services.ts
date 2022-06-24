import type { AdtCategory } from 'abap/types';

/**
 * Services implemented by AbapServiceProvider
 */
export enum AdtServiceName {
    AtoSettings,
    TransportRequests
}

export const AdtServiceConfigs: Record<AdtServiceName, AdtCategory> = {
    [AdtServiceName.AtoSettings]: {
        scheme: 'http://www.sap.com/adt/categories/ato',
        term: 'settings'
    },
    [AdtServiceName.TransportRequests]: {
        scheme: 'http://www.sap.com/adt/categories/cts',
        term: 'transportchecks'
    }
};
