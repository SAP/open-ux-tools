import type { EnvironmentCheckResult } from '../../src';
import { convertResultsToMarkdown, UrlServiceType } from '../../src';

const data = {
    destinationResults: {
        ABC: {
            v2: { results: [] },
            v4: {},
            HTML5DynamicDestination: true
        },
        DEF: {
            v2: { results: [] },
            v4: {},
            HTML5DynamicDestination: true
        },
        JUST_WRONG: {
            v2: { results: [] },
            v4: {},
            HTML5DynamicDestination: true
        },
        SYS: {
            v2: {
                results: [
                    {
                        __metadata: {
                            id: "http://SYS.domain:443/odata/CATALOGSERVICE;v=2/ServiceCollection('SERVICE')",
                            uri: "http://SYS.domain:443/odata/CATALOGSERVICE;v=2/ServiceCollection('SERVICE')",
                            type: 'CATALOGSERVICE.Service'
                        },
                        ID: 'SERVICE_ID',
                        Description: 'OData Service',
                        Title: 'OData Service Title',
                        Author: 'ANY',
                        TechnicalServiceVersion: 1,
                        MetadataUrl: 'http://sys.domain:443/odata/SERVICE/$metadata',
                        TechnicalServiceName: 'ZFINS_ACDOC_PLAN_IMPORT_SRV',
                        ImageUrl: '',
                        ServiceUrl: 'http://sys.domain:443/odata/SERVICE',
                        UpdatedDate: '/Date(1476344102000)/',
                        ReleaseStatus: '',
                        Category: '',
                        IsSapService: true,
                        EntitySets: {
                            __deferred: {
                                uri: "http://sys.domain:443/odata/CATALOGSERVICE;v=2/ServiceCollection('SERVICE')/EntitySets"
                            }
                        },
                        TagCollection: {
                            __deferred: {
                                uri: "http://sys.domain:443/odata/CATALOGSERVICE;v=2/ServiceCollection('SERVICE')/TagCollection"
                            }
                        },
                        Annotations: {
                            __deferred: {
                                uri: "http://sys.domain:443/odata/CATALOGSERVICE;v=2/ServiceCollection('SERVICE')/Annotations"
                            }
                        }
                    },
                    {
                        __metadata: {
                            id: "http://sys.domain:443/odata/CATALOGSERVICE;v=2/ServiceCollection('OTHER_SERVICE')",
                            uri: "http://sys.domain:443/odata/CATALOGSERVICE;v=2/ServiceCollection('OTHER_SERVICE')",
                            type: 'CATALOGSERVICE.Service'
                        },
                        ID: 'OTHER_SERVICE_ID',
                        Description: 'Another OData Service',
                        Title: 'Title',
                        Author: 'OTHER',
                        TechnicalServiceVersion: 1,
                        MetadataUrl: 'http://sys.domain:443/odata/OTHER_SERVICE/$metadata',
                        TechnicalServiceName: 'OTHER_SERVICE',
                        ImageUrl: '',
                        ServiceUrl: 'http://sys.domain:443/odata/OTHER_SERVICE',
                        UpdatedDate: '/Date(1478276043000)/',
                        ReleaseStatus: '',
                        Category: '',
                        IsSapService: true,
                        EntitySets: {
                            __deferred: {
                                uri: "http://sys.domain:443/odata/CATALOGSERVICE;v=2/ServiceCollection('OTHER_SERVICE')/EntitySets"
                            }
                        },
                        TagCollection: {
                            __deferred: {
                                uri: "http://sys.domain:443/odata/CATALOGSERVICE;v=2/ServiceCollection('OTHER_SERVICE')/TagCollection"
                            }
                        },
                        Annotations: {
                            __deferred: {
                                uri: "http://sys.domain:443/odata/CATALOGSERVICE;v=2/ServiceCollection('OTHER_SERVICE')/Annotations"
                            }
                        }
                    }
                ],
                __delta:
                    "http://sys.domain:443/odata/CATALOGSERVICE;v=2/ServiceCollection/?sap-client=123?!deltatoken='20211125194120'"
            },
            v4: {}
        },
        XYZ: {
            v2: { results: [] },
            v4: {},
            HTML5DynamicDestination: true
        }
    },
    messages: [
        {
            severity: 1,
            text: 'Found 80 destinations'
        },
        {
            severity: 1,
            text: "Checking destination 'SYS'"
        },
        {
            severity: 1,
            text: "v2 catalog request for destination 'SYS' returned 739 services"
        },
        {
            severity: 3,
            text: "v4 catalog service for destination 'SYS' not available"
        },
        {
            severity: 0,
            text: 'Request to URL: \'http://SYS.dest/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?$expand=DefaultSystem($expand=Services)&sap-client=100\' failed with message: Request failed with status code 403. Complete error object: \n{\n    "message": "Request failed with status code 403",\n    "name": "Error",\n    "stack": "Error: Request failed with status code 403\\n    at module.exports (/tmp/vscode-unpacked/sap-ux-application-modeler-extension-1.4.2.vsix/extension/dist/src/extension-min.js:2:5470354)\\n    at module.exports (/tmp/vscode-unpacked/sap-ux-application-modeler-extension-1.4.2.vsix/extension/dist/src/extension-min.js:2:5474468)\\n    at IncomingMessage.<anonymous> (/tmp/vscode-unpacked/sap-ux-application-modeler-extension-1.4.2.vsix/extension/dist/src/extension-min.js:2:5460363)\\n    at IncomingMessage.emit (events.js:326:22)\\n    at endReadableNT (_stream_readable.js:1241:12)\\n    at processTicksAndRejections (internal/process/task_queues.js:84:21)",\n    "config": {\n        "url": "http://SYS.dest/sap/opu/odata4/iwfnd/config/default/iwfnd/catalog/0002/ServiceGroups?$expand=DefaultSystem($expand=Services)&sap-client=100",\n        "method": "get",\n        "headers": {\n            "Accept": "application/json, text/plain, */*",\n            "User-Agent": "axios/0.21.4",\n            "host": "sh4.dest"\n        },\n        "auth": {\n            "username": "davesh"\n        },\n        "transformRequest": [\n            null\n        ],\n        "transformResponse": [\n            null\n        ],\n        "timeout": 0,\n        "xsrfCookieName": "XSRF-TOKEN",\n        "xsrfHeaderName": "X-XSRF-TOKEN",\n        "maxContentLength": -1,\n        "maxBodyLength": -1,\n        "transitional": {\n            "silentJSONParsing": true,\n            "forcedJSONParsing": true,\n            "clarifyTimeoutError": false\n        }\n    }\n}'
        }
    ],
    environment: {
        developmentEnvironment: 'Business Application Studio',
        versions: {
            node: '12.22.5',
            v8: '7.8.279.23-node.56',
            uv: '1.40.0',
            zlib: '1.2.11',
            ares: '1.17.2',
            modules: '72',
            http_parser: '2.9.4',
            openssl: '1.1.1k'
        },
        platform: 'linux'
    },
    destinations: [
        {
            name: 'ABC',
            type: 'HTTP',
            credentials: { authentication: 'BasicAuthentication' },
            proxyType: 'Internet',
            description: 'Destination description',
            basProperties: {
                html5DynamicDestination: 'true',
                additionalData: 'full_url',
                webIDEEnabled: 'true',
                usage: 'odata_gen'
            },
            host: 'https://abc-api.org',
            urlServiceType: UrlServiceType.FullServiceUrl
        },
        {
            name: 'DEF',
            type: 'HTTP',
            credentials: { authentication: 'BasicAuthentication' },
            proxyType: 'Internet',
            description: 'def',
            basProperties: {
                html5DynamicDestination: 'true',
                additionalData: 'full_url',
                webIDEEnabled: 'true',
                usage: 'odata_gen'
            },
            host: 'https://def.service',
            urlServiceType: UrlServiceType.CatalogServiceUrl
        },
        {
            name: 'XYZ',
            type: 'HTTP',
            credentials: { authentication: 'BasicAuthentication' },
            proxyType: 'Internet',
            description: 'xyz',
            basProperties: {
                html5DynamicDestination: 'true',
                additionalData: 'full_url',
                webIDEEnabled: 'true',
                usage: 'odata_gen'
            },
            host: 'https://service',
            urlServiceType: UrlServiceType.PartialUrl
        },
        {
            name: 'XYZ',
            type: 'HTTP',
            credentials: { authentication: 'BasicAuthentication' },
            proxyType: 'Internet',
            description: 'xyz',
            basProperties: {
                html5DynamicDestination: 'true',
                additionalData: 'full_url',
                webIDEEnabled: 'true',
                usage: 'odata_gen'
            },
            host: 'https://sys-api.s4hana.ondemand.com/sap/opu/odata/sap/API_BUSINESS_PARTNER',
            urlServiceType: UrlServiceType.CatalogServiceUrl
        },
        {
            name: 'JUST_WRONG',
            type: 'HTTP',
            proxyType: 'Internet',
            description: 's4',
            basProperties: {
                html5DynamicDestination: 'true',
                additionalData: 'full_url',
                webIDEEnabled: 'true',
                usage: 'odata_gen,odata_abap'
            },
            host: '',
            urlServiceType: UrlServiceType.InvalidUrl
        },
        {
            name: 'DUPLICATE'
        },
        {
            name: 'DUPLICATE'
        }
    ]
};

describe('Test to check conversion to markdown, convertResultsToMarkdown()', () => {
    test('Check if writer is creating output appropriately', () => {
        const result = convertResultsToMarkdown(data as EnvironmentCheckResult);
        expect(result.split('<sub>created at')[0]).toMatchSnapshot();
    });
    test('Check output for empty results', () => {
        const result = convertResultsToMarkdown({});
        expect(result).toMatch('# SAP Fiori tools - Environment Check');
        expect(result).toMatch('## Environment');
        expect(result).toMatch('## Destination Details (0)');
        expect(result).toMatch('## All Destinations (0)');
        expect(result).toMatch('## Messages (0)');
    });
    test('Check destination details with no v2 or v4 service', () => {
        const result = convertResultsToMarkdown({ destinationResults: { ABC: { v2: {}, v4: {} } } });
        expect(result).toMatch('V2 catalog service not available');
        expect(result).toMatch('V4 catalog service not available');
    });
    test('Check destination details with v4 service but not v2 service', () => {
        const result = convertResultsToMarkdown({
            destinationResults: {
                ABC: {
                    v2: {},
                    v4: {
                        value: []
                    }
                }
            }
        });
        expect(result).toMatch('V2 catalog service not available');
        expect(result).toMatch('V4 catalog call returned');
    });
    test('Check destination details with both v2 and v4 services available', () => {
        const result = convertResultsToMarkdown({
            destinationResults: {
                ABC: {
                    v2: {
                        results: []
                    },
                    v4: {
                        value: []
                    }
                }
            }
        });
        expect(result).toMatch('V2 catalog call returned');
        expect(result).toMatch('V4 catalog call returned');
    });
    test('Check empty destination table', () => {
        const result = convertResultsToMarkdown({ destinations: [] });
        expect(result.split('<sub>created at')[0]).toMatchSnapshot();
    });
});
