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
    'com.sap.vocabularies.ODM.v1': {
        '$Alias': 'ODM',
        '@Org.OData.Core.V1.Description': 'Terms for One Domain Model',
        '@Org.OData.Core.V1.Description#Published': '2020-03-03 © Copyright 2020 SAP SE. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/ODM.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/ODM.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/ODM.md'
            }
        ],
        'codeList': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityType', 'EntitySet'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'The annotated entity set represents a list of code values, the annotated entity type represents an entry in a code list'
        },
        'root': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'The annotated entity type represents an ODM root entity',
            '@Org.OData.Core.V1.LongDescription':
                'A root entity is the root of a business object. It has a distinct existence. Examples are real-world objects, like a workforce person or a piece of equipment or other more abstract real-world concepts, like a contract or an order. It has an independent lifetime / identity and is globally and uniquely addressable (via the unique identifier provided by the property referenced in the [oid](#oid) annotation).'
        },
        'oid': {
            '$Kind': 'Term',
            '$Type': 'Edm.PropertyPath',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description':
                'The named field is an OID (ODM identifier), and it uniquely identifies an ODM root entity in a customer landscape.',
            '@Org.OData.Core.V1.LongDescription':
                'The technical type can be UUID or String (typical length 128), and the value must be stable and unique at least within type and landscape (better globally). \nAn entity may have other IDs, i.e. a local ID and other alternative IDs. '
        },
        'entityName': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description':
                'Name of an ODM entity as a general concept, not a concrete version thereof',
            '@Org.OData.Core.V1.LongDescription':
                'The annotated OData entity is one of many representations of the ODM entity. Annotating the OData entity with this term helps consumers find APIs that process or expose the same entity.'
        },
        'oidReference': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.ODM.v1.oidReferenceType',
            '$AppliesTo': ['Property'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Specification of a referenced entity',
            '@Org.OData.Core.V1.LongDescription':
                'Annotating the property with this term helps consumers to determine the referenced entity and find APIs that process or expose the same entity.'
        },
        'oidReferenceType': {
            '$Kind': 'ComplexType',
            'entityName': {
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description': 'Name of a referenced ODM entity'
            }
        }
    }
} as CSDL;
