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
    'Org.OData.Repeatability.V1': {
        '$Alias': 'Repeatability',
        '@Org.OData.Core.V1.Description': 'Terms describing repeatable requests',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Repeatability.V1.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Repeatability.V1.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Repeatability.V1.md'
            }
        ],
        'Supported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityContainer', 'Action', 'ActionImport', 'EntitySet'],
            '@Org.OData.Core.V1.Description':
                'Repeatable requests are supported for the annotated service, entity set, or action',
            '@Org.OData.Core.V1.LongDescription':
                'Annotations on entity set or action import level override an annotation on entity container level, and an annotation on action level override an annotation on action import level. '
        },
        'DeleteWithClientIDSupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'Deletion of remembered requests by client ID is supported',
            '@Org.OData.Core.V1.LongDescription':
                'Clients that specify a `RepeatabilityClientID` header can delete all remembered requests for that client ID by sending a\n\n`DELETE $RepeatableRequestsWithClientID/{Repeatability-Client-ID}`\n\nrequest to the service root.'
        },
        'DeleteWithRequestIDSupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'Deletion of remembered requests by request ID is supported',
            '@Org.OData.Core.V1.LongDescription':
                'Clients can delete a single remembered request by sending a\n\n`DELETE $RepeatableRequestWithRequestID/{Repeatability-Request-ID}`\n\nrequest to the service root.'
        }
    }
} as CSDL;
