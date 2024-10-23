// Last content update: Mon Oct 21 2024 11:45:53 GMT+0200 (Mitteleuropäische Sommerzeit)
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
        }
    }
} as CSDL;
