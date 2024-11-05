// Last content update: Tue Oct 21 2024 11:45:53 GMT+0200 (Mitteleuropäische Sommerzeit)
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
    'com.sap.vocabularies.AsyncAPI.v1': {
        '$Alias': 'AsyncAPI',
        '@Org.OData.Core.V1.Description': 'Terms for AsyncAPI annotations',
        'Title': {
            '$Kind': 'Term',
            '@Org.OData.Core.V1.Description': 'Provides the name for the API, describing its purpose or identity',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'SchemaVersion': {
            '$Kind': 'Term',
            '@Org.OData.Core.V1.Description': 'Provides the version of the API',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'Description': {
            '$Kind': 'Term',
            '@Org.OData.Core.V1.Description':
                "Provides a detailed explanation of the API's functionality, usage, and any relevant information",
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'StateInfo': {
            '$Kind': 'Term',
            '@Org.OData.Core.V1.Description': 'Deprecation status of the overall event catalog document',
            '$Type': 'com.sap.vocabularies.AsyncAPI.v1.StateInfoType',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'StateInfoType': {
            '$Kind': 'ComplexType',
            'state': {
                '@Org.OData.Core.V1.Description': "Indicates the catalog's status"
            },
            'deprecationDate': {
                '@Org.OData.Core.V1.Description': 'Deprecation date of the catalog'
            },
            'decomissionedDate': {
                '@Org.OData.Core.V1.Description': 'Decommission date of the catalog'
            },
            'link': {
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Core.V1.Description':
                    'Link to release notes or similar with more details and migration instructions'
            }
        },
        'ShortText': {
            '$Kind': 'Term',
            '@Org.OData.Core.V1.Description': 'To display a short description of the events',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        }
    }
} as CSDL;
