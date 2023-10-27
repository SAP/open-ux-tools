// Last content update: Tue Mar 14 2023 16:11:21 GMT+0100 (Central European Standard Time)

export default {
    $Version: '4.0',
    $Reference: {
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.json': {
            $Include: [
                {
                    $Namespace: 'Org.OData.Core.V1',
                    $Alias: 'Core'
                }
            ]
        }
    },
    'com.sap.vocabularies.HTML5.v1': {
        $Alias: 'HTML5',
        '@Org.OData.Core.V1.Description': 'Terms for HTML5',
        '@Org.OData.Core.V1.LongDescription': 'The HTML5 vocabulary provides rendering hints for HTML5 clients',
        '@Org.OData.Core.V1.Description#Published': '2020-04-21 © Copyright 2020 SAP SE. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                rel: 'alternate',
                href: 'https://sap.github.io/odata-vocabularies/vocabularies/HTML5.xml'
            },
            {
                rel: 'latest-version',
                href: 'https://sap.github.io/odata-vocabularies/vocabularies/HTML5.json'
            },
            {
                rel: 'describedby',
                href: 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/HTML5.md'
            }
        ],
        CssDefaults: {
            $Kind: 'Term',
            $Type: 'com.sap.vocabularies.HTML5.v1.CssDefaultsType',
            $AppliesTo: ['Record'],
            '@Org.OData.Core.V1.Description': 'CSS definitions that may be used as defaults',
            '@Org.OData.Core.V1.LongDescription': 'This term can applied to e.g. UI.DataFieldAbstract records'
        },
        CssDefaultsType: {
            $Kind: 'ComplexType',
            width: {
                $Nullable: true,
                '@Org.OData.Core.V1.Description':
                    'css: width, see https://www.w3.org/TR/CSS21/visudet.html#propdef-width',
                '@Org.OData.Core.V1.LongDescription':
                    '\n              The property allows all values specified for the original css width property.\n              Note that clients consuming this annotation may only support selected length units.\n            '
            }
        }
    }
};
