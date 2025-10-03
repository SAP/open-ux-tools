import type { ServiceProvider } from '@sap-ux/axios-extension';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { originToRelative, parseOdataVersion, removeCircularFromServiceProvider } from '../../../src/utils';

describe('Utils', () => {
    test('parseOdataVersion - should return the odata version of metadata', async () => {
        let metadata: string = await readFile(join(__dirname, 'fixtures/metadata_v2.xml'), 'utf8');
        let odataVersion = parseOdataVersion(metadata);
        expect(odataVersion.odataVersion).toBe(OdataVersion.v2);

        metadata = await readFile(join(__dirname, 'fixtures/metadata_v4.xml'), 'utf8');
        odataVersion = parseOdataVersion(metadata);
        expect(odataVersion.odataVersion).toBe(OdataVersion.v4);

        metadata = await readFile(join(__dirname, 'fixtures/invalid_metadata.xml'), 'utf8');
        expect(() => parseOdataVersion(metadata)).toThrow('The service metadata is invalid.');
    });

    test('originToRelative - should replace origin URI with relative path segment in metadata', async () => {
        const metadata: string = await readFile(join(__dirname, 'fixtures/metadata_origin.xml'), 'utf8');
        const noOrigin = originToRelative(metadata);
        expect(noOrigin).toMatchInlineSnapshot(`
            "<?xml version="1.0" encoding="utf-8"?>
            <edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx"
                       xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"
                       xmlns:sap="http://www.sap.com/Protocols/SAPData">
                <edmx:Reference
                        Uri="./sap/opu/odata/iwfnd/catalogservice;v=2/Vocabularies(TechnicalName='%2FIWBEP%2FVOC_COMMON',Version='0001',SAP__Origin='LOCAL')/$value"
                        xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:Include Namespace="com.sap.vocabularies.Common.v1" Alias="Common"/>
                </edmx:Reference>
                <edmx:Reference
                        Uri="./sap/opu/odata/iwfnd/catalogservice;v=2/Vocabularies(TechnicalName='%2FIWBEP%2FVOC_COMMON',Version='0001',SAP__Origin='LOCAL')/$value"
                        xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:Include Namespace="com.sap.vocabularies.Common.v1" Alias="Common"/>
                </edmx:Reference>
                <edmx:Reference
                        Uri="./sap/opu/odata4/this/is/an/odata/v4/path"
                        xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:Include Namespace="com.sap.vocabularies.Common.v1" Alias="Common"/>
                </edmx:Reference>
                <edmx:Reference
                        Uri="./sap/opu/odata/iwfnd/catalogservice;v=2/Vocabularies(TechnicalName='%2FIWBEP%2FVOC_CAPABILITIES',Version='0001',SAP__Origin='LOCAL')/$value"
                        xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:Include Namespace="Org.OData.Capabilities.V1" Alias="Capabilities"/>
                </edmx:Reference>
                <edmx:Reference
                        Uri="https://sap.github.io/odata-vocabularies/vocabularies/UI.xml"
                        xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:Include Namespace="Org.OData.Capabilities.V1" Alias="Capabilities"/>
                </edmx:Reference>
            </edmx:Edmx>"
        `);
    });

    test('removeCircularFromServiceProvider - should remove circular refs from serviceProvider log property', async () => {
        const serviceProvider = {} as ServiceProvider;
        // nothing to remove, should return the same serviceProvider
        let cleanedServiceProvider = removeCircularFromServiceProvider(serviceProvider);
        expect(cleanedServiceProvider).toEqual(serviceProvider);

        const serviceProviderWithCirclularLogRefs = {
            log: {
                circleStart: {
                    circleEnd: {}
                }
            },
            services: {
                service1: {
                    log: {
                        circleStart: {
                            circleEnd: {}
                        }
                    }
                },
                service2: {
                    log: {
                        circleStart: {
                            circleEnd: {}
                        }
                    }
                }
            }
        };
        // Create circular references within the log refs
        serviceProviderWithCirclularLogRefs.services.service1.log.circleStart.circleEnd =
            serviceProviderWithCirclularLogRefs.services.service1.log.circleStart;
        serviceProviderWithCirclularLogRefs.services.service2.log.circleStart.circleEnd =
            serviceProviderWithCirclularLogRefs.services.service2.log.circleStart;
        serviceProviderWithCirclularLogRefs.log.circleStart.circleEnd =
            serviceProviderWithCirclularLogRefs.log.circleStart;

        cleanedServiceProvider = removeCircularFromServiceProvider(
            serviceProviderWithCirclularLogRefs as unknown as ServiceProvider
        );
        expect(cleanedServiceProvider).toEqual({
            log: {
                circleStart: {
                    circleEnd: undefined
                }
            },
            services: {
                service1: {
                    log: {
                        circleStart: {
                            circleEnd: undefined
                        }
                    }
                },
                service2: {
                    log: {
                        circleStart: {
                            circleEnd: undefined
                        }
                    }
                }
            }
        });
    });
});
