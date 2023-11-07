// Last content update: Tue Nov 07 2023 12:06:19 GMT+0200 (Eastern European Standard Time)
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
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.Aggregation.V1',
                    '$Alias': 'Aggregation'
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
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Validation.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.Validation.V1',
                    '$Alias': 'Validation'
                }
            ]
        }
    },
    'com.sap.vocabularies.Hierarchy.v1': {
        '$Alias': 'Hierarchy',
        '@Org.OData.Core.V1.Description': 'Terms for Hierarchies',
        '@Org.OData.Core.V1.Description#Published': '2018-01-31 © Copyright 2018 SAP SE. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Hierarchy.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Hierarchy.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/Hierarchy.md'
            }
        ],
        'RecursiveHierarchy': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Hierarchy.v1.RecursiveHierarchyType',
            '$AppliesTo': ['EntityType'],
            '$BaseTerm': 'Org.OData.Aggregation.V1.RecursiveHierarchy',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true,
            '@Org.OData.Core.V1.Description':
                'Hierarchy-specific information in the result set of a hierarchical request',
            '@Org.OData.Core.V1.LongDescription':
                'The [base term](https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.html#RecursiveHierarchy)\n          governs what are the nodes and parents in the hierarchy, whereas this term defines derived information.'
        },
        'RecursiveHierarchyType': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.LongDescription':
                "The properties in this complex type contain information about\na node in the result set of a hierarchical request. If the same node occurs multiple times\nwith different parents, certain properties may differ between the occurrences.\nThe properties are derived when hierarchical transformations\nare applied whose first parameter has the annotated entity type\nand whose second parameter is the annotation qualifier.\n\nFor requests like\n```\nSalesOrganizations?$apply=\ndescendants(..., ID, filter(ID eq 'US'), keep start)\n/ancestors(..., ID, filter(contains(Name, 'New York')), keep start)\n/Hierarchy.TopLevels(..., NodeProperty='ID', Levels=2)\n&$top=10\n```\nor\n```\nSalesOrganizations?$apply=groupby((rolluprecursive(..., ID,\n  descendants(..., ID, filter(ID eq 'US')),\n  ancestors(..., ID, filter(contains(Name, 'New York')), keep start))), aggregate(...))\n/Hierarchy.TopLevels(..., NodeProperty='ID', Levels=2)\n&$top=10\n```\n(where `...,` stands for hierarchy nodes and hierarchy qualifier)\nthe following collections of hierarchy nodes are distinguished:\n\n|Collection|Definition|Value|Where in request|\n|----------|----------|-----|----------------|\n|sub-hierarchy|output set of a `descendants` transformation, possibly embedded in a `rolluprecursive` transformation, that is not preceded by an `ancestors` or `descendants` transformation|US sales organizations|rows 1–2|\n|matching nodes|see [`MatchCount`](#MatchCount)|US sales organizations with \"New York\" in their name|output set of `filter` transformation in row 3|\n|unlimited hierarchy|output set of the last `ancestors`, `descendants` or `traverse` transformation, possibly embedded in a `rolluprecursive` transformation, disregarding numeric fifth parameters|US sales organizations with leaves containing \"New York\"|rows 1–3|\n|limited hierarchy|output set of the last `ancestors`, `descendants`, `traverse` or [`Hierarchy.TopLevels`](#TopLevels) transformation, possibly embedded in a `rolluprecursive` transformation|2 levels of US sales organizations with leaves containing \"New York\"|rows 1–4|\n",
            'ExternalKey': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Human-readable key value for a node',
                '@Org.OData.Core.V1.LongDescription':
                    'If a `NodeType` exists, the external key is unique only in combination with it.\n            Or the external key can coincide with the [`Aggregation.RecursiveHierarchy/NodeProperty`](https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.html#RecursiveHierarchyType).'
            },
            'NodeType': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Type of a node',
                '@Org.OData.Core.V1.LongDescription':
                    'In a recursive hierarchy with mixed types, nodes can\n            <br>- have a type-specific (navigation) property whose name is the node type or\n            <br>- be represented by entities of different subtypes of a common entity type that is\n            annotated with the `RecursiveHierarchy` annotation. The qualified name of the subtype is the node type.'
            },
            'ChildCount': {
                '$Type': 'Edm.Int64',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Number of children a node has in the unlimited hierarchy'
            },
            'DescendantCount': {
                '$Type': 'Edm.Int64',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Number of descendants a node has in the unlimited hierarchy'
            },
            'LimitedDescendantCount': {
                '$Type': 'Edm.Int64',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Number of descendants a node has in the limited hierarchy'
            },
            'DrillState': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Drill state of an occurrence of a node',
                '@Org.OData.Core.V1.LongDescription':
                    'Possible drill states are:\n            <br>- `expanded` if a node has children in the limited hierarchy\n            <br>- `collapsed` if a node has children in the unlimited hierarchy but not in the limited hierarchy\n            <br>- `leaf` if a node has no children in the unlimited hierarchy'
            },
            'DistanceFromRoot': {
                '$Type': 'Edm.Int64',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Number of ancestors an occurrence of a node has in the limited hierarchy',
                '@Org.OData.Core.V1.LongDescription':
                    'This equals the number of ancestors in the sub-hierarchy, if the request involves a sub-hierarchy.'
            },
            'LimitedRank': {
                '$Type': 'Edm.Int64',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Rank of a node in the limited hierarchy in preorder or postorder',
                '@Org.OData.Core.V1.LongDescription':
                    'The rank of a node is the index of the node in the sequence of nodes\n            created from a preorder or postorder traversal of the limited hierarchy. The first node in the traversal has rank 0.'
            },
            'SiblingRank': {
                '$Type': 'Edm.Int64',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Sibling rank of a node',
                '@Org.OData.Core.V1.LongDescription':
                    'The sibling rank of a node is the index of the node in the sequence of all nodes\n            in the unlimited hierarchy with the same parent. The first sibling has rank 0.'
            },
            'Matched': {
                '$Type': 'Edm.Boolean',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Flag indicating [matching](#MatchCount) nodes'
            },
            'MatchedDescendantCount': {
                '$Type': 'Edm.Int64',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Number of [matching](#MatchCount) descendants a node has in the unlimited hierarchy'
            }
        },
        'RecursiveHierarchyActions': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Hierarchy.v1.RecursiveHierarchyActionsType',
            '$AppliesTo': ['EntityType'],
            '$BaseTerm': 'Org.OData.Aggregation.V1.RecursiveHierarchy',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Actions for maintaining the recursive hierarchy defined by the [base term](https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.html#RecursiveHierarchy)',
            '@Org.OData.Core.V1.LongDescription':
                'When an annotation with this term is present, the [`ParentNavigationProperty`](https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.html#RecursiveHierarchyType)\n          in the base term must not have a collection-valued segment prior to its last segment.'
        },
        'RecursiveHierarchyActionsType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.LongDescription':
                'The qualified action names identify actions for maintaining nodes in the recursive hierarchy,\nwhich are specific for the given annotation qualifier.\nThese actions MUST have the same signature as the template actions linked below, with\n`Edm.EntityType` replaced with the entity type on which the recursive hierarchy is defined.\nThe resource path of the binding parameter MUST traverse the hierarchy collection,\nincluding any hierarchy directory.\n\nThe template actions themselves cannot be invoked.',
            'ChangeNextSiblingAction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Action that moves a node among its siblings, following [this template](#Template_ChangeNextSiblingAction)'
            },
            'CopyAction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Action that copies a node and its descendants, following [this template](#Template_CopyAction)'
            }
        },
        'MatchCount': {
            '$Kind': 'Term',
            '$Type': 'Edm.Int64',
            '$AppliesTo': ['Collection'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true,
            '@Org.OData.Core.V1.Description':
                'Instance annotation on the result of an `$apply` query option containing the number of matching nodes after hierarchical transformations',
            '@Org.OData.Core.V1.LongDescription':
                'The service MAY designate a subset of the `$apply` result as "matching nodes".\n          For requests following the pattern described [here](#RecursiveHierarchyType), this subset is the output set of the\n          `filter` or `search` transformation that occurs as the fourth parameter\n          of the last `ancestors` transformation or occurs nested into it.<br>\n          For requests not following this pattern, the subset NEED NOT be defined.<br>\n          This instance annotation is available if [`RecursiveHierarchy/Matched`](#RecursiveHierarchyType)\n          and [`RecursiveHierarchy/MatchedDescendantCount`](#RecursiveHierarchyType) are also available.'
        },
        'TopLevels': [
            {
                '$Kind': 'Function',
                '$EntitySetPath': 'InputSet',
                '$IsBound': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'Returns the first n levels of a hierarchical collection in preorder with individual nodes expanded or collapsed',
                '@Org.OData.Core.V1.LongDescription':
                    'This function can be used as a transformation whose input set has a recursive hierarchy\n          defined by an [`Aggregation.RecursiveHierarchy`](https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.html#RecursiveHierarchy)\n          annotation on the entity type of the `HierarchyNodes`.\n          (Its binding parameter is the unlimited hierarchy as defined [here](#RecursiveHierarchyType),\n          its output is the limited hierarchy.) The output initially contains the nodes with less than n ancestors\n          in the hierarchical collection given in the binding parameter.\n          Then individual nodes are expanded, shown or collapsed in the output, which extends or reduces the limited hierarchy.\n          Finally the output is sorted in preorder as with the `traverse` transformation with the hierarchy-specific\n          definition of start nodes.',
                '$Parameter': [
                    {
                        '$Name': 'InputSet',
                        '$Collection': true,
                        '$Type': 'Edm.EntityType'
                    },
                    {
                        '$Name': 'HierarchyNodes',
                        '$Collection': true,
                        '$Type': 'Edm.EntityType',
                        '@Org.OData.Core.V1.Description': 'A collection, given through a `$root` expression'
                    },
                    {
                        '$Name': 'HierarchyQualifier',
                        '$Type': 'Org.OData.Aggregation.V1.HierarchyQualifier'
                    },
                    {
                        '$Name': 'NodeProperty',
                        '@Org.OData.Core.V1.Description':
                            'Property path to the node identifier, evaluated relative to the binding parameter'
                    },
                    {
                        '$Name': 'Levels',
                        '$Type': 'Edm.Int64',
                        '@Org.OData.Core.V1.Description':
                            'The number n of levels to be output, absent means all levels',
                        '@Org.OData.Core.V1.OptionalParameter': {},
                        '@Org.OData.Validation.V1.Minimum': 1
                    },
                    {
                        '$Name': 'Show',
                        '$Collection': true,
                        '@Org.OData.Core.V1.Description': 'Identifiers of nodes to be shown',
                        '@Org.OData.Core.V1.OptionalParameter': {}
                    },
                    {
                        '$Name': 'ExpandLevels',
                        '$Collection': true,
                        '$Type': 'com.sap.vocabularies.Hierarchy.v1.TopLevelsExpandType',
                        '@Org.OData.Core.V1.Description': 'Nodes to be expanded',
                        '@Org.OData.Core.V1.OptionalParameter': {}
                    }
                ],
                '$ReturnType': {
                    '$Collection': true,
                    '$Type': 'Edm.EntityType'
                }
            }
        ],
        'TopLevelsExpandType': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Information about nodes to be expanded',
            'NodeID': {
                '@Org.OData.Core.V1.Description': 'Identifier of a node to be expanded'
            },
            'Levels': {
                '$Type': 'Edm.Int64',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Number of levels to be expanded, null means all levels, 0 means collapsed'
            }
        },
        'RecursiveHierarchySupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Whether the annotated collection acts as a [`RecursiveHierarchy`](#RecursiveHierarchy) with the given qualifier',
            '@Org.OData.Core.V1.LongDescription':
                'This tag is applied to a collection with the same qualifier as the [`RecursiveHierarchy`](#RecursiveHierarchy) term which is applied to its entity type.\n          The recursive hierarchy can then only be addressed through a collection where this tag is true.'
        },
        'Template_ChangeNextSiblingAction': [
            {
                '$Kind': 'Action',
                '$IsBound': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'Template for actions that move a node among its siblings and are named in [`RecursiveHierarchyActions/ChangeNextSiblingAction`](#RecursiveHierarchyActionsType)',
                '$Parameter': [
                    {
                        '$Name': 'Node',
                        '$Type': 'Edm.EntityType',
                        '@Org.OData.Core.V1.Description': 'The node T to be moved'
                    },
                    {
                        '$Name': 'NextSibling',
                        '$Type': 'Edm.ComplexType',
                        '$Nullable': true,
                        '@Org.OData.Core.V1.Description':
                            "Key of the node's new next sibling S (null if the node shall become the last sibling)",
                        '@Org.OData.Core.V1.LongDescription':
                            'This parameter has properties with the same names as the key properties of the entity type.\n            next(T) = S after the action.\n            If R is a node with next(R) = S before the action, then next(R) = T after the action, even if S = null.\n            It is an error if S has a different parent than T.'
                    }
                ]
            }
        ],
        'Template_CopyAction': [
            {
                '$Kind': 'Action',
                '$EntitySetPath': 'Node',
                '$IsBound': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'Template for actions that copy a node and its descendants and are named in [`RecursiveHierarchyActions/CopyAction`](#RecursiveHierarchyActionsType)',
                '@Org.OData.Core.V1.LongDescription':
                    'To give the copied sub-hierarchy a parent, the action invocation can be followed\nby a PATCH that binds the parent navigation property (for example, `Superordinate` in the following JSON batch request).\n```json\n{"requests": [{\n  "id": "1",\n  "method": "post",\n  "url": "HierarchyDirectory(1)/Nodes(\'A\')/CopyAction"\n}, {\n  "id": "2",\n  "dependsOn": ["1"],\n  "method": "patch",\n  "url": "$1",\n  "body": {\n    "Superordinate": {"@id": "Nodes(\'B\')"}\n  }\n}]}\n```',
                '$Parameter': [
                    {
                        '$Name': 'Node',
                        '$Type': 'Edm.EntityType',
                        '@Org.OData.Core.V1.Description': 'The node to be copied'
                    }
                ],
                '$ReturnType': {
                    '$Type': 'Edm.EntityType',
                    '@Org.OData.Core.V1.Description': 'The copied node'
                }
            }
        ]
    }
} as CSDL;
