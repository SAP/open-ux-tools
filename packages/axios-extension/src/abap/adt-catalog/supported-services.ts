import type { AdtCategory } from 'abap/types';

/**
 * Services implemented by AbapServiceProvider
 */
export enum AdtServiceName {
    AtoSettings,
    TransportChecks,
    CreateTransport
}

export const AdtServiceConfigs: Record<AdtServiceName, AdtCategory> = {
    [AdtServiceName.AtoSettings]: {
        scheme: 'http://www.sap.com/adt/categories/ato',
        term: 'settings'
    },
    [AdtServiceName.TransportChecks]: {
        scheme: 'http://www.sap.com/adt/categories/cts',
        term: 'transportchecks'
    },
    [AdtServiceName.CreateTransport]: {
        scheme: 'http://www.sap.com/adt/categories/cts',
        term: 'transportmanagement'
    }
};
