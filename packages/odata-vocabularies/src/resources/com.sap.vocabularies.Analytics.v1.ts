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
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.Aggregation.V1',
                    '$Alias': 'Aggregation'
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
        'https://sap.github.io/odata-vocabularies/vocabularies/Hierarchy.json': {
            '$Include': [
                {
                    '$Namespace': 'com.sap.vocabularies.Hierarchy.v1',
                    '$Alias': 'Hierarchy'
                }
            ]
        }
    },
    'com.sap.vocabularies.Analytics.v1': {
        '$Alias': 'Analytics',
        '@Org.OData.Core.V1.Description': 'Terms for annotating analytical resources',
        '@Org.OData.Core.V1.Description#Published': '2017-02-15 © Copyright 2013 SAP AG. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Analytics.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Analytics.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/Analytics.md'
            }
        ],
        'Dimension': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '$BaseTerm': 'Org.OData.Aggregation.V1.Groupable',
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description': 'Deprecated in favor of [`AnalyticalContext/Dimension`](#AnalyticalContext)'
                }
            ],
            '@Org.OData.Core.V1.Description': 'A property holding the key of a dimension in an analytical context'
        },
        'Measure': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '$BaseTerm': 'Org.OData.Aggregation.V1.Aggregatable',
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description': 'Deprecated in favor of [`AnalyticalContext/Measure`](#AnalyticalContext)'
                }
            ],
            '@Org.OData.Core.V1.Description':
                'A property holding the numeric value of a measure in an analytical context'
        },
        'AccumulativeMeasure': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$BaseTerm': 'com.sap.vocabularies.Analytics.v1.Measure',
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description':
                        'Deprecated in favor of [`AnalyticalContext/AccumulativeMeasure`](#AnalyticalContext)'
                }
            ],
            '@Org.OData.Core.V1.Description':
                'The measure has non-negative and additive values; it can be used in whole-part charts, e.g. the Donut'
        },
        'RolledUpPropertyCount': {
            '$Kind': 'Term',
            '$Type': 'Edm.Int16',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Number of properties in the entity instance that have been aggregated away'
        },
        'DrillURL': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                '\n            URL to retrieve more detailed data related to a node of a recursive hierarchy.\n            Annotations with this term MUST include a qualifier to select the hierarchy for which the drill URL is provided.\n          ',
            '@Org.OData.Core.V1.IsURL': true
        },
        'PlanningAction': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['ActionImport'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                ' Processes or generates plan data. Its logic may have side-effects on entity sets.\n          '
        },
        'AggregatedProperties': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.Analytics.v1.AggregatedPropertyType',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description': 'Deprecated in favor of [`AggregatedProperty`](#AggregatedProperty)'
                }
            ],
            '@Org.OData.Core.V1.Description':
                'Dynamic properties for aggregate expressions with specified aggregation method defined on the annotated entity type.',
            '@Org.OData.Core.V1.LongDescription':
                '\n            Other annotations may refer in property paths to dynamic properties declared in any AgrgegatedProperties annotation of the \n            given entity type to leverage the results of the aggregate expression determined in the context of an entity collection of \n            the annotated type.\n          '
        },
        'AggregatedProperty': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Analytics.v1.AggregatedPropertyType',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description':
                'Dynamic property for aggregate expression with specified aggregation method defined on the annotated entity type.'
        },
        'AggregatedPropertyType': {
            '$Kind': 'ComplexType',
            'Name': {
                '$Type': 'Org.OData.Core.V1.SimpleIdentifier',
                '@Org.OData.Core.V1.Description': 'Name of the dynamic property holding the aggregated value.'
            },
            'AggregationMethod': {
                '$Type': 'Org.OData.Aggregation.V1.AggregationMethod',
                '@Org.OData.Core.V1.Description': 'Name of the standard or custom aggregation method to be applied.'
            },
            'AggregatableProperty': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Property whose values shall be aggregated.'
            },
            '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.Common.v1.Label']
        },
        'AnalyticalContext': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.Analytics.v1.AnalyticalContextType',
            '$AppliesTo': ['Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Collection of properties that define an analytical context'
        },
        'AnalyticalContextType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Exactly one of `Property` and `DynamicProperty` must be present',
            'Property': {
                '$Type': 'Edm.PropertyPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Property that is part of the analytical context'
            },
            'DynamicProperty': {
                '$Type': 'Edm.AnnotationPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Dynamic property introduced by annotations that is part of the analytical context',
                '@Org.OData.Validation.V1.AllowedTerms': [
                    'com.sap.vocabularies.Analytics.v1.AggregatedProperty',
                    'Org.OData.Aggregation.V1.CustomAggregate'
                ]
            },
            'Dimension': {
                '$Type': 'Org.OData.Core.V1.Tag',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'The property holds the key of a dimension'
            },
            'Measure': {
                '$Type': 'Org.OData.Core.V1.Tag',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'The property holds the numeric value of a measure'
            },
            'AccumulativeMeasure': {
                '$Type': 'Org.OData.Core.V1.Tag',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description':
                    'The measure has non-negative and additive values; it can be used in whole-part charts, e.g. the Donut'
            }
        },
        '$Annotations': {
            'Org.OData.Aggregation.V1.CustomAggregate': {
                '@Org.OData.Validation.V1.ApplicableTerms@Org.OData.Core.V1.Description':
                    'Adding a list of other terms that can be annotated to it.',
                '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.Common.v1.Label']
            }
        },
        'MultiLevelExpand': [
            {
                '$Kind': 'Function',
                '$EntitySetPath': 'InputSet',
                '$IsBound': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    '`$apply` transformation that expands an unnamed leveled hierarchy with custom aggregation of certain properties',
                '@Org.OData.Core.V1.LongDescription':
                    'Example transformation sequence:\nfilter on columns `Industry`, `Amount` and `Currency`,\norder by `Amount` descending,\nshow 2 levels, with two exceptions\npreceded by one row with a leaves count and one row with the grand total\n```\n$apply=filter(Industry in (\'IT\',\'AI\'))\n/groupby((Country,Region,Segment,Industry),\n         filter($these/aggregate(Amount) gt 0 and\n                $these/aggregate(Currency) ne null))\n/concat(\n  groupby((Country,Region,Segment,Industry))\n    /aggregate($count as LeavesCount),\n  aggregate(Amount,Currency),\n  Analytics.MultiLevelExpand(\n    LevelProperties=[{"DimensionProperties":["Country"],"AdditionalProperties":["CountryName"]},\n                     {"DimensionProperties":["Region"],"AdditionalProperties":["RegionName"]},\n                     {"DimensionProperties":["Segment","Industry"],"AdditionalProperties":[]}],\n    Aggregation=["Amount","Currency"],\n    SiblingOrder=[{"Property":"Amount","Descending":true}],\n    Levels=2,\n    ExpandLevels=[{"Entry":["US"],"Levels":0},\n                  {"Entry":["DE","BW"],"Levels":1}]\n  )/concat(aggregate($count as ResultEntriesCount),\n           skip(20)/top(10)))\n```\n',
                '$Parameter': [
                    {
                        '$Name': 'InputSet',
                        '$Collection': true,
                        '$Type': 'Edm.EntityType',
                        '@Org.OData.Core.V1.Description': 'Entity set to be processed'
                    },
                    {
                        '$Name': 'LevelProperties',
                        '$Collection': true,
                        '$Type': 'com.sap.vocabularies.Analytics.v1.MultiLevelExpandLevel',
                        '@Org.OData.Core.V1.Description':
                            'Collection of aggregation levels forming a leveled hierarchy',
                        '@Org.OData.Core.V1.LongDescription':
                            'Each element in the collection defines the properties that constitute one level.\n            A property must not be referenced by more than one level.\n            The first element in the collection defines the property names of the coarsest level,\n            the following elements define the property names of consecutively finer-grained aggregation levels.\n            The function result is the leveled hierarchy with these levels in preorder,\n            entries on the finest-grained level cannot be expanded further.\n            The result does not contain a level representing a root or grand total.\n            All referenced properties must be groupable.'
                    },
                    {
                        '$Name': 'Aggregation',
                        '$Collection': true,
                        '@Org.OData.Core.V1.Description':
                            'Properties to aggregate for all result entries on all levels',
                        '@Org.OData.Core.V1.LongDescription':
                            'All properties in this collection must be custom aggregates.'
                    },
                    {
                        '$Name': 'SiblingOrder',
                        '$Collection': true,
                        '$Type': 'com.sap.vocabularies.Analytics.v1.MultiLevelExpandSiblingOrder',
                        '@Org.OData.Core.V1.Description':
                            'Sort specification to apply to all direct descendants of a given entry (so-called siblings) in the resulting leveled hierarchy'
                    },
                    {
                        '$Name': 'Levels',
                        '$Type': 'Edm.Int64',
                        '@Org.OData.Core.V1.Description': 'Number N of levels to be shown in the initial expansion',
                        '@Org.OData.Core.V1.LongDescription':
                            'The initial expansion shows the first N levels as defined in `LevelProperties` (1 ≤ N ≤ length of `LevelProperties`).\n            If this parameter is omitted, all levels are shown.',
                        '@Org.OData.Core.V1.OptionalParameter': {}
                    },
                    {
                        '$Name': 'ExpandLevels',
                        '$Collection': true,
                        '$Type': 'com.sap.vocabularies.Analytics.v1.MultiLevelExpandEntry',
                        '@Org.OData.Core.V1.Description': 'Entries with exceptional expansion',
                        '@Org.OData.Core.V1.OptionalParameter': {}
                    },
                    {
                        '$Name': 'SubtotalsAtBottom',
                        '$Type': 'Edm.Boolean',
                        '@Org.OData.Core.V1.Description':
                            'Whether to duplicate the group headers so that they appear before and after their descendants',
                        '@Org.OData.Core.V1.LongDescription':
                            'The entry before has [DrillState](Hierarchy.md#HierarchyType) `expanded`,\n            the entry after has DrillState `subtotal`.',
                        '@Org.OData.Core.V1.OptionalParameter': {
                            'DefaultValue': 'false'
                        }
                    }
                ],
                '$ReturnType': {
                    '$Collection': true,
                    '$Type': 'Edm.EntityType',
                    '@Org.OData.Core.V1.Description':
                        'Output set including the instance annotation [`LevelInformation`](#LevelInformation)'
                }
            }
        ],
        'MultiLevelExpandLevel': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Property names constituting a level in an [unnamed leveled hierarchy](#MultiLevelExpand)',
            '@Org.OData.Core.V1.LongDescription':
                '`DimensionProperties` must be used to identify entries in [`ExpandEntries/Entry`](#MultiLevelExpandEntry),\n          otherwise they have the same effect as `AdditionalProperties`.',
            'DimensionProperties': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description':
                    'A non-empty list of property names that define a combination of dimension values'
            },
            'AdditionalProperties': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description':
                    'A possibly empty list of names of additional properties of the dimensions that occur in `DimensionProperties`'
            }
        },
        'MultiLevelExpandSiblingOrder': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Sibling order in an [unnamed leveled hierarchy](#MultiLevelExpand)',
            'Property': {
                '@Org.OData.Core.V1.Description': 'Property by which to sort'
            },
            'Descending': {
                '$Type': 'Edm.Boolean',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Sort direction, ascending if not specified otherwise'
            }
        },
        'MultiLevelExpandEntry': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Expansion state of an entry in an [unnamed leveled hierarchy](#MultiLevelExpand)',
            'Entry': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description':
                    'An entry on a given [level](#MultiLevelExpandLevel) is identified by a list of values for the `DimensionProperties` that constitute all levels up to and including the given one',
                '@Org.OData.Core.V1.LongDescription': 'The values are cast to strings as in the OData `cast` function.'
            },
            'Levels': {
                '$Type': 'Edm.Int64',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Number of levels to be expanded, null means all levels, 0 means collapsed'
            }
        },
        'LevelInformation': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Hierarchy.v1.HierarchyType',
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Information about grouping levels in the result set of a request including the [`MultiLevelExpand`](#MultiLevelExpand) transformation'
        }
    }
} as CSDL;
