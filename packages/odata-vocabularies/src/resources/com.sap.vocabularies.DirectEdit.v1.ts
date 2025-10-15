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
        }
    },
    'com.sap.vocabularies.DirectEdit.v1': {
        '$Alias': 'DirectEdit',
        '@Org.OData.Core.V1.Description': 'Terms for Direct-Edit User Interfaces',
        '@Org.OData.Core.V1.Description#Published': '2020-07-10 © Copyright 2020 SAP SE. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/DirectEdit.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/DirectEdit.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/DirectEdit.md'
            }
        ],
        'SideEffects': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.DirectEdit.v1.SideEffectsType',
            '$AppliesTo': ['EntitySet'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Determine side effects of client-side data modification'
        },
        'SideEffectsType': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.LongDescription':
                'After a change to a property whose path is contained in `Triggers`, the client should pass the entity with the changed property to the `CalculationFunction` and receive the entity with all changes that happen as side effects of the given change.',
            'Triggers': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description':
                    'List of paths to the properties whose changes should trigger the side effects calculation.',
                '@Org.OData.Validation.V1.MinItems': 1
            },
            'CalculationFunction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '@Org.OData.Core.V1.Description':
                    'The operation calculating the side effects. While non-changing for the service, this technically is an action bound to the entity set so that the parameters can be sent in the POST request body. The action has the following non-binding parameters:\n- `Qualifier` of type [`Core.SimpleIdentifier`](https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Core.V1.md#SimpleIdentifier)\n    or cast-compatible: the qualifier of the `SideEffects` annotation\n- `Trigger` of type `Edm.String`: the trigger of the side-effects determination, see `Triggers` property\n- `Data` of either the entity type of the annotated entity set or a complex type that is structure-compatible with it\n\nThe **return type** of the action also needs to be either the entity type of the annotated entity set or structure-compatible with it,\nit can be the same type as for `Data`.\n\nStructure-compatible means:\n- each primitive property that has the same name as a corresponding primitive property of the entity type of the annotated entity set is cast-compatible with the corresponding property and is nullable,  \n- each complex property that has the same name as a corresponding complex or navigation property of the entity type of the annotated entity set is structure-compatible with the corresponding property\n- it may contain properties without a corresponding property in the entity type\n- it may omit properties of the entity type'
            }
        }
    }
} as CSDL;
