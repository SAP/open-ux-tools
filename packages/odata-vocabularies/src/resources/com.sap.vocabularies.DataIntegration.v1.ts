// Last content update: Wed Oct 15 2025 09:21:20 GMT+0200 (Central European Summer Time)
import type { CSDL } from '@sap-ux/vocabularies/CSDL';

export default {
    '$Version': '4.0',
    '$Reference': {
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.Core.V1',
                    '$Alias': 'Core'
                }
            ]
        }
    },
    'com.sap.vocabularies.DataIntegration.v1': {
        '$Alias': 'DataIntegration',
        '@Org.OData.Core.V1.Description': 'Terms for Data Integration',
        '@Org.OData.Core.V1.Description#Published': '2021-02-11 © Copyright 2021 SAP AG. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/DataIntegration.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/DataIntegration.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/DataIntegration.md'
            }
        ],
        'Extractable': {
            '$Kind': 'Term',
            '$Type': 'Edm.Boolean',
            '$DefaultValue': false,
            '$AppliesTo': ['EntitySet'],
            '@Org.OData.Core.V1.Description': 'Defines if entity set is extractable'
        },
        'OriginalDataType': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description': 'Original data type of the annotated property in its source system',
            '@Org.OData.Core.V1.LongDescription':
                'The provider of an OData service maps its local type definitions to Edm types. Sometimes, specific type information is lost. This additional annotation gives the consumer hints about the type original type definition.',
            '@Org.OData.Core.V1.Example': {
                '@com.sap.vocabularies.DataIntegration.v1.OriginalDataType': 'CHAR(000010)'
            }
        },
        'OriginalName': {
            '$Kind': 'Term',
            '@Org.OData.Core.V1.Description': 'Original name of the annotated model element in its source model',
            '@Org.OData.Core.V1.LongDescription':
                'The provider of an OData service maps its local names to Edm identifiers, which may require removing or replacing characters that are not allowed.',
            '@Org.OData.Core.V1.Example': {
                '@com.sap.vocabularies.DataIntegration.v1.OriginalName': 'what::is-in.a/name?'
            }
        },
        'ConversionExit': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Identifier that describes the special output conversion of the annotated property in the source system',
            '@Org.OData.Core.V1.LongDescription':
                'The provider of an OData service maps its local type definitions to Edm types. Sometimes, specific type information is lost. This additional annotation gives the consumer hints about the type original type definition.',
            '@Org.OData.Core.V1.Example': {
                '@com.sap.vocabularies.DataIntegration.v1.ConversionExit': 'ALPHA'
            }
        },
        'SourceSystem': {
            '$Kind': 'Term',
            '$AppliesTo': ['Container'],
            '@Org.OData.Core.V1.Description': 'Identifier that classifies the type of the source system',
            '@Org.OData.Core.V1.LongDescription':
                'The original type name used in annotation OriginalDataType depend are specific to different source system. Sourc system type ABAP uses other type names as source system type HANA.'
        },
        'DeltaMethodType': {
            '$Kind': 'EnumType',
            '$IsFlags': true,
            'INSERT': 1,
            'INSERT@Org.OData.Core.V1.Description': 'Delta is supported for inserts',
            'UPDATE': 2,
            'UPDATE@Org.OData.Core.V1.Description': 'Delta is supported for updates',
            'DELETE': 4,
            'DELETE@Org.OData.Core.V1.Description': 'Delta is supported for deletes'
        },
        'DeltaMethod': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.DataIntegration.v1.DeltaMethodType',
            '$AppliesTo': ['EntitySet'],
            '@Org.OData.Core.V1.Description':
                'Defines which delta method the entity set supports. Only evaluated if Capabilities.ChangeTracking/Supported is true'
        }
    }
} as CSDL;
