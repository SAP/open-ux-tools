import { type Destination } from '@sap-ux/btp-utils';
import { getTelemPropertyDestinationType } from '../../../src/telemetry/telemetry';

describe('Telemetry', () => {
    test('getTelemPropertyDestinationType', () => {
        const destFull1 = {
            Name: 'dest1',
            Host: 'http://dest1.com/full/service/path',
            WebIDEAdditionalData: `full_url`,
            WebIDEUsage: 'odata_gen'
        } as Destination;
        expect(getTelemPropertyDestinationType(destFull1)).toBe('GenericODataFullUrlDest');

        const destPart = {
            Name: 'dest1',
            Host: 'http://dest1.com/part/',
            WebIDEUsage: 'odata_gen'
        } as Destination;
        expect(getTelemPropertyDestinationType(destPart)).toBe('GenericODataPartialUrlDest');

        const destOdataGen = {
            Name: 'des1',
            Host: 'http://dest1.com/',
            WebIDEUsage: 'odata_abap'
        } as Destination;
        expect(getTelemPropertyDestinationType(destOdataGen)).toBe('AbapODataCatalogDest');

        const destUnknown = {
            Name: 'dest1',
            Host: 'http://dest1.com/',
            WebIDEUsage: 'anything_else'
        } as Destination;
        expect(getTelemPropertyDestinationType(destUnknown)).toBe('Unknown');
    });
});
