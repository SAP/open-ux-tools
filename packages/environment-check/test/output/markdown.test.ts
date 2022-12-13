import type { EnvironmentCheckResult } from '../../src';
import { Check, convertResultsToMarkdown, UrlServiceType } from '../../src';
import { isAppStudio } from '@sap-ux/btp-utils';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;

const requestedChecksSet = [Check.Environment, Check.Destinations, Check.EndpointResults];

const data = {
    endpointResults: {
        ABC: {
            catalogService: {
                v2: { results: [] },
                v4: {}
            },
            HTML5DynamicDestination: true
        },
        DEF: {
            catalogService: {
                v2: { results: [] },
                v4: {}
            },
            HTML5DynamicDestination: true
        },
        JUST_WRONG: {
            catalogService: {
                v2: { results: [] },
                v4: {}
            },
            HTML5DynamicDestination: true
        },
        SYS: {
            catalogService: {
                v2: {
                    results: [
                        {
                            id: 'SERVICE_ID',
                            name: 'SERVICE_NAME',
                            path: 'odata/SERVICE',
                            odataVersion: '2',
                            serviceVersion: '2'
                        },
                        {
                            id: 'OTHER_SERVICE_ID',
                            name: 'OTHER_SERVICE_NAME',
                            path: '/odata/CATALOGSERVICE;v=2/ServiceCollection',
                            serviceVersion: '2',
                            odataVersion: '2'
                        }
                    ]
                },
                v4: {}
            }
        },
        XYZ: {
            catalogService: {
                v2: { results: [] },
                v4: {}
            },
            HTML5DynamicDestination: true
        }
    },
    messages: [
        {
            severity: 'info',
            text: 'Found 80 destinations'
        },
        {
            severity: 'info',
            text: "Checking destination 'SYS'"
        },
        {
            severity: 'info',
            text: "v2 catalog request for destination 'SYS' returned 739 services"
        },
        {
            severity: 'error',
            text: "v4 catalog service for destination 'SYS' not available"
        },
        {
            severity: 'debug',
            text: 'Request to URL: \'http://SYS.dest/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?$expand=DefaultSystem($expand=Services)&sap-client=100\' failed with message: Request failed with status code 403. Complete error object: \n{\n    "message": "Request failed with status code 403",\n    "name": "Error",\n    "stack": "Error: Request failed with status code 403\\n    at module.exports (/tmp/vscode-unpacked/sap-ux-application-modeler-extension-1.4.2.vsix/extension/dist/src/extension-min.js:2:5470354)\\n    at module.exports (/tmp/vscode-unpacked/sap-ux-application-modeler-extension-1.4.2.vsix/extension/dist/src/extension-min.js:2:5474468)\\n    at IncomingMessage.<anonymous> (/tmp/vscode-unpacked/sap-ux-application-modeler-extension-1.4.2.vsix/extension/dist/src/extension-min.js:2:5460363)\\n    at IncomingMessage.emit (events.js:326:22)\\n    at endReadableNT (_stream_readable.js:1241:12)\\n    at processTicksAndRejections (internal/process/task_queues.js:84:21)",\n    "config": {\n        "url": "http://SYS.dest/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?$expand=DefaultSystem($expand=Services)&sap-client=100",\n        "method": "get",\n        "headers": {\n            "Accept": "application/json, text/plain, */*",\n            "User-Agent": "axios/0.21.4",\n            "host": "sh4.dest"\n        },\n        "auth": {\n            "username": "davesh"\n        },\n        "transformRequest": [\n            null\n        ],\n        "transformResponse": [\n            null\n        ],\n        "timeout": 0,\n        "xsrfCookieName": "XSRF-TOKEN",\n        "xsrfHeaderName": "X-XSRF-TOKEN",\n        "maxContentLength": -1,\n        "maxBodyLength": -1,\n        "transitional": {\n            "silentJSONParsing": true,\n            "forcedJSONParsing": true,\n            "clarifyTimeoutError": false\n        }\n    }\n}'
        }
    ],
    environment: {
        basDevSpace: 'SAP Fiori',
        developmentEnvironment: 'Business Application Studio',
        versions: {
            node: '16.17.0',
            v8: '7.8.279.23-node.56',
            uv: '1.40.0',
            zlib: '1.2.11',
            ares: '1.17.2',
            modules: '72',
            openssl: '1.1.1k'
        },
        platform: 'linux',
        toolsExtensions: {
            fioriGenVersion: '1',
            cloudCli: '2',
            appWizard: '2',
            ui5LanguageAssistant: '2',
            xmlToolkit: '2',
            annotationMod: '2.2',
            appMod: '2',
            help: '2',
            serviceMod: '2.4',
            cds: '2'
        }
    },
    endpoints: [
        {
            Name: 'ABC',
            Type: 'HTTP',
            Authentication: 'BasicAuthentication',
            ProxyType: 'Internet',
            'HTML5.DynamicDestination': 'true',
            WebIDEAdditionalData: 'full_url',
            Description: 'Destination description',
            'HTML5.Timeout': '60000',
            TrustAll: true,
            WebIDEEnabled: 'true',
            WebIDEUsage: 'odata_gen',
            Host: 'https://abc-api.org',
            UrlServiceType: UrlServiceType.FullServiceUrl
        },
        {
            Name: 'DEF',
            Type: 'HTTP',
            Authentication: 'BasicAuthentication',
            ProxyType: 'Internet',
            'HTML5.DynamicDestination': 'true',
            Description: 'def',
            'HTML5.Timeout': '60000',
            TrustAll: true,
            WebIDEEnabled: 'true',
            WebIDEUsage: 'odata_abap',
            Host: 'https://def.service',
            UrlServiceType: UrlServiceType.CatalogServiceUrl
        },
        {
            Name: 'XYZ',
            Type: 'HTTP',
            Authentication: 'BasicAuthentication',
            ProxyType: 'Internet',
            'HTML5.DynamicDestination': 'true',
            Description: 'xyz',
            TrustAll: true,
            WebIDEEnabled: 'true',
            WebIDEUsage: 'odata_gen',
            Host: 'https://service',
            UrlServiceType: UrlServiceType.PartialUrl
        },
        {
            Name: 'SYS',
            Type: 'HTTP',
            Authentication: 'BasicAuthentication',
            ProxyType: 'Internet',
            'HTML5.DynamicDestination': 'true',
            WebIDEAdditionalData: 'full_url',
            Description: 'sys',
            'HTML5.Timeout': '60000',
            TrustAll: true,
            WebIDEEnabled: 'true',
            WebIDEUsage: 'odata_gen',
            Host: 'https://sys-api.s4hana.ondemand.com/sap/opu/odata/sap/API_BUSINESS_PARTNER',
            UrlServiceType: UrlServiceType.CatalogServiceUrl
        },
        {
            Name: 'JUST_WRONG',
            Type: 'HTTP',
            ProxyType: 'Internet',
            WebIDEAdditionalData: 'full_url',
            Description: 's4',
            WebIDEEnabled: 'true',
            WebIDEUsage: 'odata_gen,odata_abap',
            Host: '',
            UrlServiceType: UrlServiceType.InvalidUrl
        },
        {
            Name: 'DUPLICATE'
        },
        {
            Name: 'DUPLICATE'
        }
    ],
    markdownTitle: `SAP Fiori tools - Environment Check in SAP Business Application Studio`,
    requestedChecks: requestedChecksSet
};

describe('Test to check conversion to markdown, convertResultsToMarkdown()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockIsAppStudio.mockReturnValue(true);
    });
    test('Check if writer is creating output appropriately', () => {
        const result = convertResultsToMarkdown(data as unknown as EnvironmentCheckResult);
        expect(result.split('<sub>created at')[0]).toMatchSnapshot();
    });
    test('Check output for empty results', () => {
        const envCheckResults = {
            markdownTitle: `SAP Fiori tools - Environment Check`,
            requestedChecks: requestedChecksSet
        };
        const result = convertResultsToMarkdown(envCheckResults);
        expect(result).toMatch('# SAP Fiori tools - Environment Check');
        expect(result).toMatch('## Environment');
        expect(result).toMatch('## Destination Details (0)');
        expect(result).toMatch('## All Destinations (0)');
        expect(result).toMatch('## Messages (0)');
    });
    test('Check destination details with no v2 or v4 service', () => {
        const result = convertResultsToMarkdown({
            endpointResults: { ABC: { catalogService: { v2: {}, v4: {} } } },
            requestedChecks: requestedChecksSet
        });
        expect(result).toMatch('V2 catalog service not available');
        expect(result).toMatch('V4 catalog service not available');
    });
    test('Check destination details with v4 service but not v2 service', () => {
        const result = convertResultsToMarkdown({
            endpointResults: {
                ABC: {
                    catalogService: {
                        v2: {},
                        v4: {
                            results: []
                        }
                    }
                }
            },
            requestedChecks: requestedChecksSet
        });
        expect(result).toMatch('V2 catalog service not available');
        expect(result).toMatch('V4 catalog call returned');
    });
    test('Check destination details with both v2 and v4 services available', () => {
        const destResultsCheck = [Check.Destinations, Check.EndpointResults];
        const result = convertResultsToMarkdown({
            endpointResults: {
                ABC: {
                    catalogService: {
                        v2: {
                            results: []
                        },
                        v4: {
                            results: []
                        }
                    }
                }
            },
            requestedChecks: destResultsCheck
        });
        expect(result).toMatch('V2 catalog call returned');
        expect(result).toMatch('V4 catalog call returned');
    });
    test('Check empty destination table', () => {
        const result = convertResultsToMarkdown({
            endpoints: [],
            requestedChecks: requestedChecksSet
        });
        expect(result.split('<sub>created at')[0]).toMatchSnapshot();
    });

    test('Check stored system details - no systems', () => {
        const destResultsCheck = [Check.StoredSystems, Check.EndpointResults];
        const result = convertResultsToMarkdown({
            endpointResults: {},
            requestedChecks: destResultsCheck
        });
        expect(result).toMatch('No SAP system details');
    });
    test('Check stored system details with v2/v4 and service checks', () => {
        const destResultsCheck = [Check.StoredSystems, Check.EndpointResults];
        const result = convertResultsToMarkdown({
            endpointResults: {
                ABC: {
                    catalogService: {
                        v2: {
                            results: []
                        },
                        v4: {
                            results: []
                        }
                    },
                    isAtoCatalog: true,
                    isSapUi5Repo: true,
                    isTransportRequests: true
                },
                XYZ: {
                    catalogService: {
                        v2: {
                            results: []
                        },
                        v4: {
                            results: []
                        }
                    },
                    isAtoCatalog: false,
                    isSapUi5Repo: false,
                    isTransportRequests: false
                }
            },
            requestedChecks: destResultsCheck
        });
        expect(result).toMatch('V2 catalog call returned');
        expect(result).toMatch('V4 catalog call returned');
        expect(result).toMatch('ATO catalog available');
        expect(result).toMatch('ATO catalog is not available');
        expect(result).toMatch(
            'SAPUI5 repository service (sap/opu/odata/UI5/ABAP_REPOSITORY_SRV) for deployment available'
        );
        expect(result).toMatch(
            ' SAPUI5 repository service (sap/opu/odata/UI5/ABAP_REPOSITORY_SRV) for deployment cannot be determined'
        );
        expect(result).toMatch('Ability to retrieve available Transport Requests');
        expect(result).toMatch('Unable to retrieve available Transport Requests');
    });

    test('Check markdown with no destinations checked', () => {
        const envCheck = [Check.Environment];
        const result = convertResultsToMarkdown({
            environment: data.environment as any,
            requestedChecks: envCheck
        });
        expect(result.split('<sub>created at')[0]).toMatchSnapshot();
    });

    test('Check markdown with no process versions', () => {
        const envCheck = [Check.Environment];
        const newEnv = data.environment;
        newEnv.versions = {} as any;
        const result = convertResultsToMarkdown({
            environment: newEnv as any,
            requestedChecks: envCheck
        });
        expect(result.split('<sub>created at')[0]).toMatchSnapshot();
    });

    test('Check markdown with no checks', () => {
        const result = convertResultsToMarkdown({
            environment: data.environment as any,
            requestedChecks: []
        });
        expect(result.split('<sub>created at')[0]).toMatchSnapshot();
    });
});
