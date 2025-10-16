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
        },
        'https://sap.github.io/odata-vocabularies/vocabularies/Common.json': {
            '$Include': [
                {
                    '$Namespace': 'com.sap.vocabularies.Common.v1',
                    '$Alias': 'Common'
                }
            ]
        },
        'https://sap.github.io/odata-vocabularies/vocabularies/UI.json': {
            '$Include': [
                {
                    '$Namespace': 'com.sap.vocabularies.UI.v1',
                    '$Alias': 'UI'
                }
            ]
        }
    },
    'com.sap.vocabularies.HTML5.v1': {
        '$Alias': 'HTML5',
        '@Org.OData.Core.V1.Description': 'Terms for HTML5',
        '@Org.OData.Core.V1.LongDescription': 'The HTML5 vocabulary provides rendering hints for HTML5 clients',
        '@Org.OData.Core.V1.Description#Published': '2020-04-21 © Copyright 2020 SAP SE. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/HTML5.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/HTML5.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/HTML5.md'
            }
        ],
        'CssDefaults': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.HTML5.v1.CssDefaultsType',
            '$AppliesTo': ['Record'],
            '@Org.OData.Core.V1.Description': 'CSS definitions that may be used as defaults',
            '@Org.OData.Core.V1.LongDescription': 'This term can applied to e.g. UI.DataFieldAbstract records'
        },
        'CssDefaultsType': {
            '$Kind': 'ComplexType',
            'width': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'css: width, see https://www.w3.org/TR/CSS21/visudet.html#propdef-width',
                '@Org.OData.Core.V1.LongDescription':
                    '\n              The property allows all values specified for the original css width property.\n              Note that clients consuming this annotation may only support selected length units.\n            '
            }
        },
        'LinkTarget': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.HTML5.v1.LinkTargetType',
            '$DefaultValue': '_self',
            '@Org.OData.Core.V1.Description':
                'Where to open a link for the annotated [URL](https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.html#IsURL)',
            '@Org.OData.Core.V1.LongDescription':
                'When the UI contains a link to the URL, it shall open as specified by this annotation.\n          This can be achieved, for example, by giving the UI5 `sap.m.Link` element a corresponding `target` property.\n          Applicability of this term is governed by [`Validation.ApplicableTerms`](https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Validation.V1.html#ApplicableTerms) annotations.'
        },
        'LinkTargetType': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description':
                'The values are interpreted like the [target attribute](https://html.spec.whatwg.org/multipage/links.html#attr-hyperlink-target) in HTML',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': '_self',
                    '@Org.OData.Core.V1.Description': 'Open link in the current browsing context'
                },
                {
                    'Value': '_blank',
                    '@Org.OData.Core.V1.Description': 'Open link in a new browsing context'
                },
                {
                    'Value': '_parent',
                    '@Org.OData.Core.V1.Description': 'Open link in the parent browsing context'
                },
                {
                    'Value': '_top',
                    '@Org.OData.Core.V1.Description': 'Open link in the top browsing context'
                }
            ]
        },
        'RowSpanForDuplicateValues': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Record'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.RequiresType': 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
            '@Org.OData.Core.V1.Description':
                'The annotated data field might use a rowSpan for adjacent duplicate values if used in a table.',
            '@Org.OData.Core.V1.LongDescription':
                'In order to achieve a good user experience the respective columns should be sorted.\n            Applicability of this term is governed by [`Validation.ApplicableTerms`](https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Validation.V1.html#ApplicableTerms) annotations.\n          '
        }
    }
} as CSDL;
