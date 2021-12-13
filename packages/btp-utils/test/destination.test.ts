import {
    Destination,
    isAbapSystem,
    isAbapEnvironmentOnBtp,
    WebIDEUsage,
    isGenericODataDest,
    isPartialUrlDest,
    isFullUrlDest
} from '../src';
import destinations from './mockResponses/destinations.json';

const destination: Destination = destinations.find((destination) => destination.Name === 'NO_ADDITIONAL_PROPERTIES')!;

describe('destination', () => {
    describe('isAbapSystem', () => {
        it('WebIDEUsage set to odata_abap', () => {
            expect(isAbapSystem({ ...destination, WebIDEUsage: WebIDEUsage.ODATA_ABAP })).toBe(true);
        });

        it('WebIDEUsage set to abap_cloud', () => {
            expect(isAbapSystem({ ...destination, WebIDEUsage: WebIDEUsage.ABAP_CLOUD })).toBe(true);
        });

        it('sap-client is defined', () => {
            expect(isAbapSystem({ ...destination, 'sap-client': '000' })).toBe(true);
        });

        it('sap-platform parameter is set to ABAP', () => {
            expect(isAbapSystem({ ...destination, 'sap-platform': 'abap' })).toBe(true);
        });

        it('not an ABAP system', () => {
            expect(isAbapSystem(destination)).toBe(false);
            expect(isAbapSystem({ ...destination, WebIDEUsage: 'anything' })).toBe(false);
        });
    });

    describe('isAbapEnvironmentOnBtp', () => {
        it('WebIDEUsage set to abap_cloud', () => {
            expect(isAbapEnvironmentOnBtp({ ...destination, WebIDEUsage: WebIDEUsage.ABAP_CLOUD })).toBe(true);
        });

        it('sap-platform parameter is set to ABAP', () => {
            expect(isAbapEnvironmentOnBtp({ ...destination, 'sap-platform': 'abap' })).toBe(true);
        });

        it('not an ABAP environment on BTP', () => {
            expect(isAbapEnvironmentOnBtp(destination)).toBe(false);
            expect(isAbapEnvironmentOnBtp({ ...destination, WebIDEUsage: WebIDEUsage.ODATA_ABAP })).toBe(false);
        });
    });

    describe('isGenericODataDest', () => {
        it('WebIDEUsage set to odata_generic', () => {
            expect(isGenericODataDest({ ...destination, WebIDEUsage: WebIDEUsage.ODATA_GENERIC })).toBe(true);
        });

        it('WebIDEUsage contains both odata_generic & odata_abap', () => {
            expect(
                isGenericODataDest({
                    ...destination,
                    WebIDEUsage: [WebIDEUsage.ODATA_ABAP, WebIDEUsage.ODATA_GENERIC].join(',')
                })
            ).toBe(false);
        });

        it('not a generic OData destination', () => {
            expect(isGenericODataDest(destination)).toBe(false);
            expect(isGenericODataDest({ ...destination, WebIDEUsage: 'anything' })).toBe(false);
        });
    });

    describe('isPartialUrlDest', () => {
        it('WebIDEUsage set to full_url', () => {
            expect(isPartialUrlDest({ ...destination, WebIDEUsage: WebIDEUsage.ODATA_GENERIC })).toBe(true);
        });

        it('not a generic OData destination', () => {
            expect(isPartialUrlDest(destination)).toBe(false);
            expect(isPartialUrlDest({ ...destination, WebIDEUsage: 'anything' })).toBe(false);
        });
    });

    describe('isFullUrlDest', () => {
        it('WebIDEUsage set to full_url', () => {
            expect(
                isFullUrlDest({
                    ...destination,
                    WebIDEUsage: [WebIDEUsage.ODATA_GENERIC, WebIDEUsage.FULL_URL].join(',')
                })
            ).toBe(true);
        });

        it('not a generic OData destination', () => {
            expect(isFullUrlDest(destination)).toBe(false);
            expect(isFullUrlDest({ ...destination, WebIDEUsage: 'anything' })).toBe(false);
        });
    });
});
