import { DestinationProxyType } from '../dist';
import {
    Destination,
    isAbapEnvironmentOnBtp,
    isAbapSystem,
    isGenericODataDestination,
    isOnPremiseDestination,
    isPartialUrlDestination,
    isS4HC,
    WebIDEAdditionalData,
    WebIDEUsage,
    getDisplayName,
    Suffix,
    isFullUrlDestination,
    isHTML5DynamicConfigured,
    ProxyType
} from '../src';
import destinations from './mockResponses/destinations.json';

const destination: Destination = destinations.find((destination) => destination.Name === 'NO_ADDITIONAL_PROPERTIES')!;
const S4HCDestination: Destination = destinations.find((destination) => destination.Name === 'S4HC')!;
const btpDestination: Destination = destinations.find((destination) => destination.Name === 'ABAP_ON_BTP')!;

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
            expect(isGenericODataDestination({ ...destination, WebIDEUsage: WebIDEUsage.ODATA_GENERIC })).toBe(true);
        });

        it('WebIDEUsage contains both odata_generic & odata_abap', () => {
            expect(
                isGenericODataDestination({
                    ...destination,
                    WebIDEUsage: [WebIDEUsage.ODATA_ABAP, WebIDEUsage.ODATA_GENERIC].join(',')
                })
            ).toBe(false);
        });

        it('not a generic OData destination', () => {
            expect(isGenericODataDestination(destination)).toBe(false);
            expect(isGenericODataDestination({ ...destination, WebIDEUsage: 'anything' })).toBe(false);
        });
    });

    describe('isPartialUrlDest', () => {
        it('destination not set to full_url', () => {
            expect(isPartialUrlDestination({ ...destination, WebIDEUsage: WebIDEUsage.ODATA_GENERIC })).toBe(true);
        });

        it('not a generic OData destination', () => {
            expect(isPartialUrlDestination(destination)).toBe(false);
            expect(isPartialUrlDestination({ ...destination, WebIDEUsage: 'anything' })).toBe(false);
        });
    });

    describe('isFullUrlDest', () => {
        it('destination set to full_url', () => {
            expect(
                isFullUrlDestination({
                    ...destination,
                    WebIDEUsage: WebIDEUsage.ODATA_GENERIC,
                    WebIDEAdditionalData: WebIDEAdditionalData.FULL_URL
                })
            ).toBe(true);
        });

        it('not a generic OData destination', () => {
            expect(isFullUrlDestination(destination)).toBe(false);
            expect(isFullUrlDestination({ ...destination, WebIDEUsage: 'anything' })).toBe(false);
        });
    });

    describe('isOnPremise', () => {
        it('destination set to onPremise', () => {
            expect(
                isOnPremiseDestination({
                    ...destination,
                    ProxyType: DestinationProxyType.ON_PREMISE,
                    WebIDEAdditionalData: WebIDEAdditionalData.FULL_URL
                })
            ).toBe(true);
        });

        it('Destination is internet facing', () => {
            expect(
                isOnPremiseDestination(
                    destinations.find((destination) => destination.Name === 'ABAP_ON_BTP') as Destination
                )
            ).toBe(false);
        });
    });

    describe('isHTML5DynamicConfigured', () => {
        it('destination is configured with HTML5.DynamicDestination', () => {
            expect(
                isHTML5DynamicConfigured({
                    ...destination,
                    'HTML5.DynamicDestination': 'true'
                })
            ).toBe(true);
        });

        it('Destination is missing HTML5.DynamicDestination', () => {
            expect(
                isOnPremiseDestination(
                    destinations.find((destination) => destination.Name === 'ABAP_ON_BTP') as Destination
                )
            ).toBe(false);
        });
    });

    describe('getDisplayName', () => {
        it('getDisplayName without S4HC and SCP enabled', () => {
            expect(getDisplayName({ ...destination }, '~TestUser')).toEqual(`${destination.Name} [~TestUser]`);
        });

        it('getDisplayName with SCP enabled', () => {
            expect(getDisplayName({ ...btpDestination }, '~TestUser')).toEqual(
                `${btpDestination.Name} (${Suffix.BTP}) [~TestUser]`
            );
        });

        it('getDisplayName with S4HC enabled', () => {
            expect(getDisplayName(S4HCDestination, '~TestUser')).toEqual(
                `${S4HCDestination.Name} (${Suffix.S4HC}) [~TestUser]`
            );
        });

        it('getDisplayName with S4HC enabled and no user appended', () => {
            expect(getDisplayName(S4HCDestination)).toEqual(`${S4HCDestination.Name} (${Suffix.S4HC})`);
        });

        it('getDisplayName with S4HC already appended to the name', () => {
            expect(getDisplayName({ ...S4HCDestination, Name: `${S4HCDestination.Name} (${Suffix.S4HC})` })).toEqual(
                `${S4HCDestination.Name} (${Suffix.S4HC})`
            );
        });
    });

    describe('isS4HC', () => {
        it('Authentication set to NoAuthentication', () => {
            expect(isS4HC({ ...destination })).toBe(false);
        });

        it('Authentication set to SamlAssertion and is internet facing', () => {
            expect(
                isS4HC({
                    ...S4HCDestination
                })
            ).toBe(true);
        });
        it('Authentication set to SamlAssertion and is OnPremise', () => {
            expect(
                isS4HC({
                    ...S4HCDestination,
                    ProxyType: ProxyType.ON_PREMISE
                })
            ).toBe(false);
        });
    });
});
