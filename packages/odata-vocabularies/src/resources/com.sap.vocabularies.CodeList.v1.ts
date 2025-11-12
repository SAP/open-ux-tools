// Last content update: Wed Oct 15 2025 09:21:20 GMT+0200 (Central European Summer Time)
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
    'com.sap.vocabularies.CodeList.v1': {
        '$Alias': 'CodeList',
        '@Org.OData.Core.V1.Description': 'Terms for Code Lists',
        '@Org.OData.Core.V1.Description#Published': '2018-12-04 © Copyright 2018 SAP SE. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/CodeList.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/CodeList.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/CodeList.md'
            }
        ],
        'CurrencyCodes': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.CodeList.v1.CodeListSource',
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'An entity set containing the code list for currencies'
        },
        'UnitsOfMeasure': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.CodeList.v1.CodeListSource',
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'An entity set containing the code list for units of measure'
        },
        'CodeListSource': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'An entity set containing the code list for currencies',
            'Url': {
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Core.V1.Description': 'URL of a CSDL document describing an entity set for a code list'
            },
            'CollectionPath': {
                '@Org.OData.Core.V1.Description': 'Name of the entity set for the code list'
            }
        },
        'StandardCode': {
            '$Kind': 'Term',
            '$Type': 'Edm.PropertyPath',
            '$AppliesTo': ['Property'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Property containing standard code values'
        },
        'ExternalCode': {
            '$Kind': 'Term',
            '$Type': 'Edm.PropertyPath',
            '$AppliesTo': ['Property'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Property containing code values that can be used for visualization',
            '@Org.OData.Core.V1.LongDescription':
                'The annotated property contains values that are not intended for visualization and should thus stay hidden from end-users. Instead the values of the referenced properties are used for visualization.'
        },
        'IsConfigurationDeprecationCode': {
            '$Kind': 'Term',
            '$Type': 'Edm.Boolean',
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description': 'Property contains a Configuration Deprecation Code',
            '@Org.OData.Core.V1.LongDescription':
                'The Configuration Deprecation Code indicates whether a code list value is valid (deprecation code is empty/space), deprecated (deprecation code `W`), or revoked (deprecation code `E`). '
        }
    }
} as CSDL;
