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
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.JSON.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.JSON.V1',
                    '$Alias': 'JSON'
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
    'com.sap.vocabularies.Graph.v1': {
        '$Alias': 'Graph',
        '@com.sap.vocabularies.Common.v1.Experimental': true,
        '@Org.OData.Core.V1.Description': 'Terms for SAP Graph',
        '@Org.OData.Core.V1.Description#Published': '2020-03-11 © Copyright 2020 SAP SE. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Graph.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Graph.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/Graph.md'
            }
        ],
        'traceId': {
            '$Kind': 'Term',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true,
            '@Org.OData.Core.V1.Description':
                'The traceId contains a unique string that is preserved across multiple requests and log files. It is used in error responses to help diagnose problems by correlating log entries.'
        },
        'Details': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Graph.v1.DetailsType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true,
            '@Org.OData.Core.V1.Description': 'Graph-specific details for error responses'
        },
        'DetailsType': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Graph-specific details for error responses',
            'url': {
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Core.V1.Description': 'URL sent to the business system tenant'
            },
            'body': {
                '$Type': 'Org.OData.JSON.V1.JSON',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description': 'Request body sent to the business system tenant'
            }
        },
        'CompositionRoot': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'The annotated entity type is the root type of a composition tree.'
        }
    }
} as CSDL;
