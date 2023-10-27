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
        },
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.json': {
            $Include: [
                {
                    $Namespace: 'Org.OData.Aggregation.V1',
                    $Alias: 'Aggregation'
                }
            ]
        },
        'https://sap.github.io/odata-vocabularies/vocabularies/Common.json': {
            $Include: [
                {
                    $Namespace: 'com.sap.vocabularies.Common.v1',
                    $Alias: 'Common'
                }
            ]
        }
    },
    'com.sap.vocabularies.Hierarchy.v1': {
        $Alias: 'Hierarchy',
        '@Org.OData.Core.V1.Description': 'Terms for Hierarchies',
        '@Org.OData.Core.V1.Description#Published': '2018-01-31 © Copyright 2018 SAP SE. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                rel: 'alternate',
                href: 'https://sap.github.io/odata-vocabularies/vocabularies/Hierarchy.xml'
            },
            {
                rel: 'latest-version',
                href: 'https://sap.github.io/odata-vocabularies/vocabularies/Hierarchy.json'
            },
            {
                rel: 'describedby',
                href: 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/Hierarchy.md'
            }
        ],
        RecursiveHierarchy: {
            $Kind: 'Term',
            $Type: 'com.sap.vocabularies.Hierarchy.v1.RecursiveHierarchyType',
            $AppliesTo: ['EntityType'],
            $BaseTerm: 'Org.OData.Aggregation.V1.RecursiveHierarchy',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Defines a recursive hierarchy',
            '@Org.OData.Core.V1.LongDescription':
                'The [base term](https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.html#RecursiveHierarchy)\n          governs what are the nodes and parents in the hierarchy, whereas this annotation designates properties that contain derived information.'
        },
        RecursiveHierarchyType: {
            $Kind: 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            ExternalKeyProperty: {
                $Type: 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Property holding the external key value for a node'
            },
            DescendantCountProperty: {
                $Type: 'Edm.PropertyPath',
                $Nullable: true,
                '@Org.OData.Core.V1.Description': 'Property holding the number of descendants of a node',
                '@Org.OData.Core.V1.LongDescription':
                    'The descendant count of a node is the number of its descendants in the hierarchy structure of the result considering only those nodes matching any specified $filter and $search. A property holding descendant counts has an integer data type.'
            },
            DrillStateProperty: {
                $Type: 'Edm.PropertyPath',
                $Nullable: true,
                '@Org.OData.Core.V1.Description': 'Property holding the drill state of a node',
                '@Org.OData.Core.V1.LongDescription':
                    'The drill state is indicated by one of the following string values: `collapsed`, `expanded`, `leaf`. For an expanded node, its children are included in the result collection. For a collapsed node, the children are included in the entity set, but they are not part of the result collection. Retrieving them requires a relaxed filter expression or a separate request filtering on the parent node ID with the ID of the collapsed node. A leaf does not have any child in the entity set.'
            },
            SiblingRankProperty: {
                $Type: 'Edm.PropertyPath',
                $Nullable: true,
                '@Org.OData.Core.V1.Description': 'Property holding the sibling rank of a node',
                '@Org.OData.Core.V1.LongDescription':
                    'The sibling rank of a node is the index of the node in the sequence of all nodes with the same parent created by preorder traversal of the hierarchy structure after evaluating the $filter expression in the request excluding any conditions on key properties. The first sibling is at position 0.'
            },
            PreorderRankProperty: {
                $Type: 'Edm.PropertyPath',
                $Nullable: true,
                '@Org.OData.Core.V1.Description': 'Property holding the preorder rank of a node',
                '@Org.OData.Core.V1.LongDescription':
                    'The preorder rank of a node expresses its position in the sequence of nodes created from preorder traversal of the hierarchy structure after evaluating the $filter expression in the request excluding any conditions on key properties. The first node in preorder traversal has rank 0.'
            }
        }
    }
};
