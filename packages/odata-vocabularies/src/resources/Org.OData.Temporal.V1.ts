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
        }
    },
    'Org.OData.Temporal.V1': {
        '$Alias': 'Temporal',
        '@Org.OData.Core.V1.Description': 'Terms for describing time-dependent data',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Temporal.V1.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Temporal.V1.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Temporal.V1.md'
            }
        ],
        'ApplicationTimeSupport': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Temporal.V1.ApplicationTimeSupportType',
            '$AppliesTo': ['Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'This collection supports temporal requests'
        },
        'ApplicationTimeSupportType': {
            '$Kind': 'ComplexType',
            'UnitOfTime': {
                '$Type': 'Org.OData.Temporal.V1.UnitOfTime',
                '@Org.OData.Core.V1.Description': 'Unit of time and other properties of a time period'
            },
            'Timeline': {
                '$Type': 'Org.OData.Temporal.V1.Timeline',
                '@Org.OData.Core.V1.Description': 'Describes how the history and future of the data are represented'
            },
            'SupportedActions': {
                '$Collection': true,
                '$Type': 'Org.OData.Core.V1.QualifiedActionName',
                '@Org.OData.Core.V1.Description': 'List of supported temporal actions'
            }
        },
        'UnitOfTime': {
            '$Kind': 'ComplexType',
            '$Abstract': true,
            '@Org.OData.Core.V1.Description': 'Unit of time and other properties of a time period'
        },
        'UnitOfTimeDateTimeOffset': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Temporal.V1.UnitOfTime',
            '@Org.OData.Core.V1.Description': 'Period start and end are of type Edm.DateTimeOffset',
            'Precision': {
                '$Type': 'Edm.Byte',
                '@Org.OData.Core.V1.Description': 'Precision of Edm.DateTimeOffset values for period start and end'
            }
        },
        'UnitOfTimeDate': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Temporal.V1.UnitOfTime',
            '@Org.OData.Core.V1.Description': 'Period start and end are of type Edm.Date',
            '@Org.OData.Core.V1.LongDescription':
                'The period is a contiguous set of days and does not consider the time of the day.',
            'ClosedClosedPeriods': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description':
                    'If `true`, the period end is the last day in the period; if `false`, the period end is the first day after the period'
            }
        },
        'Timeline': {
            '$Kind': 'ComplexType',
            '$Abstract': true,
            '@Org.OData.Core.V1.Description': 'Describes how the history and future of the data are represented'
        },
        'TimelineSnapshot': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Temporal.V1.Timeline',
            '@Org.OData.Core.V1.Description':
                'Each OData entity maps each point in application time to an instance of the entity type',
            '@Org.OData.Core.V1.LongDescription':
                'To address an entity in a resource path or path to related resources, a point in application time must be specified as described in [OData-Temporal, section 4.2.1].\n          The addressed entity is then a snapshot of the data at the given point in time.\n          When an action defined in this vocabulary is applied to a collection of this entity type,\n          the entity key plays the role of object key.'
        },
        'TimelineVisible': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Temporal.V1.Timeline',
            '@Org.OData.Core.V1.Description': 'Each OData entity represents data during a period of application time',
            '@Org.OData.Core.V1.LongDescription':
                'The temporal collection MUST NOT contain two entities with the same object key as defined by their `ObjectKey` properties\n          and with overlapping application-time periods as defined by their `PeriodStart` and `PeriodEnd` properties.\n          The temporal collection always contains all entities (with consecutive time periods) for a given object key.',
            'PeriodStart': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Property containing lower boundary of a period'
            },
            'PeriodEnd': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Property containing upper boundary of a period',
                '@Org.OData.Core.V1.LongDescription':
                    'If an upper boundary property does not specify a default value, a default value of `max` is assumed.'
            },
            'ObjectKey': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'The set of primitive properties that identify a temporal object',
                '@Org.OData.Core.V1.LongDescription':
                    'A temporal object is a set of facts whose changes over application time are tracked by the service. The entities in the annotated collection belong to potentially multiple temporal objects, and each temporal object is uniquely identified by the values of the specified object key properties. Object key properties follow the same rules as entity key properties. If no object key is specified, only a single temporal object belongs to the annotated collection.'
            }
        },
        'TimesliceWithPeriod': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Delta time slices with validity period',
            '@Org.OData.Core.V1.LongDescription':
                'The properties `PeriodStart` and `PeriodEnd` MUST NOT be present\n          if the entity type of the `Timeslice` already contains period start and end, that is,\n          if the collection on which the action is invoked has visible timeline.\n          If present, they MUST have the same type, either `Edm.Date` or `Edm.DateTimeOffset`,\n          and they are interpreted according to the [`ApplicationTimeSupport/UnitOfTime`](#ApplicationTimeSupportType) of the collection.\n          In particular, `ApplicationTimeSupport/UnitOfTime/ClosedClosedPeriods` governs whether a `PeriodEnd` of type `Edm.Date`\n          is the last day in the period or the first day after the period.\n          If `PeriodStart` is present and `PeriodEnd` is absent, a default value of `max` is assumed for `PeriodEnd`.',
            'PeriodStart': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Lower boundary of the time slice'
            },
            'PeriodEnd': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Upper boundary of the time slice'
            },
            'Timeslice': {
                '$Kind': 'NavigationProperty',
                '$Type': 'Edm.EntityType',
                '@Org.OData.Core.V1.AutoExpand': true,
                '@Org.OData.Core.V1.Description':
                    'A time slice with the same entity type as the binding parameter of the action',
                '@Org.OData.Core.V1.LongDescription':
                    'When it appears in the return type of an action in this vocabulary, the time slice has the same entity set as the binding parameter value.'
            }
        },
        'Update': [
            {
                '$Kind': 'Action',
                '$IsBound': true,
                '@Org.OData.Core.V1.Description':
                    'Updates existing time slices with values from delta time slices whose object keys match and whose periods overlap',
                '@Org.OData.Core.V1.LongDescription':
                    'The update behavior for a given object key is known from the [SQL statement](https://www.ibm.com/docs/en/db2oc?topic=statements-update)\n          `UPDATE ... FOR PORTION OF BUSINESS_TIME ... WHERE ...`.\n\n`deltaTimeslices` with non-matching object keys and non-overlapping sub-periods of `deltaTimeslices` are disregarded.',
                '$Parameter': [
                    {
                        '$Name': 'timeslices',
                        '$Collection': true,
                        '$Type': 'Edm.EntityType',
                        '@Org.OData.Core.V1.Description': 'Time slices to modify'
                    },
                    {
                        '$Name': 'deltaTimeslices',
                        '$Collection': true,
                        '$Type': 'Org.OData.Temporal.V1.TimesliceWithPeriod',
                        '@Org.OData.Core.V1.Description':
                            'New time slices whose property values are used to update the `timeslices` collection',
                        '@Org.OData.Core.V1.LongDescription':
                            'The delta time slices need not contain all properties, but at least the boundary values of the period to change.\n            An absent object key property matches any key property value.\n            New time slices are processed in the order of the collection, which especially matters if some of the specified change periods overlap.'
                    }
                ],
                '$ReturnType': {
                    '$Collection': true,
                    '$Type': 'Org.OData.Temporal.V1.TimesliceWithPeriod',
                    '@Org.OData.Core.V1.Description': 'Modified time slices'
                }
            }
        ],
        'Upsert': [
            {
                '$Kind': 'Action',
                '$IsBound': true,
                '@Org.OData.Core.V1.Description':
                    'Like [`Update`](#Update), but additionally inserts those (sub-periods of) `deltaTimeslices` that `Update` disregards',
                '$Parameter': [
                    {
                        '$Name': 'timeslices',
                        '$Collection': true,
                        '$Type': 'Edm.EntityType',
                        '@Org.OData.Core.V1.Description': 'Time slices to modify'
                    },
                    {
                        '$Name': 'deltaTimeslices',
                        '$Collection': true,
                        '$Type': 'Org.OData.Temporal.V1.TimesliceWithPeriod',
                        '@Org.OData.Core.V1.Description':
                            'New time slices to be merged into the `timeslices` collection',
                        '@Org.OData.Core.V1.LongDescription':
                            'The delta time slices must contain all properties that are needed for insertion.\n            New time slices are processed in the order of the collection, which especially matters if some of the specified change periods overlap.'
                    }
                ],
                '$ReturnType': {
                    '$Collection': true,
                    '$Type': 'Org.OData.Temporal.V1.TimesliceWithPeriod',
                    '@Org.OData.Core.V1.Description': 'Modified time slices'
                }
            }
        ],
        'Delete': [
            {
                '$Kind': 'Action',
                '$IsBound': true,
                '@Org.OData.Core.V1.Description':
                    'Deletes (sub-periods of) existing time slices whose object keys match and whose periods overlap `deltaTimeslices`',
                '@Org.OData.Core.V1.LongDescription':
                    'The deletion behavior for a given object key is known from the [SQL statement](https://www.ibm.com/docs/en/db2oc?topic=statements-delete)\n          `DELETE ... FOR PORTION OF BUSINESS_TIME ... WHERE ...`.\n          The sub-period of an existing time slice that lies outside a given instance of `deltaTimeslices`\n          is kept, effectively shortening the time slice.',
                '$Parameter': [
                    {
                        '$Name': 'timeslices',
                        '$Collection': true,
                        '$Type': 'Edm.EntityType',
                        '@Org.OData.Core.V1.Description': 'Time slices to modify'
                    },
                    {
                        '$Name': 'deltaTimeslices',
                        '$Collection': true,
                        '$Type': 'Org.OData.Temporal.V1.TimesliceWithPeriod',
                        '@Org.OData.Core.V1.Description': 'Time slices to be deleted from the `timeslices` collection',
                        '@Org.OData.Core.V1.LongDescription':
                            'The delta time slices contain only the boundary values of the period to delete and (parts of) the object key.\n            An absent object key property matches any key property value.'
                    }
                ],
                '$ReturnType': {
                    '$Collection': true,
                    '$Type': 'Org.OData.Temporal.V1.TimesliceWithPeriod',
                    '@Org.OData.Core.V1.Description': 'Deleted (sub-periods of) time slices'
                }
            }
        ]
    }
} as CSDL;
