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
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Capabilities.V1.json': {
            $Include: [
                {
                    $Namespace: 'Org.OData.Capabilities.V1',
                    $Alias: 'Capabilities'
                }
            ]
        },
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Validation.V1.json': {
            $Include: [
                {
                    $Namespace: 'Org.OData.Validation.V1',
                    $Alias: 'Validation'
                }
            ]
        }
    },
    'Org.OData.Aggregation.V1': {
        $Alias: 'Aggregation',
        '@Org.OData.Core.V1.Description':
            'Terms to describe which data in a given entity model can be aggregated, and how.',
        '@Org.OData.Core.V1.Links': [
            {
                rel: 'alternate',
                href: 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.xml'
            },
            {
                rel: 'latest-version',
                href: 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.json'
            },
            {
                rel: 'describedby',
                href: 'https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Aggregation.V1.md'
            }
        ],
        ApplySupported: {
            $Kind: 'Term',
            $Type: 'Org.OData.Aggregation.V1.ApplySupportedType',
            $AppliesTo: ['EntitySet', 'Collection', 'EntityType'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'This entity set or collection supports the `$apply` system query option'
        },
        ApplySupportedDefaults: {
            $Kind: 'Term',
            $Type: 'Org.OData.Aggregation.V1.ApplySupportedBase',
            $AppliesTo: ['EntityContainer'],
            '@Org.OData.Core.V1.Description':
                'Default support of the `$apply` system query option for all collection-valued resources in the container',
            '@Org.OData.Core.V1.LongDescription':
                'Annotating term [`ApplySupported`](#ApplySupported) for a specific collection-valued resource overrides the default support with the specified properties using PATCH semantics:\n\n- Primitive or collection-valued properties specified in `ApplySupported` replace the corresponding properties specified in `ApplySupportedDefaults`\n\n- Complex-valued properties specified in `ApplySupported` override the corresponding properties specified in `ApplySupportedDefaults` using PATCH semantics recursively\n\n- Properties specified neither in `ApplySupported` nor in `ApplySupportedDefaults` have their default value\n          '
        },
        ApplySupportedBase: {
            $Kind: 'ComplexType',
            Transformations: {
                $Collection: true,
                '@Org.OData.Core.V1.Description': 'Transformations that can be used in `$apply`',
                '@Org.OData.Validation.V1.AllowedValues': [
                    {
                        Value: 'aggregate'
                    },
                    {
                        Value: 'groupby'
                    },
                    {
                        Value: 'concat'
                    },
                    {
                        Value: 'identity'
                    },
                    {
                        Value: 'filter'
                    },
                    {
                        Value: 'expand'
                    },
                    {
                        Value: 'search'
                    },
                    {
                        Value: 'compute'
                    },
                    {
                        Value: 'bottomcount'
                    },
                    {
                        Value: 'bottomsum'
                    },
                    {
                        Value: 'bottompercent'
                    },
                    {
                        Value: 'topcount'
                    },
                    {
                        Value: 'topsum'
                    },
                    {
                        Value: 'toppercent'
                    }
                ]
            },
            CustomAggregationMethods: {
                $Collection: true,
                '@Org.OData.Core.V1.Description':
                    'Qualified names of custom aggregation methods that can be used in `aggregate(...with...)`'
            },
            Rollup: {
                $Type: 'Org.OData.Aggregation.V1.RollupType',
                $DefaultValue: 'MultipleHierarchies',
                '@Org.OData.Core.V1.Description':
                    'The service supports rollup hierarchies in a `groupby` transformation'
            }
        },
        ApplySupportedType: {
            $Kind: 'ComplexType',
            $BaseType: 'Org.OData.Aggregation.V1.ApplySupportedBase',
            PropertyRestrictions: {
                $Type: 'Edm.Boolean',
                $DefaultValue: false,
                '@Org.OData.Core.V1.Revisions': [
                    {
                        Kind: 'Deprecated',
                        Description:
                            'Deprecated since [`Groupable`](#Groupable) and [`Aggregatable`](#Aggregatable) are deprecated'
                    }
                ],
                '@Org.OData.Core.V1.Description':
                    'Only properties marked as `Groupable` can be used in the `groupby` transformation, and only those marked as `Aggregatable` can be used in the  `aggregate` transformation'
            },
            GroupableProperties: {
                $Collection: true,
                $Type: 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description':
                    'A non-empty collection indicates that only the listed properties of the annotated target are supported by the `groupby` transformation'
            },
            AggregatableProperties: {
                $Collection: true,
                $Type: 'Org.OData.Aggregation.V1.AggregatablePropertyType',
                '@Org.OData.Core.V1.Description':
                    'A non-empty collection indicates that only the listed properties of the annotated target can be used in the `aggregate` transformation, optionally restricted to the specified aggregation methods'
            }
        },
        AggregatablePropertyType: {
            $Kind: 'ComplexType',
            Property: {
                $Type: 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Aggregatable property'
            },
            SupportedAggregationMethods: {
                $Collection: true,
                $Type: 'Org.OData.Aggregation.V1.AggregationMethod',
                '@Org.OData.Core.V1.Description':
                    'Standard and custom aggregation methods that can be applied to the property. If omitted, all aggregation methods can be applied'
            },
            RecommendedAggregationMethod: {
                $Type: 'Org.OData.Aggregation.V1.AggregationMethod',
                $Nullable: true,
                '@Org.OData.Core.V1.Description': 'Recommended method for aggregating values of the property'
            }
        },
        AggregationMethod: {
            $Kind: 'TypeDefinition',
            $UnderlyingType: 'Edm.String',
            '@Org.OData.Core.V1.Description': 'Standard or custom aggregation method',
            '@Org.OData.Core.V1.LongDescription':
                'Custom aggregation methods MUST use a namespace-qualified name, that is contain at least one dot. ',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    Value: 'sum',
                    '@Org.OData.Core.V1.Description':
                        'Can be applied to numeric values to return the sum of the non-null values, or null if there are no non-null values or the input set is empty'
                },
                {
                    Value: 'min',
                    '@Org.OData.Core.V1.Description':
                        'Can be applied to values with a totally ordered domain to return the smallest of the non-null values, or null if there are no non-null values or the input set is empty'
                },
                {
                    Value: 'max',
                    '@Org.OData.Core.V1.Description':
                        'Can be applied to values with a totally ordered domain to return the largest of the non-null values, or null if there are no non-null values or the input set is empty'
                },
                {
                    Value: 'average',
                    '@Org.OData.Core.V1.Description':
                        'Can be applied to numeric values to return the sum of the non-null values divided by the count of the non-null values, or null if there are no non-null values or the input set is empty'
                },
                {
                    Value: 'countdistinct',
                    '@Org.OData.Core.V1.Description': 'Counts the distinct values, omitting any null values',
                    '@Org.OData.Core.V1.LongDescription':
                        'For navigation properties, it counts the distinct entities in the union of all entities related to entities in the input set. \n                  For collection-valued primitive properties, it counts the distinct items in the union of all collection values in the input set.'
                }
            ]
        },
        RollupType: {
            $Kind: 'EnumType',
            '@Org.OData.Core.V1.Description':
                'The number of `rollup` or `rollupall` operators allowed in a `groupby` transformation',
            None: 0,
            'None@Org.OData.Core.V1.Description': 'No support for `rollup` or `rollupall` ',
            SingleHierarchy: 1,
            'SingleHierarchy@Org.OData.Core.V1.Description': 'Only one `rollup` or `rollupall` operator per `groupby`',
            MultipleHierarchies: 2,
            'MultipleHierarchies@Org.OData.Core.V1.Description': 'Full support for `rollup` and `rollupall`'
        },
        Groupable: {
            $Kind: 'Term',
            $Type: 'Org.OData.Core.V1.Tag',
            $DefaultValue: true,
            $AppliesTo: ['Property', 'NavigationProperty'],
            '@Org.OData.Core.V1.Revisions': [
                {
                    Kind: 'Deprecated',
                    Description: 'Deprecated in favor of [`ApplySupported/GroupableProperties`](#ApplySupported)'
                }
            ],
            '@Org.OData.Core.V1.Description': 'This property can be used in the `groupby` transformation'
        },
        Aggregatable: {
            $Kind: 'Term',
            $Type: 'Org.OData.Core.V1.Tag',
            $DefaultValue: true,
            $AppliesTo: ['Property', 'NavigationProperty'],
            '@Org.OData.Core.V1.Revisions': [
                {
                    Kind: 'Deprecated',
                    Description: 'Deprecated in favor of [`ApplySupported/AggregatableProperties`](#ApplySupported)'
                }
            ],
            '@Org.OData.Core.V1.Description': 'This property can be used in the `aggregate` transformation'
        },
        CustomAggregate: {
            $Kind: 'Term',
            $AppliesTo: ['EntitySet', 'Collection', 'EntityContainer', 'EntityType'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Dynamic property that can be used in the `aggregate` transformation',
            '@Org.OData.Core.V1.LongDescription':
                'This term MUST be applied with a Qualifier, the Qualifier value is the name of the dynamic property. The value of the annotation MUST be the qualified name of a primitive type. The aggregated value will be of that type.'
        },
        ContextDefiningProperties: {
            $Kind: 'Term',
            $Collection: true,
            $Type: 'Edm.PropertyPath',
            $AppliesTo: ['Property', 'Annotation'],
            '@Org.OData.Core.V1.Description':
                'The annotated property or custom aggregate is only well-defined in the context of these properties',
            '@Org.OData.Core.V1.LongDescription':
                'The context-defining properties need either be part of the result entities, or be restricted to a single value by a pre-filter operation. Examples are postal codes within a country, or monetary amounts whose context is the unit of currency.'
        },
        LeveledHierarchy: {
            $Kind: 'Term',
            $Collection: true,
            $Type: 'Edm.PropertyPath',
            $AppliesTo: ['EntityType', 'ComplexType'],
            '@Org.OData.Core.V1.Description':
                'Defines a leveled hierarchy by defining an ordered list of properties in the hierarchy'
        },
        RecursiveHierarchy: {
            $Kind: 'Term',
            $Type: 'Org.OData.Aggregation.V1.RecursiveHierarchyType',
            $AppliesTo: ['EntityType', 'ComplexType'],
            '@Org.OData.Core.V1.Description': 'Defines a recursive hierarchy.'
        },
        RecursiveHierarchyType: {
            $Kind: 'ComplexType',
            NodeProperty: {
                $Type: 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Property holding the hierarchy node value'
            },
            ParentNavigationProperty: {
                $Type: 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description': 'Property for navigating to the parent node'
            },
            DistanceFromRootProperty: {
                $Type: 'Edm.PropertyPath',
                $Nullable: true,
                '@Org.OData.Core.V1.Description':
                    'Property holding the number of edges between the node and the root node'
            },
            IsLeafProperty: {
                $Type: 'Edm.PropertyPath',
                $Nullable: true,
                '@Org.OData.Core.V1.RequiresType': 'Edm.Boolean',
                '@Org.OData.Core.V1.Description': 'Property indicating whether the node is a leaf of the hierarchy'
            }
        },
        isroot: [
            {
                $Kind: 'Function',
                $IsBound: true,
                '@Org.OData.Core.V1.Description':
                    'Returns true, if and only if the value of the node property of the specified hierarchy is the root of the hierarchy',
                $Parameter: [
                    {
                        $Name: 'Entity',
                        $Type: 'Edm.EntityType'
                    },
                    {
                        $Name: 'Hierarchy'
                    }
                ],
                $ReturnType: {
                    $Type: 'Edm.Boolean'
                }
            }
        ],
        isdescendant: [
            {
                $Kind: 'Function',
                $IsBound: true,
                '@Org.OData.Core.V1.Description':
                    'Returns true, if and only if the value of the node property of the specified hierarchy is a descendant of the given parent node with a distance of less than or equal to the optionally specified maximum distance',
                $Parameter: [
                    {
                        $Name: 'Entity',
                        $Type: 'Edm.EntityType'
                    },
                    {
                        $Name: 'Hierarchy'
                    },
                    {
                        $Name: 'Node',
                        $Type: 'Edm.PrimitiveType'
                    },
                    {
                        $Name: 'MaxDistance',
                        $Type: 'Edm.Int16',
                        $Nullable: true
                    }
                ],
                $ReturnType: {
                    $Type: 'Edm.Boolean'
                }
            }
        ],
        isancestor: [
            {
                $Kind: 'Function',
                $IsBound: true,
                '@Org.OData.Core.V1.Description':
                    'Returns true, if and only if the value of the node property of the specified hierarchy is an ancestor of the given child node with a distance of less than or equal to the optionally specified maximum distance',
                $Parameter: [
                    {
                        $Name: 'Entity',
                        $Type: 'Edm.EntityType'
                    },
                    {
                        $Name: 'Hierarchy'
                    },
                    {
                        $Name: 'Node',
                        $Type: 'Edm.PrimitiveType'
                    },
                    {
                        $Name: 'MaxDistance',
                        $Type: 'Edm.Int16',
                        $Nullable: true
                    }
                ],
                $ReturnType: {
                    $Type: 'Edm.Boolean'
                }
            }
        ],
        issibling: [
            {
                $Kind: 'Function',
                $IsBound: true,
                '@Org.OData.Core.V1.Description':
                    'Returns true, if and only if the value of the node property of the specified hierarchy has the same parent node as the specified node',
                $Parameter: [
                    {
                        $Name: 'Entity',
                        $Type: 'Edm.EntityType'
                    },
                    {
                        $Name: 'Hierarchy'
                    },
                    {
                        $Name: 'Node',
                        $Type: 'Edm.PrimitiveType'
                    }
                ],
                $ReturnType: {
                    $Type: 'Edm.Boolean'
                }
            }
        ],
        isleaf: [
            {
                $Kind: 'Function',
                $IsBound: true,
                '@Org.OData.Core.V1.Description':
                    'Returns true, if and only if the value of the node property of the specified hierarchy has no descendants',
                $Parameter: [
                    {
                        $Name: 'Entity',
                        $Type: 'Edm.EntityType'
                    },
                    {
                        $Name: 'Hierarchy'
                    }
                ],
                $ReturnType: {
                    $Type: 'Edm.Boolean'
                }
            }
        ],
        AvailableOnAggregates: {
            $Kind: 'Term',
            $Type: 'Org.OData.Aggregation.V1.AvailableOnAggregatesType',
            $AppliesTo: ['Action', 'Function'],
            '@Org.OData.Core.V1.Description':
                'This action or function is available on aggregated entities if the `RequiredProperties` are still defined'
        },
        AvailableOnAggregatesType: {
            $Kind: 'ComplexType',
            RequiredProperties: {
                $Collection: true,
                $Type: 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Properties required to apply this action or function'
            }
        },
        NavigationPropertyAggregationCapabilities: {
            $Kind: 'ComplexType',
            $BaseType: 'Org.OData.Capabilities.V1.NavigationPropertyRestriction',
            '@Org.OData.Core.V1.Revisions': [
                {
                    Kind: 'Deprecated',
                    Description:
                        '[`Capabilities.NavigationRestrictions`](Org.OData.Capabilities.V1.md#NavigationRestrictions) that make use of the additional properties in this subtype are deprecated in favor of [`ApplySupported`](#ApplySupported) and [`CustomAggregate`](#CustomAggregate)'
                }
            ],
            '@Org.OData.Core.V1.Description': 'Aggregation capabilities on a navigation path',
            ApplySupported: {
                $Type: 'Org.OData.Aggregation.V1.ApplySupportedType',
                $Nullable: true,
                '@Org.OData.Core.V1.Description': 'Support for `$apply`'
            },
            CustomAggregates: {
                $Collection: true,
                $Type: 'Org.OData.Aggregation.V1.CustomAggregateType',
                '@Org.OData.Core.V1.Description': 'Supported custom aggregates'
            }
        },
        CustomAggregateType: {
            $Kind: 'ComplexType',
            '@Org.OData.Core.V1.Revisions': [
                {
                    Kind: 'Deprecated',
                    Description:
                        'Deprecated since [`NavigationPropertyAggregationCapabilities`](#NavigationPropertyAggregationCapabilities) is also deprecated'
                }
            ],
            Name: {
                '@Org.OData.Core.V1.Description':
                    'Name of the dynamic property that can be used in the `aggregate` transformation'
            },
            Type: {
                '@Org.OData.Core.V1.Description':
                    'Qualified name of a primitive type. The aggregated value will be of that type'
            }
        }
    }
};
