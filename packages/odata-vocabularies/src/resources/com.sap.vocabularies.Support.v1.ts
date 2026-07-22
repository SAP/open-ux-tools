// Last content update: Thu Jun 18 2026 08:20:55 GMT+0200 (Central European Summer Time)
import type { CSDL } from '@sap-ux/vocabularies/CSDL';

export default {
    '$Version': '4.01',
    '$Reference': {
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.Core.V1',
                    '$Alias': 'Core'
                }
            ]
        },
        'https://sap.github.io/odata-vocabularies/vocabularies/Common.json': {
            '$Include': [
                {
                    '$Namespace': 'com.sap.vocabularies.Common.v1',
                    '$Alias': 'Common'
                }
            ]
        }
    },
    'com.sap.vocabularies.Support.v1': {
        '$Alias': 'Support',
        '@Org.OData.Core.V1.Description': 'Terms for support tools',
        '@Org.OData.Core.V1.Description#Published': '2025-03-25 © Copyright 2025 SAP SE. All rights reserved.',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Support.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Support.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/Support.md'
            }
        ],
        '@com.sap.vocabularies.Common.v1.Experimental': true,
        'DebugInfo': {
            '$Kind': 'Term',
            '@Org.OData.Core.V1.Description': 'Debug information provided by the client in json batch requests'
        },
        'TechnicalInfoLinks': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Support.v1.TechnicalInfoLinksType',
            '$AppliesTo': ['Schema'],
            '@Org.OData.Core.V1.Description': 'How to retrieve links to technical information about the service'
        },
        'TechnicalInfoLinksType': {
            '$Kind': 'ComplexType',
            'Url': {
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Core.V1.Description': 'URL of a CSDL document describing the function',
                '@Org.OData.Core.V1.LongDescription':
                    'This URL is interpreted relative to the URL of the CSDL document containing the annotation.\n            The function must follow [this template](#Template_GetTechnicalInfoLinks).'
            },
            'FunctionImport': {
                '@Org.OData.Core.V1.Description':
                    'Name of a function import for retrieval of links to technical information about the service'
            }
        },
        'Template_GetTechnicalInfoLinks': [
            {
                '$Kind': 'Function',
                '@Org.OData.Core.V1.Description':
                    'Template for a function that retrieves links to technical information about a service and whose function import is named in [`TechnicalInfoLinks/FunctionImport`](#TechnicalInfoLinksType)',
                '$Parameter': [
                    {
                        '$Name': 'ServiceRoot',
                        '@Org.OData.Core.V1.IsURL': true,
                        '@Org.OData.Core.V1.Description': 'Root URL of the UI service',
                        '@Org.OData.Core.V1.LongDescription':
                            'This URL is interpreted relative to the root URL of the service containing the function.'
                    },
                    {
                        '$Name': 'EdmPath',
                        '@Org.OData.Core.V1.Description':
                            'Path to the model element for which technical info is requested',
                        '@Org.OData.Core.V1.LongDescription':
                            'Uses the same syntax as [annotation targets](https://oasis-tcs.github.io/odata-specs/odata-csdl-xml/odata-csdl-xml.html#Target).'
                    }
                ],
                '$ReturnType': {
                    '$Collection': true,
                    '$Type': 'com.sap.vocabularies.Support.v1.TechnicalInfoLink',
                    '@Org.OData.Core.V1.Description': 'Collection of development objects related to the model element'
                }
            }
        ],
        'TechnicalInfoLink': {
            '$Kind': 'ComplexType',
            'Text': {
                '@Org.OData.Core.V1.IsLanguageDependent': true,
                '@Org.OData.Core.V1.Description': 'Description of a development object'
            },
            'Url': {
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Core.V1.Description': 'Link to open the development object',
                '@Org.OData.Core.V1.LongDescription':
                    'This URL is interpreted relative to the root URL of the service containing the function.'
            }
        }
    }
} as CSDL;
