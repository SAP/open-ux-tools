// Last content update: Fri Mar 06 2026 12:24:45 GMT+0100 (Central European Standard Time)
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
    'com.sap.vocabularies.Auditing.v1': {
        '$Alias': 'Auditing',
        '@com.sap.vocabularies.Common.v1.Experimental': true,
        '@Org.OData.Core.V1.Description': 'Terms for annotating auditing behaviour',
        '@Org.OData.Core.V1.Description#Published': '2026-03-04 © Copyright 2013 SAP SE. All rights reserved.',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Auditing.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Auditing.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/Auditing.md'
            }
        ],
        'DefaultAuditorScopes': {
            '$Kind': 'Term',
            '$Collection': true,
            '$AppliesTo': ['EntityContainer'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'List of scopes which have by default auditing access for entity sets in the annotated service. Annotating @Auditing.AuditorScopes to an entity set overrides this default.'
        },
        'AuditorScopes': {
            '$Kind': 'Term',
            '$Collection': true,
            '$AppliesTo': ['EntitySet'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'List of scopes which have auditing access for the annotated entity set. Auditing access could for example mean accessing blocked or archived entities.'
        }
    }
} as CSDL;
