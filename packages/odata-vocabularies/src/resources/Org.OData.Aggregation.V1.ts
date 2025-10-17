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
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Capabilities.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.Capabilities.V1',
                    '$Alias': 'Capabilities'
                }
            ]
        }
    },
    'Org.OData.Aggregation.V1': {
        '$Alias': 'Aggregation',
        '@Org.OData.Core.V1.Description':
            'Terms to describe which data in a given entity model can be aggregated, and how.',
        '@Org.OData.Core.V1.LongDescription':
            'Related to the specification document [OData-Data-Agg-v4.0](http://docs.oasis-open.org/odata/odata-data-aggregation-ext/v4.0/odata-data-aggregation-ext-v4.0.html).',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Aggregation.V1.md'
            }
        ],
        'ApplySupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Aggregation.V1.ApplySupportedType',
            '$AppliesTo': ['EntitySet', 'Collection', 'EntityType'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'This entity set or collection supports the `$apply` system query option'
        },
        'ApplySupportedDefaults': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Aggregation.V1.ApplySupportedBase',
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description':
                'Default support of the `$apply` system query option for all collection-valued resources in the container',
            '@Org.OData.Core.V1.LongDescription':
                'Annotating term [`ApplySupported`](#ApplySupported) for a specific collection-valued resource overrides the default support with the specified properties using PATCH semantics:\n- Primitive or collection-valued properties specified in `ApplySupported` replace the corresponding properties specified in `ApplySupportedDefaults`\n- Complex-valued properties specified in `ApplySupported` override the corresponding properties specified in `ApplySupportedDefaults` using PATCH semantics recursively\n- Properties specified neither in `ApplySupported` nor in `ApplySupportedDefaults` have their default value'
        },
        'ApplySupportedBase': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.LongDescription':
                'Services that do not fully implement a certain aggregation-related functionality may document\n          this by annotating the [`ApplySupported`](#ApplySupported) or [`ApplySupportedDefaults`](#ApplySupportedDefaults)\n          annotation with a description.',
            'Transformations': {
                '$Collection': true,
                '$Type': 'Org.OData.Aggregation.V1.Transformation',
                '@Org.OData.Core.V1.Description': 'Transformations that can be used in `$apply`'
            },
            'CustomAggregationMethods': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description':
                    'Qualified names of custom aggregation methods that can be used in `aggregate(...with...)`'
            },
            'Rollup': {
                '$Type': 'Org.OData.Aggregation.V1.RollupType',
                '$DefaultValue': 'MultipleHierarchies',
                '@Org.OData.Core.V1.Description':
                    'The service supports rollup hierarchies in a `groupby` transformation'
            },
            'From': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description':
                    'The service supports the `from` keyword in an `aggregate` transformation'
            }
        },
        'ApplySupportedType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Aggregation.V1.ApplySupportedBase',
            'PropertyRestrictions': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Revisions': [
                    {
                        'Kind': 'Deprecated',
                        'Description':
                            'Deprecated since [`Groupable`](#Groupable) and [`Aggregatable`](#Aggregatable) are deprecated'
                    }
                ],
                '@Org.OData.Core.V1.Description':
                    'Only properties marked as `Groupable` can be used in the `groupby` transformation, and only those marked as `Aggregatable` can be used in the  `aggregate` transformation'
            },
            'GroupableProperties': {
                '$Collection': true,
                '$Type': 'Edm.AnyPropertyPath',
                '@Org.OData.Core.V1.Description':
                    'A non-empty collection indicates that only the listed properties of the annotated target are supported by the `groupby` transformation'
            },
            'AggregatableProperties': {
                '$Collection': true,
                '$Type': 'Org.OData.Aggregation.V1.AggregatablePropertyType',
                '@Org.OData.Core.V1.Description':
                    'A non-empty collection indicates that only the listed properties of the annotated target can be used in the `aggregate` transformation, optionally restricted to the specified aggregation methods'
            }
        },
        'AggregatablePropertyType': {
            '$Kind': 'ComplexType',
            'Property': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Aggregatable property'
            },
            'SupportedAggregationMethods': {
                '$Collection': true,
                '$Type': 'Org.OData.Aggregation.V1.AggregationMethod',
                '@Org.OData.Core.V1.Description':
                    'Standard and custom aggregation methods that can be applied to the property. If omitted, all aggregation methods can be applied'
            },
            'RecommendedAggregationMethod': {
                '$Type': 'Org.OData.Aggregation.V1.AggregationMethod',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Recommended method for aggregating values of the property'
            }
        },
        'Transformation': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'A transformation that can be used in `$apply`',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': 'aggregate',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.2.1'
                },
                {
                    'Value': 'groupby',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.2.3'
                },
                {
                    'Value': 'concat',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.2.2'
                },
                {
                    'Value': 'identity',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.4.1'
                },
                {
                    'Value': 'filter',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.3.2'
                },
                {
                    'Value': 'search',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.3.4'
                },
                {
                    'Value': 'nest',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.5.2'
                },
                {
                    'Value': 'addnested',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.4.3'
                },
                {
                    'Value': 'join',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.5.1'
                },
                {
                    'Value': 'outerjoin',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.5.1'
                },
                {
                    'Value': 'compute',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.4.2'
                },
                {
                    'Value': 'bottomcount',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.3.1.1'
                },
                {
                    'Value': 'bottomsum',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.3.1.3'
                },
                {
                    'Value': 'bottompercent',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.3.1.2'
                },
                {
                    'Value': 'topcount',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.3.1.1'
                },
                {
                    'Value': 'topsum',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.3.1.3'
                },
                {
                    'Value': 'toppercent',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.3.1.2'
                },
                {
                    'Value': 'orderby',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.3.3'
                },
                {
                    'Value': 'top',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.3.6'
                },
                {
                    'Value': 'skip',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 3.3.5'
                },
                {
                    'Value': 'ancestors',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 6.2.1'
                },
                {
                    'Value': 'descendants',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 6.2.1'
                },
                {
                    'Value': 'traverse',
                    '@Org.OData.Core.V1.Description': 'OData-Data-Agg-v4.0, section 6.2.2'
                }
            ]
        },
        'AggregationMethod': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'Standard or custom aggregation method',
            '@Org.OData.Core.V1.LongDescription':
                'Custom aggregation methods MUST use a namespace-qualified name, that is contain at least one dot. ',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': 'sum',
                    '@Org.OData.Core.V1.Description':
                        'Can be applied to numeric values to return the sum of the non-null values, or null if there are no non-null values or the input set is empty'
                },
                {
                    'Value': 'min',
                    '@Org.OData.Core.V1.Description':
                        'Can be applied to values with a totally ordered domain to return the smallest of the non-null values, or null if there are no non-null values or the input set is empty'
                },
                {
                    'Value': 'max',
                    '@Org.OData.Core.V1.Description':
                        'Can be applied to values with a totally ordered domain to return the largest of the non-null values, or null if there are no non-null values or the input set is empty'
                },
                {
                    'Value': 'average',
                    '@Org.OData.Core.V1.Description':
                        'Can be applied to numeric values to return the sum of the non-null values divided by the count of the non-null values, or null if there are no non-null values or the input set is empty'
                },
                {
                    'Value': 'countdistinct',
                    '@Org.OData.Core.V1.Description': 'Counts the distinct values, omitting any null values',
                    '@Org.OData.Core.V1.LongDescription':
                        'For navigation properties, it counts the distinct entities in the union of all entities related to entities in the input set. \n                  For collection-valued primitive properties, it counts the distinct items in the union of all collection values in the input set.'
                }
            ]
        },
        'RollupType': {
            '$Kind': 'EnumType',
            '@Org.OData.Core.V1.Description':
                'The number of `rollup` or `rolluprecursive` operators allowed in a `groupby` transformation',
            'None': 0,
            'None@Org.OData.Core.V1.Description': 'No support for `rollup` or `rolluprecursive`',
            'SingleHierarchy': 1,
            'SingleHierarchy@Org.OData.Core.V1.Description':
                'Only one `rollup` or `rolluprecursive` operator per `groupby`',
            'MultipleHierarchies': 2,
            'MultipleHierarchies@Org.OData.Core.V1.Description': 'Full support for `rollup` and `rolluprecursive`'
        },
        'Groupable': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'NavigationProperty'],
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description': 'Deprecated in favor of [`ApplySupported/GroupableProperties`](#ApplySupported)'
                }
            ],
            '@Org.OData.Core.V1.Description': 'This property can be used in the `groupby` transformation'
        },
        'Aggregatable': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'NavigationProperty'],
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description': 'Deprecated in favor of [`ApplySupported/AggregatableProperties`](#ApplySupported)'
                }
            ],
            '@Org.OData.Core.V1.Description': 'This property can be used in the `aggregate` transformation'
        },
        'CustomAggregate': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntitySet', 'Collection', 'EntityContainer', 'EntityType'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Dynamic property that can be used in the `aggregate` transformation',
            '@Org.OData.Core.V1.LongDescription':
                'This term MUST be applied with a Qualifier, the Qualifier value is the name of the dynamic property. The value of the annotation MUST be the qualified name of a primitive type. The aggregated value will be of that type.'
        },
        'ContextDefiningProperties': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Edm.PropertyPath',
            '$AppliesTo': ['Property', 'Annotation'],
            '@Org.OData.Core.V1.Description':
                'The annotated property or custom aggregate is only well-defined in the context of these properties',
            '@Org.OData.Core.V1.LongDescription':
                'The context-defining properties need either be part of the result entities, or be restricted to a single value by a pre-filter operation. Examples are postal codes within a country, or monetary amounts whose context is the unit of currency.'
        },
        'LeveledHierarchy': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Edm.PropertyPath',
            '$AppliesTo': ['EntityType', 'ComplexType'],
            '@Org.OData.Core.V1.Description': 'Defines a leveled hierarchy (OData-Data-Agg-v4.0, section 5.5.1)'
        },
        'RecursiveHierarchy': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Aggregation.V1.RecursiveHierarchyType',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Defines a recursive hierarchy (OData-Data-Agg-v4.0, section 5.5.2)'
        },
        'RecursiveHierarchyType': {
            '$Kind': 'ComplexType',
            'NodeProperty': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Primitive property holding the node identifier'
            },
            'ParentNavigationProperty': {
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description':
                    'Property for navigating to the parent node(s). Its type MUST be the entity type annotated with this term, and it MUST be collection-valued or nullable single-valued.'
            }
        },
        'HierarchyQualifier': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'Qualifier of a [`RecursiveHierarchy`](#RecursiveHierarchy) annotation',
            '@Org.OData.Core.V1.LongDescription':
                'Every recursive hierarchy function defined in this vocabulary has\n- a parameter `HierarchyQualifier` of this type and\n- a parameter `HierarchyNodes` that is a collection of entities of a common type without multiple occurrences of the same entity.\n\n`HierarchyQualifier` is the qualifier of a `RecursiveHierarchy` annotation on the entity type of the collection\ngiven by the `HierarchyNodes` parameter. This specifies a recursive hierarchy that is evaluated by the function.'
        },
        'isnode': [
            {
                '$Kind': 'Function',
                '@Org.OData.Core.V1.Description':
                    'Is the entity a node of the hierarchy specified by the [parameter pair](#HierarchyQualifier) (`HierarchyNodes`, `HierarchyQualifier`)? (See OData-Data-Agg-v4.0, section 5.5.2.1)',
                '@Org.OData.Core.V1.LongDescription':
                    'If a node identifier passed to the function is null, the function returns null.',
                '$Parameter': [
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
                        '$Name': 'Node',
                        '$Type': 'Edm.PrimitiveType',
                        '$Nullable': true,
                        '@Org.OData.Core.V1.Description': 'Node identifier of the putative node'
                    }
                ],
                '$ReturnType': {
                    '$Type': 'Edm.Boolean',
                    '$Nullable': true
                }
            }
        ],
        'isroot': [
            {
                '$Kind': 'Function',
                '@Org.OData.Core.V1.Description':
                    'Is the entity a root node of the hierarchy specified by the [parameter pair](#HierarchyQualifier) (`HierarchyNodes`, `HierarchyQualifier`)?',
                '@Org.OData.Core.V1.LongDescription':
                    'If a node identifier passed to the function is null, the function returns null.',
                '$Parameter': [
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
                        '$Name': 'Node',
                        '$Type': 'Edm.PrimitiveType',
                        '$Nullable': true,
                        '@Org.OData.Core.V1.Description': 'Node identifier of the putative root'
                    }
                ],
                '$ReturnType': {
                    '$Type': 'Edm.Boolean',
                    '$Nullable': true
                }
            }
        ],
        'isdescendant': [
            {
                '$Kind': 'Function',
                '@Org.OData.Core.V1.Description':
                    'Is the entity a descendant node of the ancestor node in the hierarchy specified by the [parameter pair](#HierarchyQualifier) (`HierarchyNodes`, `HierarchyQualifier`) with at most the specified distance? (See OData-Data-Agg-v4.0, section 5.5.2.1)',
                '@Org.OData.Core.V1.LongDescription':
                    'If a node identifier passed to the function is null, the function returns null.',
                '$Parameter': [
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
                        '$Name': 'Node',
                        '$Type': 'Edm.PrimitiveType',
                        '$Nullable': true,
                        '@Org.OData.Core.V1.Description': 'Node identifier of the putative descendant'
                    },
                    {
                        '$Name': 'Ancestor',
                        '$Type': 'Edm.PrimitiveType',
                        '$Nullable': true,
                        '@Org.OData.Core.V1.Description': 'Node identifier of the ancestor node'
                    },
                    {
                        '$Name': 'MaxDistance',
                        '$Type': 'Edm.Int16',
                        '@Org.OData.Core.V1.OptionalParameter': {
                            'DefaultValue': '32767'
                        },
                        '@Org.OData.Validation.V1.Minimum': 1
                    },
                    {
                        '$Name': 'IncludeSelf',
                        '$Type': 'Edm.Boolean',
                        '@Org.OData.Core.V1.Description': 'Whether to include the node itself in the result',
                        '@Org.OData.Core.V1.OptionalParameter': {
                            'DefaultValue': 'false'
                        }
                    }
                ],
                '$ReturnType': {
                    '$Type': 'Edm.Boolean',
                    '$Nullable': true
                }
            }
        ],
        'isancestor': [
            {
                '$Kind': 'Function',
                '@Org.OData.Core.V1.Description':
                    'Is the entity an ancestor node of the descendant node in the hierarchy specified by the [parameter pair](#HierarchyQualifier) (`HierarchyNodes`, `HierarchyQualifier`) with at most the specified distance? (See OData-Data-Agg-v4.0, section 5.5.2.1)',
                '@Org.OData.Core.V1.LongDescription':
                    'If a node identifier passed to the function is null, the function returns null.',
                '$Parameter': [
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
                        '$Name': 'Node',
                        '$Type': 'Edm.PrimitiveType',
                        '$Nullable': true,
                        '@Org.OData.Core.V1.Description': 'Node identifier of the putative ancestor'
                    },
                    {
                        '$Name': 'Descendant',
                        '$Type': 'Edm.PrimitiveType',
                        '$Nullable': true,
                        '@Org.OData.Core.V1.Description': 'Node identifier of the descendant node'
                    },
                    {
                        '$Name': 'MaxDistance',
                        '$Type': 'Edm.Int16',
                        '@Org.OData.Core.V1.OptionalParameter': {
                            'DefaultValue': '32767'
                        },
                        '@Org.OData.Validation.V1.Minimum': 1
                    },
                    {
                        '$Name': 'IncludeSelf',
                        '$Type': 'Edm.Boolean',
                        '@Org.OData.Core.V1.Description': 'Whether to include the node itself in the result',
                        '@Org.OData.Core.V1.OptionalParameter': {
                            'DefaultValue': 'false'
                        }
                    }
                ],
                '$ReturnType': {
                    '$Type': 'Edm.Boolean',
                    '$Nullable': true
                }
            }
        ],
        'issibling': [
            {
                '$Kind': 'Function',
                '@Org.OData.Core.V1.Description':
                    'Is the entity a sibling node of the other node in the hierarchy specified by the [parameter pair](#HierarchyQualifier) (`HierarchyNodes`, `HierarchyQualifier`)? (See OData-Data-Agg-v4.0, section 5.5.2.1)',
                '@Org.OData.Core.V1.LongDescription':
                    'A node is not a sibling of itself. If a node identifier passed to the function is null, the function returns null.',
                '$Parameter': [
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
                        '$Name': 'Node',
                        '$Type': 'Edm.PrimitiveType',
                        '$Nullable': true,
                        '@Org.OData.Core.V1.Description': 'Node identifier of the putative sibling'
                    },
                    {
                        '$Name': 'Other',
                        '$Type': 'Edm.PrimitiveType',
                        '$Nullable': true,
                        '@Org.OData.Core.V1.Description': 'Node identifier of the other node'
                    }
                ],
                '$ReturnType': {
                    '$Type': 'Edm.Boolean',
                    '$Nullable': true
                }
            }
        ],
        'isleaf': [
            {
                '$Kind': 'Function',
                '@Org.OData.Core.V1.Description':
                    'Is the entity a leaf node in the hierarchy specified by the [parameter pair](#HierarchyQualifier) (`HierarchyNodes`, `HierarchyQualifier`)? (See OData-Data-Agg-v4.0, section 5.5.2.1)',
                '@Org.OData.Core.V1.LongDescription':
                    'If a node identifier passed to the function is null, the function returns null.',
                '$Parameter': [
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
                        '$Name': 'Node',
                        '$Type': 'Edm.PrimitiveType',
                        '$Nullable': true,
                        '@Org.OData.Core.V1.Description': 'Node identifier of the putative leaf'
                    }
                ],
                '$ReturnType': {
                    '$Type': 'Edm.Boolean',
                    '$Nullable': true
                }
            }
        ],
        'rollupnode': [
            {
                '$Kind': 'Function',
                '@Org.OData.Core.V1.Description':
                    'During `rolluprecursive` for a hierarchy node, this function returns the node',
                '@Org.OData.Core.V1.LongDescription':
                    'This function may only occur in the second parameter of a `groupby` transformation whose first parameter\ncontains `rolluprecursive(...)`. It is evaluated as part of the transformation `R(x)` in the "`rolluprecursive` algorithm"\n(OData-Data-Agg-v4.0, section 6.3). Its behavior is undefined outside of this algorithm.\n```\nSales?$apply=groupby((rolluprecursive(...)), filter(SalesOrganization eq Aggregation.rollupnode())/aggregate(...))\n```\nconstructs a rollup that contains aggregates per hierarchy node while excluding descendants from the aggregation.',
                '$Parameter': [
                    {
                        '$Name': 'Position',
                        '$Type': 'Edm.Int16',
                        '@Org.OData.Core.V1.Description':
                            'Position N among the `rolluprecursive` operators in the first argument of `groupby`',
                        '@Org.OData.Core.V1.LongDescription':
                            'Every instance in the output set of a `groupby` transformation with M `rolluprecursive` operators\n            has M relationships to M nodes in M recursive hierarchies. This function returns the node x with path r to the root\n            in relationship number N.\n            If several such `groupby` transformations are nested, this function refers to the innermost one.',
                        '@Org.OData.Core.V1.OptionalParameter': {
                            'DefaultValue': '1'
                        },
                        '@Org.OData.Validation.V1.Minimum': 1
                    }
                ],
                '$ReturnType': {
                    '$Type': 'Edm.EntityType'
                }
            }
        ],
        'UpPath': {
            '$Kind': 'Term',
            '$Collection': true,
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description':
                'The string values of the node identifiers in a path from the annotated node to a start node in a traversal of a recursive hierarchy',
            '@Org.OData.Core.V1.LongDescription':
                'This instance annotation occurs in the result set after a `traverse` transformation (OData-Data-Agg-v4.0, section 6.2.2.2).\n          A use case for this is traversal with multiple parents, when this annotation takes\n          as value one parent node identifier followed by one grandparent node identifier and so on.'
        },
        'AvailableOnAggregates': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Aggregation.V1.AvailableOnAggregatesType',
            '$AppliesTo': ['Function'],
            '@Org.OData.Core.V1.Description':
                'This function is available on aggregated entities if the `RequiredProperties` are still defined'
        },
        'AvailableOnAggregatesType': {
            '$Kind': 'ComplexType',
            'RequiredProperties': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Properties required to apply this function'
            }
        },
        'NavigationPropertyAggregationCapabilities': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Capabilities.V1.NavigationPropertyRestriction',
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description':
                        '[`Capabilities.NavigationRestrictions`](Org.OData.Capabilities.V1.md#NavigationRestrictions) that make use of the additional properties in this subtype are deprecated in favor of [`ApplySupported`](#ApplySupported) and [`CustomAggregate`](#CustomAggregate)'
                }
            ],
            '@Org.OData.Core.V1.Description': 'Aggregation capabilities on a navigation path',
            'ApplySupported': {
                '$Type': 'Org.OData.Aggregation.V1.ApplySupportedType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Support for `$apply`'
            },
            'CustomAggregates': {
                '$Collection': true,
                '$Type': 'Org.OData.Aggregation.V1.CustomAggregateType',
                '@Org.OData.Core.V1.Description': 'Supported custom aggregates'
            }
        },
        'CustomAggregateType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description':
                        'Deprecated since [`NavigationPropertyAggregationCapabilities`](#NavigationPropertyAggregationCapabilities) is also deprecated'
                }
            ],
            'Name': {
                '@Org.OData.Core.V1.Description':
                    'Name of the dynamic property that can be used in the `aggregate` transformation'
            },
            'Type': {
                '@Org.OData.Core.V1.Description':
                    'Qualified name of a primitive type. The aggregated value will be of that type'
            }
        }
    }
} as CSDL;
