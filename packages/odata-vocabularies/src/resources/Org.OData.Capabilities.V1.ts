// Last content update: Wed Oct 15 2025 09:21:20 GMT+0200 (Central European Summer Time)
import type { CSDL } from '@sap-ux/vocabularies/CSDL';

export default {
    '$Version': '4.0',
    '$Reference': {
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Authorization.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.Authorization.V1',
                    '$Alias': 'Authorization'
                }
            ]
        },
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
        }
    },
    'Org.OData.Capabilities.V1': {
        '$Alias': 'Capabilities',
        '@Org.OData.Core.V1.Description': 'Terms describing capabilities of a service',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Capabilities.V1.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Capabilities.V1.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Capabilities.V1.md'
            }
        ],
        '@Org.OData.Core.V1.LongDescription':
            '\nThere are some capabilities which are strongly recommended for services to support even\nthough they are optional. Support for $top and $skip is a good example as\nsupporting these query options helps with performance of a service and are essential. Such\ncapabilities are assumed to be default capabilities of an OData service even in\nthe case that a capabilities annotation doesn’t exist. Capabilities annotations are\nmainly expected to be used to explicitly specify that a service doesn’t support such\ncapabilities. Capabilities annotations can as well be used to declaratively\nspecify the support of such capabilities.\n\nOn the other hand, there are some capabilities that a service may choose to support or\nnot support and in varying degrees. $filter and $orderby are such good examples.\nThis vocabulary aims to define terms to specify support or no support for such\ncapabilities.\n\nA service is assumed to support by default the following capabilities even though an\nannotation doesn’t exist:\n- Countability ($count)\n- Client pageability ($top, $skip)\n- Expandability ($expand)\n- Indexability by key\n- Batch support ($batch)\n- Navigability of navigation properties\n\nA service is expected to support the following capabilities. If not supported, the\nservice is expected to call out the restrictions using annotations:\n- Filterability ($filter)\n- Sortability ($orderby)\n- Queryability of top level entity sets\n- Query functions\n\nA client cannot assume that a service supports certain capabilities. A client can try, but\nit needs to be prepared to handle an error in case the following capabilities are not\nsupported:\n- Insertability\n- Updatability\n- Deletability\n        ',
        'ConformanceLevel': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.ConformanceLevelType',
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'The conformance level achieved by this service'
        },
        'ConformanceLevelType': {
            '$Kind': 'EnumType',
            'Minimal': 0,
            'Minimal@Org.OData.Core.V1.Description': 'Minimal conformance level',
            'Intermediate': 1,
            'Intermediate@Org.OData.Core.V1.Description': 'Intermediate conformance level',
            'Advanced': 2,
            'Advanced@Org.OData.Core.V1.Description': 'Advanced conformance level'
        },
        'SupportedFormats': {
            '$Kind': 'Term',
            '$Collection': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'Media types of supported formats, including format parameters',
            '@Org.OData.Core.V1.IsMediaType': true
        },
        'SupportedMetadataFormats': {
            '$Kind': 'Term',
            '$Collection': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description':
                'Media types of supported formats for $metadata, including format parameters',
            '@Org.OData.Core.V1.IsMediaType': true
        },
        'AcceptableEncodings': {
            '$Kind': 'Term',
            '$Collection': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'List of acceptable compression methods for ($batch) requests, e.g. gzip'
        },
        'AsynchronousRequestsSupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'Service supports the asynchronous request preference'
        },
        'BatchContinueOnErrorSupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description':
                'Service supports the continue on error preference. Supports $batch requests. Services that apply the BatchContinueOnErrorSupported term should also specify the ContinueOnErrorSupported property from the BatchSupport term.'
        },
        'IsolationSupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.IsolationLevel',
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'Supported odata.isolation levels'
        },
        'IsolationLevel': {
            '$Kind': 'EnumType',
            '$IsFlags': true,
            'Snapshot': 1,
            'Snapshot@Org.OData.Core.V1.Description':
                'All data returned for a request, including multiple requests within a batch or results retrieved across multiple pages, will be consistent as of a single point in time'
        },
        'CrossJoinSupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'Supports cross joins for the entity sets in this container'
        },
        'CallbackSupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.CallbackType',
            '$AppliesTo': ['EntityContainer', 'EntitySet'],
            '@Org.OData.Core.V1.Description': 'Supports callbacks for the specified protocols'
        },
        'CallbackType': {
            '$Kind': 'ComplexType',
            'CallbackProtocols': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.CallbackProtocol',
                '@Org.OData.Core.V1.Description': 'List of supported callback protocols, e.g. `http` or `wss`'
            },
            '@Org.OData.Core.V1.Description':
                "A non-empty collection lists the full set of supported protocols. A empty collection means 'only HTTP is supported'"
        },
        'CallbackProtocol': {
            '$Kind': 'ComplexType',
            'Id': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Protocol Identifier'
            },
            'UrlTemplate': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'URL Template including parameters. Parameters are enclosed in curly braces {} as defined in RFC6570'
            },
            'DocumentationUrl': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Human readable description of the meaning of the URL Template parameters',
                '@Org.OData.Core.V1.IsURL': true
            }
        },
        'ChangeTracking': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.ChangeTrackingType',
            '$AppliesTo': ['EntitySet', 'Singleton', 'Function', 'FunctionImport', 'NavigationProperty'],
            '@Org.OData.Core.V1.Description': 'Change tracking capabilities of this service or entity set'
        },
        'ChangeTrackingBase': {
            '$Kind': 'ComplexType',
            'Supported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'odata.track-changes preference is supported'
            }
        },
        'ChangeTrackingType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Capabilities.V1.ChangeTrackingBase',
            'FilterableProperties': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Change tracking supports filters on these properties',
                '@Org.OData.Core.V1.LongDescription':
                    'If no properties are specified or FilterableProperties is omitted, clients cannot assume support for filtering on any properties in combination with change tracking.'
            },
            'ExpandableProperties': {
                '$Collection': true,
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description': 'Change tracking supports these properties expanded',
                '@Org.OData.Core.V1.LongDescription':
                    'If no properties are specified or ExpandableProperties is omitted, clients cannot assume support for expanding any properties in combination with change tracking.'
            }
        },
        'CountRestrictions': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.CountRestrictionsType',
            '$AppliesTo': ['EntitySet', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Restrictions on /$count path suffix and $count=true system query option'
        },
        'CountRestrictionsBase': {
            '$Kind': 'ComplexType',
            'Countable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Instances can be counted in requests targeting a collection'
            }
        },
        'CountRestrictionsType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Capabilities.V1.CountRestrictionsBase',
            'NonCountableProperties': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Members of these collection properties cannot be counted'
            },
            'NonCountableNavigationProperties': {
                '$Collection': true,
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description': 'Members of these navigation properties cannot be counted'
            }
        },
        'NavigationRestrictions': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.NavigationRestrictionsType',
            '$AppliesTo': ['EntitySet', 'Singleton', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description':
                'Restrictions on navigating properties according to OData URL conventions',
            '@Org.OData.Core.V1.LongDescription':
                'Restrictions specified on an entity set are valid whether the request is directly to the entity set or through a navigation property bound to that entity set. Services can specify a different set of restrictions specific to a path, in which case the more specific restrictions take precedence.'
        },
        'NavigationRestrictionsType': {
            '$Kind': 'ComplexType',
            'Navigability': {
                '$Type': 'Org.OData.Capabilities.V1.NavigationType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Default navigability for all navigation properties of the annotation target. Individual navigation properties can override this value via `RestrictedProperties/Navigability`.'
            },
            'RestrictedProperties': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.NavigationPropertyRestriction',
                '@Org.OData.Core.V1.Description': 'List of navigation properties with restrictions'
            }
        },
        'NavigationPropertyRestriction': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.LongDescription':
                'Using a property of `NavigationPropertyRestriction` in a [`NavigationRestrictions`](#NavigationRestrictions) annotation\n          is discouraged in favor of using an annotation with the corresponding term from this vocabulary and a target path starting with a container and ending in the `NavigationProperty`,\n          unless the favored alternative is impossible because a dynamic expression requires an instance path whose evaluation\n          starts at the target of the `NavigationRestrictions` annotation. See [this example](../examples/Org.OData.Capabilities.V1.capabilities.md).',
            'NavigationProperty': {
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description': 'Navigation properties can be navigated',
                '@Org.OData.Core.V1.LongDescription':
                    'The target path of a [`NavigationRestrictions`](#NavigationRestrictions) annotation followed by this\n            navigation property path addresses the resource to which the other properties of `NavigationPropertyRestriction` apply.\n            Instance paths that occur in dynamic expressions are evaluated starting at the boundary between both paths,\n            which must therefore be chosen accordingly.'
            },
            'Navigability': {
                '$Type': 'Org.OData.Capabilities.V1.NavigationType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Supported navigability of this navigation property'
            },
            'FilterFunctions': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description': 'List of functions and operators supported in filter expressions',
                '@Org.OData.Core.V1.LongDescription':
                    'If not specified, null, or empty, all functions and operators may be attempted.'
            },
            'FilterRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.FilterRestrictionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on filter expressions'
            },
            'SearchRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.SearchRestrictionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on search expressions'
            },
            'SortRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.SortRestrictionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on orderby expressions'
            },
            'TopSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Supports $top'
            },
            'SkipSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Supports $skip'
            },
            'SelectSupport': {
                '$Type': 'Org.OData.Capabilities.V1.SelectSupportType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Support for $select'
            },
            'IndexableByKey': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Supports key values according to OData URL conventions'
            },
            'InsertRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.InsertRestrictionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on insert operations'
            },
            'DeepInsertSupport': {
                '$Type': 'Org.OData.Capabilities.V1.DeepInsertSupportType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Deep Insert Support of the annotated resource (the whole service, an entity set, or a collection-valued resource)'
            },
            'UpdateRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.UpdateRestrictionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on update operations'
            },
            'DeepUpdateSupport': {
                '$Type': 'Org.OData.Capabilities.V1.DeepUpdateSupportType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Deep Update Support of the annotated resource (the whole service, an entity set, or a collection-valued resource)'
            },
            'DeleteRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.DeleteRestrictionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on delete operations'
            },
            'OptimisticConcurrencyControl': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description':
                    'Data modification (including insert) along this navigation property requires the use of ETags'
            },
            'ReadRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.ReadRestrictionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions for retrieving entities'
            }
        },
        'NavigationType': {
            '$Kind': 'EnumType',
            'Recursive': 0,
            'Recursive@Org.OData.Core.V1.Description': 'Navigation properties can be recursively navigated',
            'Single': 1,
            'Single@Org.OData.Core.V1.Description': 'Navigation properties can be navigated to a single level',
            'None': 2,
            'None@Org.OData.Core.V1.Description': 'Navigation properties are not navigable'
        },
        'IndexableByKey': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntitySet', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Supports key values according to OData URL conventions'
        },
        'TopSupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntitySet', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Supports $top'
        },
        'SkipSupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntitySet', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Supports $skip'
        },
        'ComputeSupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntitySet', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Supports $compute'
        },
        'SelectSupport': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.SelectSupportType',
            '$AppliesTo': ['EntityContainer', 'EntitySet', 'Singleton', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Support for $select and nested query options within $select'
        },
        'SelectSupportType': {
            '$Kind': 'ComplexType',
            'Supported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Supports $select'
            },
            'InstanceAnnotationsSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Supports instance annotations in $select list'
            },
            'Expandable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': '$expand within $select is supported'
            },
            'Filterable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': '$filter within $select is supported'
            },
            'Searchable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': '$search within $select is supported'
            },
            'TopSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': '$top within $select is supported'
            },
            'SkipSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': '$skip within $select is supported'
            },
            'ComputeSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': '$compute within $select is supported'
            },
            'Countable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': '$count within $select is supported'
            },
            'Sortable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': '$orderby within $select is supported'
            }
        },
        'BatchSupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description':
                'Supports $batch requests. Services that apply the BatchSupported term should also apply the more comprehensive BatchSupport term.'
        },
        'BatchSupport': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.BatchSupportType',
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'Batch Support for the service'
        },
        'BatchSupportType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Validation.V1.ApplicableTerms': [
                'Org.OData.Core.V1.Description',
                'Org.OData.Core.V1.LongDescription'
            ],
            'Supported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Service supports requests to $batch'
            },
            'ContinueOnErrorSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Service supports the continue on error preference'
            },
            'ReferencesInRequestBodiesSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Service supports Content-ID referencing in request bodies'
            },
            'ReferencesAcrossChangeSetsSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Service supports Content-ID referencing across change sets'
            },
            'EtagReferencesSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Service supports referencing Etags from previous requests'
            },
            'RequestDependencyConditionsSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Service supports the `if` member in JSON batch requests'
            },
            'SupportedFormats': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description': 'Media types of supported formats for $batch',
                '@Org.OData.Core.V1.IsMediaType': true,
                '@Org.OData.Validation.V1.AllowedValues': [
                    {
                        'Value': 'multipart/mixed',
                        '@Org.OData.Core.V1.Description':
                            '[Multipart Batch Format](http://docs.oasis-open.org/odata/odata/v4.01/cs01/part1-protocol/odata-v4.01-cs01-part1-protocol.html#sec_MultipartBatchFormat)'
                    },
                    {
                        'Value': 'application/json',
                        '@Org.OData.Core.V1.Description':
                            '[JSON Batch Format](http://docs.oasis-open.org/odata/odata-json-format/v4.01/cs01/odata-json-format-v4.01-cs01.html#sec_BatchRequestsandResponses)'
                    }
                ]
            }
        },
        'FilterFunctions': {
            '$Kind': 'Term',
            '$Collection': true,
            '$AppliesTo': ['EntityContainer', 'EntitySet', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'List of functions and operators supported in filter expressions',
            '@Org.OData.Core.V1.LongDescription':
                'If not specified, null, or empty, all functions and operators may be attempted.'
        },
        'FilterRestrictions': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.FilterRestrictionsType',
            '$AppliesTo': ['EntitySet', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Restrictions on filter expressions'
        },
        'FilterRestrictionsBase': {
            '$Kind': 'ComplexType',
            '@Org.OData.Validation.V1.ApplicableTerms': ['Org.OData.Core.V1.Description'],
            'Filterable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': '$filter is supported'
            },
            'RequiresFilter': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': '$filter is required'
            },
            'MaxLevels': {
                '$Type': 'Edm.Int32',
                '$DefaultValue': -1,
                '@Org.OData.Core.V1.Description':
                    'The maximum number of levels (including recursion) that can be traversed in a filter expression. A value of -1 indicates there is no restriction.'
            }
        },
        'FilterRestrictionsType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Capabilities.V1.FilterRestrictionsBase',
            'RequiredProperties': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description':
                    'These properties must be specified in the $filter clause (properties of derived types are not allowed here)'
            },
            'NonFilterableProperties': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'These structural properties cannot be used in filter expressions'
            },
            'FilterExpressionRestrictions': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.FilterExpressionRestrictionType',
                '@Org.OData.Core.V1.Description':
                    'These properties only allow a subset of filter expressions. A valid filter expression for a single property can be enclosed in parentheses and combined by `and` with valid expressions for other properties.'
            }
        },
        'FilterExpressionRestrictionType': {
            '$Kind': 'ComplexType',
            'Property': {
                '$Type': 'Edm.PropertyPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Path to the restricted property'
            },
            'AllowedExpressions': {
                '$Type': 'Org.OData.Capabilities.V1.FilterExpressionType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Allowed subset of expressions'
            }
        },
        'FilterExpressionType': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': 'SingleValue',
                    '@Org.OData.Core.V1.Description': 'Property can be used in a single `eq` clause'
                },
                {
                    'Value': 'MultiValue',
                    '@Org.OData.Core.V1.Description':
                        'Property can be used in multiple `eq` and `in` clauses, combined by `or` (which is logically equivalent to a single `in` clause)'
                },
                {
                    'Value': 'SingleRange',
                    '@Org.OData.Core.V1.Description':
                        'Property can be compared to a single closed, half-open, or open interval',
                    '@Org.OData.Core.V1.LongDescription':
                        'The filter expression for this property consists of a single interval expression, which is either a single comparison of the property and a literal value with `eq`, `le`, `lt`, `ge`, or `gt`, or a pair of boundaries combined by `and`. The lower boundary is either `ge` or `gt`, the upper boundary either `le` or `lt`.'
                },
                {
                    'Value': 'MultiRange',
                    '@Org.OData.Core.V1.Description':
                        'Property can be compared to a union of one or more closed, half-open, or open intervals',
                    '@Org.OData.Core.V1.LongDescription':
                        'The filter expression for this property consists of one or more interval expressions, combined by `or`. See SingleRange for the definition of an interval expression.\n\n                Alternatively the filter expression can consist of one or more `ne` expressions combined by `and`, which is roughly equivalent to the union of the complementing open intervals. Roughly equivalent because `null` is allowed as a right-side operand of an `ne` expression.'
                },
                {
                    'Value': 'SearchExpression',
                    '@Org.OData.Core.V1.Description':
                        'String property can be used as first operand in one or more `startswith`, `endswith`, and `contains` clauses, combined by `or`'
                },
                {
                    'Value': 'MultiRangeOrSearchExpression',
                    '@Org.OData.Core.V1.Description':
                        'Property can be compared to a union of zero or more closed, half-open, or open intervals plus zero or more simple string patterns',
                    '@Org.OData.Core.V1.LongDescription':
                        'The filter expression for this property consists of one or more interval expressions or string comparison functions combined by `or`. See SingleRange for the definition of an interval expression. See SearchExpression for the allowed string comparison functions.'
                }
            ]
        },
        'SortRestrictions': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.SortRestrictionsType',
            '$AppliesTo': ['EntitySet', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Restrictions on orderby expressions'
        },
        'SortRestrictionsBase': {
            '$Kind': 'ComplexType',
            '@Org.OData.Validation.V1.ApplicableTerms': ['Org.OData.Core.V1.Description'],
            'Sortable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': '$orderby is supported'
            }
        },
        'SortRestrictionsType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Capabilities.V1.SortRestrictionsBase',
            'AscendingOnlyProperties': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'These properties can only be used for sorting in Ascending order'
            },
            'DescendingOnlyProperties': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'These properties can only be used for sorting in Descending order'
            },
            'NonSortableProperties': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'These structural properties cannot be used in orderby expressions'
            }
        },
        'ExpandRestrictions': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.ExpandRestrictionsType',
            '$AppliesTo': ['EntitySet', 'Singleton', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Restrictions on expand expressions'
        },
        'ExpandRestrictionsBase': {
            '$Kind': 'ComplexType',
            '@Org.OData.Validation.V1.ApplicableTerms': ['Org.OData.Core.V1.Description'],
            'Expandable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': '$expand is supported'
            },
            'StreamsExpandable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': '$expand is supported for stream properties and media streams'
            },
            'MaxLevels': {
                '$Type': 'Edm.Int32',
                '$DefaultValue': -1,
                '@Org.OData.Core.V1.Description':
                    'The maximum number of levels that can be expanded in a expand expression. A value of -1 indicates there is no restriction.'
            }
        },
        'ExpandRestrictionsType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Capabilities.V1.ExpandRestrictionsBase',
            'NonExpandableProperties': {
                '$Collection': true,
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description': 'These properties cannot be used in expand expressions'
            },
            'NonExpandableStreamProperties': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'These stream properties cannot be used in expand expressions'
            }
        },
        'SearchRestrictions': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.SearchRestrictionsType',
            '$AppliesTo': ['EntitySet', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Restrictions on search expressions'
        },
        'SearchRestrictionsType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Validation.V1.ApplicableTerms': ['Org.OData.Core.V1.Description'],
            'Searchable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': '$search is supported'
            },
            'UnsupportedExpressions': {
                '$Type': 'Org.OData.Capabilities.V1.SearchExpressions',
                '$DefaultValue': 'none',
                '@Org.OData.Core.V1.Description': 'Expressions not supported in $search'
            }
        },
        'SearchExpressions': {
            '$Kind': 'EnumType',
            '$IsFlags': true,
            'none': 0,
            'none@Org.OData.Core.V1.Description': 'Single search term',
            'AND': 1,
            'AND@Org.OData.Core.V1.Description': 'Multiple search terms, optionally separated by `AND`',
            'OR': 2,
            'OR@Org.OData.Core.V1.Description': 'Multiple search terms separated by `OR`',
            'NOT': 4,
            'NOT@Org.OData.Core.V1.Description': 'Search terms preceded by `NOT`',
            'phrase': 8,
            'phrase@Org.OData.Core.V1.Description': 'Search phrases enclosed in double quotes',
            'group': 16,
            'group@Org.OData.Core.V1.Description': 'Precedence grouping of search expressions with parentheses'
        },
        'KeyAsSegmentSupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description':
                'Supports [key-as-segment convention](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html#sec_KeyasSegmentConvention) for addressing entities within a collection'
        },
        'QuerySegmentSupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description':
                'Supports [passing query options in the request body](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html#sec_PassingQueryOptionsintheRequestBody)'
        },
        'InsertRestrictions': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.InsertRestrictionsType',
            '$AppliesTo': ['EntitySet', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Restrictions on insert operations'
        },
        'InsertRestrictionsBase': {
            '$Kind': 'ComplexType',
            'Insertable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Entities can be inserted'
            },
            'MaxLevels': {
                '$Type': 'Edm.Int32',
                '$DefaultValue': -1,
                '@Org.OData.Core.V1.Description':
                    'The maximum number of navigation properties that can be traversed when addressing the collection to insert into. A value of -1 indicates there is no restriction.'
            },
            'TypecastSegmentSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description':
                    'Entities of a specific derived type can be created by specifying a type-cast segment'
            },
            'QueryOptions': {
                '$Type': 'Org.OData.Capabilities.V1.ModificationQueryOptionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Support for query options with insert requests'
            },
            'CustomHeaders': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.CustomParameter',
                '@Org.OData.Core.V1.Description': 'Supported or required custom headers'
            },
            'CustomQueryOptions': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.CustomParameter',
                '@Org.OData.Core.V1.Description': 'Supported or required custom query options'
            },
            'Description': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'A brief description of the request',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'LongDescription': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'A long description of the request',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'ErrorResponses': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.HttpResponse',
                '@Org.OData.Core.V1.Description': 'Possible error responses returned by the request.'
            }
        },
        'InsertRestrictionsType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Capabilities.V1.InsertRestrictionsBase',
            'NonInsertableProperties': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'These structural properties cannot be specified on insert'
            },
            'NonInsertableNavigationProperties': {
                '$Collection': true,
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description': 'These navigation properties do not allow deep inserts'
            },
            'RequiredProperties': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'These structural properties must be specified on insert'
            },
            'Permissions': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.PermissionType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Required permissions. One of the specified sets of scopes is required to perform the insert.'
            }
        },
        'PermissionType': {
            '$Kind': 'ComplexType',
            'SchemeName': {
                '$Type': 'Org.OData.Authorization.V1.SchemeName',
                '@Org.OData.Core.V1.Description': 'Authorization flow scheme name'
            },
            'Scopes': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.ScopeType',
                '@Org.OData.Core.V1.Description': 'List of scopes that can provide access to the resource'
            }
        },
        'ScopeType': {
            '$Kind': 'ComplexType',
            'Scope': {
                '@Org.OData.Core.V1.Description': 'Name of the scope.'
            },
            'RestrictedProperties': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Comma-separated string value of all properties that will be included or excluded when using the scope.',
                '@Org.OData.Core.V1.LongDescription':
                    'Possible string value identifiers when specifying properties are `*`, _PropertyName_, `-`_PropertyName_.\n\n`*` denotes all properties are accessible.\n\n`-`_PropertyName_ excludes that specific property.\n\n_PropertyName_ explicitly provides access to the specific property.\n\nThe absence of `RestrictedProperties` denotes all properties are accessible using that scope.'
            }
        },
        'DeepInsertSupport': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.DeepInsertSupportType',
            '$Nullable': true,
            '$AppliesTo': ['EntityContainer', 'EntitySet', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description':
                'Deep Insert Support of the annotated resource (the whole service, an entity set, or a collection-valued resource)'
        },
        'DeepInsertSupportType': {
            '$Kind': 'ComplexType',
            'Supported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Annotation target supports deep inserts'
            },
            'ContentIDSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description':
                    'Annotation target supports accepting and returning nested entities annotated with the `Core.ContentID` instance annotation.'
            }
        },
        'UpdateRestrictions': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.UpdateRestrictionsType',
            '$AppliesTo': ['EntitySet', 'Singleton', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Restrictions on update operations'
        },
        'UpdateRestrictionsBase': {
            '$Kind': 'ComplexType',
            'Updatable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Entities can be updated'
            },
            'Upsertable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Entities can be upserted'
            },
            'DeltaUpdateSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description':
                    'Entities can be inserted, updated, and deleted via a PATCH request with a delta payload'
            },
            'UpdateMethod': {
                '$Type': 'Org.OData.Capabilities.V1.HttpMethod',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Supported HTTP Methods (PUT or PATCH) for updating an entity.  If null, PATCH SHOULD be supported and PUT MAY be supported.'
            },
            'FilterSegmentSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description':
                    'Members of collections can be updated via a PATCH request with a `/$filter(...)/$each` segment'
            },
            'TypecastSegmentSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description':
                    'Members of collections can be updated via a PATCH request with a type-cast segment and a `/$each` segment'
            },
            'MaxLevels': {
                '$Type': 'Edm.Int32',
                '$DefaultValue': -1,
                '@Org.OData.Core.V1.Description':
                    'The maximum number of navigation properties that can be traversed when addressing the collection or entity to update. A value of -1 indicates there is no restriction.'
            },
            'Permissions': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.PermissionType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Required permissions. One of the specified sets of scopes is required to perform the update.'
            },
            'QueryOptions': {
                '$Type': 'Org.OData.Capabilities.V1.ModificationQueryOptionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Support for query options with update requests'
            },
            'CustomHeaders': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.CustomParameter',
                '@Org.OData.Core.V1.Description': 'Supported or required custom headers'
            },
            'CustomQueryOptions': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.CustomParameter',
                '@Org.OData.Core.V1.Description': 'Supported or required custom query options'
            },
            'Description': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'A brief description of the request',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'LongDescription': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'A long description of the request',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'ErrorResponses': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.HttpResponse',
                '@Org.OData.Core.V1.Description': 'Possible error responses returned by the request.'
            }
        },
        'UpdateRestrictionsType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Capabilities.V1.UpdateRestrictionsBase',
            'NonUpdatableProperties': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'These structural properties cannot be specified on update'
            },
            'NonUpdatableNavigationProperties': {
                '$Collection': true,
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description': 'These navigation properties do not allow rebinding'
            },
            'RequiredProperties': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'These structural properties must be specified on update'
            }
        },
        'HttpMethod': {
            '$Kind': 'EnumType',
            '$IsFlags': true,
            'GET': 1,
            'GET@Org.OData.Core.V1.Description': 'The HTTP GET Method',
            'PATCH': 2,
            'PATCH@Org.OData.Core.V1.Description': 'The HTTP PATCH Method',
            'PUT': 4,
            'PUT@Org.OData.Core.V1.Description': 'The HTTP PUT Method',
            'POST': 8,
            'POST@Org.OData.Core.V1.Description': 'The HTTP POST Method',
            'DELETE': 16,
            'DELETE@Org.OData.Core.V1.Description': 'The HTTP DELETE Method',
            'OPTIONS': 32,
            'OPTIONS@Org.OData.Core.V1.Description': 'The HTTP OPTIONS Method',
            'HEAD': 64,
            'HEAD@Org.OData.Core.V1.Description': 'The HTTP HEAD Method'
        },
        'DeepUpdateSupport': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.DeepUpdateSupportType',
            '$AppliesTo': ['EntityContainer', 'EntitySet', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description':
                'Deep Update Support of the annotated resource (the whole service, an entity set, or a collection-valued resource)'
        },
        'DeepUpdateSupportType': {
            '$Kind': 'ComplexType',
            'Supported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Annotation target supports deep updates'
            },
            'ContentIDSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description':
                    'Annotation target supports accepting and returning nested entities annotated with the `Core.ContentID` instance annotation.'
            }
        },
        'DeleteRestrictions': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.DeleteRestrictionsType',
            '$AppliesTo': ['EntitySet', 'Singleton', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description': 'Restrictions on delete operations'
        },
        'DeleteRestrictionsBase': {
            '$Kind': 'ComplexType',
            'Deletable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Entities can be deleted'
            },
            'MaxLevels': {
                '$Type': 'Edm.Int32',
                '$DefaultValue': -1,
                '@Org.OData.Core.V1.Description':
                    'The maximum number of navigation properties that can be traversed when addressing the collection to delete from or the entity to delete. A value of -1 indicates there is no restriction.'
            },
            'FilterSegmentSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description':
                    'Members of collections can be deleted via a DELETE request with a `/$filter(...)/$each` segment'
            },
            'TypecastSegmentSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description':
                    'Members of collections can be deleted via a DELETE request with a type-cast segment and a `/$each` segment'
            },
            'Permissions': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.PermissionType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Required permissions. One of the specified sets of scopes is required to perform the delete.'
            },
            'CustomHeaders': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.CustomParameter',
                '@Org.OData.Core.V1.Description': 'Supported or required custom headers'
            },
            'CustomQueryOptions': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.CustomParameter',
                '@Org.OData.Core.V1.Description': 'Supported or required custom query options'
            },
            'Description': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'A brief description of the request',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'LongDescription': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'A long description of the request',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'ErrorResponses': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.HttpResponse',
                '@Org.OData.Core.V1.Description': 'Possible error responses returned by the request.'
            }
        },
        'DeleteRestrictionsType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Capabilities.V1.DeleteRestrictionsBase',
            'NonDeletableNavigationProperties': {
                '$Collection': true,
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description': 'These navigation properties do not allow DeleteLink requests'
            }
        },
        'CollectionPropertyRestrictions': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Capabilities.V1.CollectionPropertyRestrictionsType',
            '$AppliesTo': ['EntitySet', 'Singleton'],
            '@Org.OData.Core.V1.Description':
                'Describes restrictions on operations applied to collection-valued structural properties'
        },
        'CollectionPropertyRestrictionsType': {
            '$Kind': 'ComplexType',
            'CollectionProperty': {
                '$Type': 'Edm.PropertyPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restricted Collection-valued property'
            },
            'FilterFunctions': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description': 'List of functions and operators supported in filter expressions',
                '@Org.OData.Core.V1.LongDescription':
                    'If not specified, null, or empty, all functions and operators may be attempted.'
            },
            'FilterRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.FilterRestrictionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on filter expressions'
            },
            'SearchRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.SearchRestrictionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on search expressions'
            },
            'SortRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.SortRestrictionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on orderby expressions'
            },
            'TopSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Supports $top'
            },
            'SkipSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Supports $skip'
            },
            'SelectSupport': {
                '$Type': 'Org.OData.Capabilities.V1.SelectSupportType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Support for $select'
            },
            'Insertable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Members can be inserted into this collection',
                '@Org.OData.Core.V1.LongDescription':
                    'If additionally annotated with [Core.PositionalInsert](Org.OData.Core.V1.md#PositionalInsert), members can be inserted at a specific position'
            },
            'Updatable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Members of this ordered collection can be updated by ordinal'
            },
            'Deletable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Members of this ordered collection can be deleted by ordinal'
            }
        },
        'OperationRestrictions': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.OperationRestrictionsType',
            '$AppliesTo': ['Action', 'Function'],
            '@Org.OData.Core.V1.Description': 'Restrictions for function or action operation'
        },
        'OperationRestrictionsType': {
            '$Kind': 'ComplexType',
            'FilterSegmentSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description':
                    'Bound action or function can be invoked on a collection-valued binding parameter path with a `/$filter(...)` segment'
            },
            'Permissions': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.PermissionType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Required permissions. One of the specified sets of scopes is required to invoke an action or function'
            },
            'CustomHeaders': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.CustomParameter',
                '@Org.OData.Core.V1.Description': 'Supported or required custom headers'
            },
            'CustomQueryOptions': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.CustomParameter',
                '@Org.OData.Core.V1.Description': 'Supported or required custom query options'
            },
            'ErrorResponses': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.HttpResponse',
                '@Org.OData.Core.V1.Description': 'Possible error responses returned by the request.'
            }
        },
        'AnnotationValuesInQuerySupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'Supports annotation values within system query options'
        },
        'ModificationQueryOptions': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.ModificationQueryOptionsType',
            '$AppliesTo': ['EntityContainer', 'Action', 'ActionImport'],
            '@Org.OData.Core.V1.Description':
                'Support for query options with modification requests (insert, update, action invocation)'
        },
        'ModificationQueryOptionsType': {
            '$Kind': 'ComplexType',
            'ExpandSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Supports $expand with modification requests'
            },
            'SelectSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Supports $select with modification requests'
            },
            'ComputeSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Supports $compute with modification requests'
            },
            'FilterSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Supports $filter with modification requests'
            },
            'SearchSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Supports $search with modification requests'
            },
            'SortSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Supports $orderby with modification requests'
            }
        },
        'ReadRestrictions': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.ReadRestrictionsType',
            '$AppliesTo': ['EntitySet', 'Singleton', 'Collection'],
            '@Org.OData.Core.V1.AppliesViaContainer': true,
            '@Org.OData.Core.V1.Description':
                'Restrictions for retrieving a collection of entities, retrieving a singleton instance.'
        },
        'ReadRestrictionsBase': {
            '$Kind': 'ComplexType',
            '$Abstract': true,
            'Readable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Entities can be retrieved'
            },
            'Permissions': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.PermissionType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Required permissions. One of the specified sets of scopes is required to read.'
            },
            'CustomHeaders': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.CustomParameter',
                '@Org.OData.Core.V1.Description': 'Supported or required custom headers'
            },
            'CustomQueryOptions': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.CustomParameter',
                '@Org.OData.Core.V1.Description': 'Supported or required custom query options'
            },
            'Description': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'A brief description of the request',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'LongDescription': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'A long description of the request',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'ErrorResponses': {
                '$Collection': true,
                '$Type': 'Org.OData.Capabilities.V1.HttpResponse',
                '@Org.OData.Core.V1.Description': 'Possible error responses returned by the request.'
            }
        },
        'ReadByKeyRestrictionsType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Capabilities.V1.ReadRestrictionsBase',
            '@Org.OData.Core.V1.Description': 'Restrictions for retrieving an entity by key'
        },
        'ReadRestrictionsType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Capabilities.V1.ReadRestrictionsBase',
            'TypecastSegmentSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description':
                    'Entities of a specific derived type can be read by specifying a type-cast segment'
            },
            'ReadByKeyRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.ReadByKeyRestrictionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions for retrieving an entity by key',
                '@Org.OData.Core.V1.LongDescription':
                    'Only valid when applied to a collection. If a property of `ReadByKeyRestrictions` is not specified, the corresponding property value of `ReadRestrictions` applies.'
            }
        },
        'CustomHeaders': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Capabilities.V1.CustomParameter',
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'Custom headers that are supported/required for the annotated resource',
            '@Org.OData.Core.V1.Example': {
                '@Org.OData.Capabilities.V1.CustomHeaders': [
                    {
                        'Name': 'X-CSRF-Token',
                        'Description': 'Token to protect against Cross-Site Request Forgery attacks',
                        'DocumentationURL':
                            'https://help.sap.com/viewer/68bf513362174d54b58cddec28794093/7.51.1/en-US/b35c22518bc72214e10000000a44176d.html',
                        'Required': true,
                        'ExampleValues': [
                            {
                                'Value': 'Fetch',
                                'Description':
                                    'Can be used on HEAD request to the service document for obtaining a new CSRF token. This token must then be sent in subsequent requests to resources of the service.'
                            }
                        ]
                    }
                ]
            }
        },
        'CustomQueryOptions': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Capabilities.V1.CustomParameter',
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description':
                'Custom query options that are supported/required for the annotated resource',
            '@Org.OData.Core.V1.LongDescription':
                'If the entity container is annotated, the query option is supported/required by all resources in that container.',
            '@Org.OData.Core.V1.Example': {
                '@Org.OData.Capabilities.V1.CustomQueryOptions': [
                    {
                        'Name': 'odata-debug',
                        'Description': 'Debug support for OData services',
                        'DocumentationURL': 'https://olingo.apache.org/doc/odata2/tutorials/debug.html',
                        'Required': false,
                        'ExampleValues': [
                            {
                                'Value': 'html',
                                'Description':
                                    'Service responds with self-contained HTML document that can conveniently viewed in a browser and gives access to the response body, response headers, URL parsing information, and stack trace'
                            },
                            {
                                'Value': 'json',
                                'Description':
                                    'Service responds with JSON document that contains the same information as the HTML debug response'
                            }
                        ]
                    }
                ]
            }
        },
        'CustomParameter': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'A custom parameter is either a header or a query option',
            '@Org.OData.Core.V1.LongDescription':
                'The type of a custom parameter is always a string. Restrictions on the parameter values can be expressed by annotating the record expression describing the parameter with terms from the Validation vocabulary, e.g. Validation.Pattern or Validation.AllowedValues.',
            'Name': {
                '@Org.OData.Core.V1.Description': 'Name of the custom parameter'
            },
            'Description': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Description of the custom parameter'
            },
            'DocumentationURL': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Core.V1.Description': 'URL of related documentation'
            },
            'Required': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description':
                    'true: parameter is required, false or not specified: parameter is optional'
            },
            'ExampleValues': {
                '$Collection': true,
                '$Type': 'Org.OData.Core.V1.PrimitiveExampleValue',
                '@Org.OData.Core.V1.Description': 'Example values for the custom parameter'
            }
        },
        'MediaLocationUpdateSupported': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityType', 'Property'],
            '@Org.OData.Core.V1.RequiresType': 'Edm.Stream',
            '@Org.OData.Core.V1.Description':
                'Stream property or media stream supports update of its media edit URL and/or media read URL'
        },
        'DefaultCapabilities': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Capabilities.V1.DefaultCapabilitiesType',
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description':
                'Default capability settings for all collection-valued resources in the container',
            '@Org.OData.Core.V1.LongDescription':
                'Annotating a specific capability term, which is included as property in `DefaultCapabilitiesType`, for a specific collection-valued resource overrides the default capability with the specified properties using PATCH semantics:\n- Primitive or collection-valued properties specified in the specific capability term replace the corresponding properties specified in `DefaultCapabilities`\n- Complex-valued properties specified in the specific capability term override the corresponding properties specified in `DefaultCapabilities` using PATCH semantics recursively\n- Properties specified neither in the specific term nor in `DefaultCapabilities` have their default value'
        },
        'DefaultCapabilitiesType': {
            '$Kind': 'ComplexType',
            'ChangeTracking': {
                '$Type': 'Org.OData.Capabilities.V1.ChangeTrackingBase',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Change tracking capabilities'
            },
            'CountRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.CountRestrictionsBase',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Restrictions on /$count path suffix and $count=true system query option'
            },
            'IndexableByKey': {
                '$Type': 'Org.OData.Core.V1.Tag',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Supports key values according to OData URL conventions'
            },
            'TopSupported': {
                '$Type': 'Org.OData.Core.V1.Tag',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Supports $top'
            },
            'SkipSupported': {
                '$Type': 'Org.OData.Core.V1.Tag',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Supports $skip'
            },
            'ComputeSupported': {
                '$Type': 'Org.OData.Core.V1.Tag',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Supports $compute'
            },
            'SelectSupport': {
                '$Type': 'Org.OData.Capabilities.V1.SelectSupportType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Support for $select and nested query options within $select'
            },
            'FilterRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.FilterRestrictionsBase',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on filter expressions'
            },
            'SortRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.SortRestrictionsBase',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on orderby expressions'
            },
            'ExpandRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.ExpandRestrictionsBase',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on expand expressions'
            },
            'SearchRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.SearchRestrictionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on search expressions'
            },
            'InsertRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.InsertRestrictionsBase',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on insert operations'
            },
            'UpdateRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.UpdateRestrictionsBase',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on update operations'
            },
            'DeleteRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.DeleteRestrictionsBase',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions on delete operations'
            },
            'OperationRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.OperationRestrictionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Restrictions for function or action operations'
            },
            'ReadRestrictions': {
                '$Type': 'Org.OData.Capabilities.V1.ReadRestrictionsType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Restrictions for retrieving a collection of entities, retrieving a singleton instance'
            }
        },
        'HttpResponse': {
            '$Kind': 'ComplexType',
            'StatusCode': {
                '@Org.OData.Core.V1.Description': 'HTTP response status code, for example 400, 403, 501'
            },
            'Description': {
                '@Org.OData.Core.V1.Description': 'Human-readable description of the response',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            }
        }
    }
} as CSDL;
