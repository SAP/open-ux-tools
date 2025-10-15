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
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Validation.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.Validation.V1',
                    '$Alias': 'Validation'
                }
            ]
        }
    },
    'Org.OData.Measures.V1': {
        '$Alias': 'Measures',
        '@Org.OData.Core.V1.Description': 'Terms describing monetary amounts and measured quantities',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Measures.V1.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Measures.V1.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Measures.V1.md'
            }
        ],
        'ISOCurrency': {
            '$Kind': 'Term',
            '$AppliesTo': ['Parameter', 'Property'],
            '@Org.OData.Core.V1.Description': 'The currency for this monetary amount as an ISO 4217 currency code'
        },
        'Scale': {
            '$Kind': 'Term',
            '$Type': 'Edm.Byte',
            '$AppliesTo': ['Parameter', 'Property'],
            '@Org.OData.Core.V1.Description':
                'The number of significant decimal places in the scale part (less than or equal to the number declared in the Scale facet)',
            '@Org.OData.Core.V1.RequiresType': 'Edm.Decimal'
        },
        'Unit': {
            '$Kind': 'Term',
            '$AppliesTo': ['Parameter', 'Property'],
            '@Org.OData.Core.V1.Description':
                'The unit of measure for this measured quantity, e.g. cm for centimeters or % for percentages'
        },
        'UNECEUnit': {
            '$Kind': 'Term',
            '$AppliesTo': ['Parameter', 'Property'],
            '@Org.OData.Core.V1.Description':
                'The unit of measure for this measured quantity, according to the [UN/CEFACT Recommendation 20](http://tfig.unece.org/contents/recommendation-20.htm)'
        },
        'DurationGranularity': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Measures.V1.DurationGranularityType',
            '$AppliesTo': ['Parameter', 'Property'],
            '@Org.OData.Core.V1.Description': 'The minimum granularity of duration values.',
            '@Org.OData.Core.V1.LongDescription':
                'Absence of this annotation means a granularity of seconds with sub-seconds according to the Precision facet.',
            '@Org.OData.Core.V1.RequiresType': 'Edm.Duration'
        },
        'DurationGranularityType': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': 'days',
                    '@Org.OData.Core.V1.Description': 'Duration in days, e.g. `P1D`'
                },
                {
                    'Value': 'hours',
                    '@Org.OData.Core.V1.Description': 'Duration in days and hours, e.g. `P1DT23H`'
                },
                {
                    'Value': 'minutes',
                    '@Org.OData.Core.V1.Description': 'Duration in days, hours, and minutes, e.g. `P1DT23H59M`'
                }
            ]
        }
    }
} as CSDL;
