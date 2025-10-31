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
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Validation.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.Validation.V1',
                    '$Alias': 'Validation'
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
        'https://sap.github.io/odata-vocabularies/vocabularies/UI.json': {
            '$Include': [
                {
                    '$Namespace': 'com.sap.vocabularies.UI.v1',
                    '$Alias': 'UI'
                }
            ]
        },
        'https://sap.github.io/odata-vocabularies/vocabularies/Analytics.json': {
            '$Include': [
                {
                    '$Namespace': 'com.sap.vocabularies.Analytics.v1',
                    '$Alias': 'Analytics'
                }
            ]
        }
    },
    'com.sap.vocabularies.Common.v1': {
        '$Alias': 'Common',
        '@Org.OData.Core.V1.Description': 'Common terms for all SAP vocabularies',
        '@Org.OData.Core.V1.Description#Published': '2017-02-15 © Copyright 2013 SAP SE. All rights reserved.',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Common.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Common.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/Common.md'
            }
        ],
        'Experimental': {
            '$Kind': 'Term',
            '$Nullable': true,
            '@Org.OData.Core.V1.Description':
                'Terms, types, and properties annotated with this term are experimental and can be changed incompatibly or removed completely any time without prior warning.',
            '@Org.OData.Core.V1.LongDescription':
                'Do not use or rely on experimental terms, types, and properties in production environments.'
        },
        'ServiceVersion': {
            '$Kind': 'Term',
            '$Type': 'Edm.Int32',
            '$AppliesTo': ['Schema'],
            '@Org.OData.Core.V1.Description':
                '1 for first version of a service, incremented when schema changes incompatibly and service is published with a different URI'
        },
        'ServiceSchemaVersion': {
            '$Kind': 'Term',
            '$Type': 'Edm.Int32',
            '$AppliesTo': ['Schema'],
            '@Org.OData.Core.V1.Description':
                '0 for first schema version within a service version, incremented when schema changes compatibly'
        },
        'Label': {
            '$Kind': 'Term',
            '@Org.OData.Core.V1.Description': 'A short, human-readable text suitable for labels and captions in UIs',
            '@Org.OData.Core.V1.IsLanguageDependent': true
        },
        'Heading': {
            '$Kind': 'Term',
            '@Org.OData.Core.V1.Description': 'A short, human-readable text suitable for column headings in UIs',
            '@Org.OData.Core.V1.IsLanguageDependent': true
        },
        'QuickInfo': {
            '$Kind': 'Term',
            '@Org.OData.Core.V1.Description': 'A short, human-readable text suitable for tool tips in UIs',
            '@Org.OData.Core.V1.IsLanguageDependent': true
        },
        'DocumentationRef': {
            '$Kind': 'Term',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'A URI referencing language-dependent documentation for the annotated model element',
            '@Org.OData.Core.V1.Example': {
                '@odata.type':
                    'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.xml#Core.PrimitiveExampleValue',
                'Description':
                    'URN scheme to look up the documentation for an object with given type and id in a given system.\n              This example looks up the documentation for data element /iwbep/account in system G1Y_000.',
                'Value': 'urn:sap-com:documentation:key?=type=DTEL&id=%2fiwbep%2faccount&origin=G1Y_000'
            }
        },
        'Text': {
            '$Kind': 'Term',
            '$Nullable': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'A descriptive text for values of the annotated property. Value MUST be a dynamic expression when used as metadata annotation.',
            '@Org.OData.Core.V1.IsLanguageDependent': true,
            '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.UI.v1.TextArrangement']
        },
        'TextFor': {
            '$Kind': 'Term',
            '$Type': 'Edm.PropertyPath',
            '$AppliesTo': ['Property'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@Org.OData.Core.V1.Description':
                'The annotated property contains a descriptive text for values of the referenced property.'
        },
        'ExternalID': {
            '$Kind': 'Term',
            '$Type': 'Edm.PrimitiveType',
            '$Nullable': true,
            '$AppliesTo': ['Property', 'Parameter'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'A human readable identifier for values of the annotated property or parameter. Value MUST be a dynamic expression when used as metadata annotation.',
            '@Org.OData.Core.V1.LongDescription':
                'If the annotated property is (part of) a foreign key of a resource, the external id is a human readable (part of an) identifier of this resource.\n            There is a one-to-one relationship between each possible value of the annotated property and the corresponding external id.\n            The annotation of a parameter refers to a property of the operation binding parameter.'
        },
        'IsLanguageIdentifier': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'An identifier to distinguish multiple texts in different languages for the same entity'
        },
        'TextFormat': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.TextFormatType',
            '$AppliesTo': ['Property', 'Parameter', 'ReturnType'],
            '@Org.OData.Core.V1.Description':
                'The annotated property, parameter, or return type contains human-readable text that may contain formatting information',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String'
        },
        'TextFormatType': {
            '$Kind': 'EnumType',
            'plain': 0,
            'plain@Org.OData.Core.V1.Description': 'Plain text, line breaks represented as the character 0x0A',
            'html': 1,
            'html@Org.OData.Core.V1.Description':
                'Plain text with markup that can validly appear directly within an HTML DIV element'
        },
        'Timezone': {
            '$Kind': 'Term',
            '$Nullable': true,
            '$AppliesTo': ['Property', 'Parameter'],
            '@Org.OData.Core.V1.Description':
                'The point in time represented by the annotated property or parameter shall be interpreted in the given time zone',
            '@Org.OData.Core.V1.LongDescription':
                "Time zones shall be specified according to the [IANA](https://www.iana.org/time-zones) standard.\n            If this annotation is absent or null or an empty string, points in time are typically interpreted in the current user's or default time zone.\n            The annotation value can be a path expression resolving to a property that may be tagged with [`IsTimezone`](#IsTimezone).",
            '@Org.OData.Core.V1.RequiresType': 'Edm.DateTimeOffset'
        },
        'IsTimezone': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'Parameter'],
            '@Org.OData.Core.V1.Description': 'Annotated property or parameter is a time zone'
        },
        'IsDigitSequence': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'Parameter'],
            '@Org.OData.Core.V1.Description': 'Contains only digits',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String'
        },
        'IsUpperCase': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'Parameter'],
            '@Org.OData.Core.V1.Description': 'Contains just uppercase characters',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String'
        },
        'IsCurrency': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'Parameter'],
            '@Org.OData.Core.V1.Description': 'Annotated property or parameter is a currency code'
        },
        'IsUnit': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'Parameter'],
            '@Org.OData.Core.V1.Description': 'Annotated property or parameter is a unit of measure'
        },
        'UnitSpecificScale': {
            '$Kind': 'Term',
            '$Type': 'Edm.PrimitiveType',
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'The number of fractional decimal digits of a currency amount or measured quantity',
            '@Org.OData.Core.V1.LongDescription':
                'The annotated property contains a currency code or unit of measure, and the annotation value specifies the default scale of numeric values with that currency code or unit of measure. Can be used in e.g. a list of available currency codes or units of measure, or a list of measuring devices to specify the number of fractional digits captured by that device.'
        },
        'UnitSpecificPrecision': {
            '$Kind': 'Term',
            '$Type': 'Edm.PrimitiveType',
            '$AppliesTo': ['Property'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'The number of significant decimal digits of a currency amount or measured quantity',
            '@Org.OData.Core.V1.LongDescription':
                'The annotated property contains a currency code or unit of measure, and the annotation value specifies the default precision of numeric values with that currency code or unit of measure. Can be used in e.g. a list of available currency codes or units of measure, or a list of measuring devices to specify the number of significant digits captured by that device.'
        },
        'SecondaryKey': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Edm.PropertyPath',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'The listed properties form a secondary key',
            '@Org.OData.Core.V1.LongDescription':
                'Multiple secondary keys are possible using different qualifiers.\n          Unlike [`Core.AlternateKeys`](https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Core.V1.md#AlternateKeys),\n          secondary keys need not support addressing an entity in a resource path.'
        },
        'MinOccurs': {
            '$Kind': 'Term',
            '$Type': 'Edm.Int64',
            '$AppliesTo': ['NavigationProperty', 'Property', 'EntitySet', 'Term', 'Parameter'],
            '@Org.OData.Core.V1.Description': 'The annotated set or collection contains at least this number of items'
        },
        'MaxOccurs': {
            '$Kind': 'Term',
            '$Type': 'Edm.Int64',
            '$AppliesTo': ['NavigationProperty', 'Property', 'EntitySet', 'Term', 'Parameter'],
            '@Org.OData.Core.V1.Description': 'The annotated set or collection contains at most this number of items'
        },
        'AssociationEntity': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Edm.NavigationPropertyPath',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Entity representing an n:m association with attributes',
            '@com.sap.vocabularies.Common.v1.MinOccurs': 2
        },
        'DerivedNavigation': {
            '$Kind': 'Term',
            '$Type': 'Edm.NavigationPropertyPath',
            '$AppliesTo': ['NavigationProperty'],
            '@Org.OData.Core.V1.Description':
                'Shortcut for a multi-segment navigation, contains the long path with all its segments'
        },
        'Masked': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property contains sensitive data that should by default be masked on a UI and clear-text visible only upon user interaction',
            '@Org.OData.Core.V1.LongDescription':
                'This tag affects only the presentation to the user.\n          The data are still transmitted in the response and can hence be observed using browser tools.'
        },
        'MaskedValue': {
            '$Kind': 'Term',
            '$Nullable': true,
            '$AppliesTo': ['Property'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true,
            '@Org.OData.Core.V1.Description': 'Property contains sensitive data that is by default not transferred',
            '@Org.OData.Core.V1.LongDescription':
                'By default a masked property is excluded from responses and instead an instance annotation with this term is sent, containing a masked value that can be rendered by user interfaces.'
        },
        'RevealOnDemand': {
            '$Kind': 'Term',
            '$Type': 'Edm.Boolean',
            '$AppliesTo': ['Property'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true,
            '@Org.OData.Core.V1.Description':
                'Unmasked data for this property can be requested with custom query option `masked-values=false`'
        },
        'SemanticObject': {
            '$Kind': 'Term',
            '$Nullable': true,
            '$AppliesTo': ['EntitySet', 'EntityType', 'Property', 'NavigationProperty'],
            '@Org.OData.Core.V1.Description':
                'Name of the Semantic Object represented as this entity type or identified by this property'
        },
        'SemanticObjectMapping': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.Common.v1.SemanticObjectMappingAbstract',
            '$AppliesTo': ['EntitySet', 'EntityType', 'Property'],
            '$BaseTerm': 'com.sap.vocabularies.Common.v1.SemanticObject',
            '@Org.OData.Core.V1.Description':
                'Maps properties of the annotated entity type or sibling properties of the annotated property to properties of the Semantic Object',
            '@Org.OData.Core.V1.LongDescription':
                'This allows "renaming" of properties in the current context to match property names of the Semantic Object, e.g. `SenderPartyID` to `PartyID`. Only properties explicitly listed in the mapping are renamed, all other properties are available for intent-based navigation with their "local" name.'
        },
        'SemanticObjectMappingAbstract': {
            '$Kind': 'ComplexType',
            '$Abstract': true,
            '@Org.OData.Core.V1.Description':
                'Maps a property of the Semantic Object to a property of the annotated entity type or a sibling property of the annotated property or a constant value',
            'SemanticObjectProperty': {
                '@Org.OData.Core.V1.Description': 'Name of the Semantic Object property'
            }
        },
        'SemanticObjectMappingType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.Common.v1.SemanticObjectMappingAbstract',
            'LocalProperty': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description':
                    'Path to a local property that provides the value for the Semantic Object property'
            }
        },
        'SemanticObjectMappingConstant': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.Common.v1.SemanticObjectMappingAbstract',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            'Constant': {
                '$Type': 'Edm.PrimitiveType',
                '@Org.OData.Core.V1.Description': 'Constant value for the Semantic Object property'
            }
        },
        'SemanticObjectUnavailableActions': {
            '$Kind': 'Term',
            '$Collection': true,
            '$AppliesTo': ['EntitySet', 'EntityType', 'Property'],
            '$BaseTerm': 'com.sap.vocabularies.Common.v1.SemanticObject',
            '@Org.OData.Core.V1.Description':
                'List of actions that are not available in the current state of the instance of the Semantic Object'
        },
        'IsInstanceAnnotation': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Term'],
            '@Org.OData.Core.V1.Description':
                'Term can also be used as instance annotation; AppliesTo of this term specifies where it can be applied'
        },
        'FilterExpressionRestrictions': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.Common.v1.FilterExpressionRestrictionType',
            '$AppliesTo': ['EntitySet'],
            '@Org.OData.Core.V1.Description': 'These properties only allow a subset of expressions',
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description': 'Use term Capabilities.FilterRestrictions instead'
                }
            ]
        },
        'FilterExpressionRestrictionType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description': 'Use term Capabilities.FilterRestrictions instead'
                }
            ],
            'Property': {
                '$Type': 'Edm.PropertyPath',
                '$Nullable': true
            },
            'AllowedExpressions': {
                '$Type': 'com.sap.vocabularies.Common.v1.FilterExpressionType',
                '$Nullable': true
            }
        },
        'FilterExpressionType': {
            '$Kind': 'EnumType',
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description': 'Use term Capabilities.FilterRestrictions instead'
                }
            ],
            'SingleValue': 0,
            'SingleValue@Org.OData.Core.V1.Description': "a single 'eq' clause",
            'MultiValue': 1,
            'MultiValue@Org.OData.Core.V1.Description': "one or more 'eq' clauses, separated by 'or'",
            'SingleInterval': 2,
            'SingleInterval@Org.OData.Core.V1.Description':
                "at most one 'ge' and one 'le' clause, separated by 'and', alternatively a single 'eq' clause"
        },
        'FieldControl': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.FieldControlType',
            '$Nullable': true,
            '$DefaultValue': 'Optional',
            '$AppliesTo': ['Property', 'Parameter', 'Record', 'EntityType'],
            '@Org.OData.Core.V1.Description':
                'Control state of a property, parameter, or the media stream of a media entity',
            '@Org.OData.Core.V1.LongDescription':
                "This term can be used for static field control, providing an enumeration member value in $metadata, as well as dynamically, providing a `Path` expression.\n\nIn the dynamic case the property referenced by the `Path` expression MUST be of type `Edm.Byte` to accommodate OData V2 services as well as V4 infrastructures that don't support enumeration types.",
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'FieldControlType': {
            '$Kind': 'EnumType',
            '$UnderlyingType': 'Edm.Byte',
            '@Org.OData.Core.V1.Description': 'Control state of a property',
            '@Org.OData.Core.V1.LongDescription':
                'When changes are requested, the value of this annotation in the before-image or after-image\n          of the request plays a role. These may differ if the value is given dynamically in the metadata.',
            'Mandatory': 7,
            'Mandatory@Org.OData.Core.V1.Description': 'Property is mandatory from a business perspective',
            'Mandatory@Org.OData.Core.V1.LongDescription':
                'A request that\n- sets the property to null or an empty value or\n- creates a non-[draft](#DraftRoot) entity and omits the property or\n- activates a draft entity while the property is null or empty\n\nfails entirely if this annotation is `Mandatory` in the after-image of the request.\nThe empty string is an empty value. Service-specific rules may consider other values, also\nof non-string type, empty.\nValues in draft entities are never considered empty.\nMandatory properties SHOULD be decorated in the UI with an asterisk.\nNull or empty values can also be disallowed by restricting the property value range with the standard type facet `Nullable` or terms from the [Validation vocabulary](https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Validation.V1.md).',
            'Optional': 3,
            'Optional@Org.OData.Core.V1.Description': 'Property may have a value',
            'Optional@Org.OData.Core.V1.LongDescription':
                'This value does not make sense as a static annotation value.',
            'ReadOnly': 1,
            'ReadOnly@Org.OData.Core.V1.Description': 'Property value cannot be changed',
            'ReadOnly@Org.OData.Core.V1.LongDescription':
                'A request to change the property to a value that differs from the before-image fails entirely\n            according to [OData-Protocol, section 11.4.3](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_UpdateanEntity)\n            if this annotation is given dynamically as `ReadOnly` in the before-image of the request.\n\n            To statically mark a property as read-only use term [Core.Computed](https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Core.V1.md#Computed) instead.',
            'Inapplicable': 0,
            'Inapplicable@Org.OData.Core.V1.Description': 'Property has no meaning in the current entity state',
            'Inapplicable@Org.OData.Core.V1.LongDescription':
                'A request that sets the property to a non-initial non-null value fails entirely if this annotation is `Inapplicable` in the after-image of the request.\n\n            This value does not make sense as a static annotation value.\n\nExample for dynamic use: in a travel expense report the property `DestinationCountry` is inapplicable if trip type is domestic, and mandatory if trip type is international.',
            'Hidden': 0,
            'Hidden@Org.OData.Core.V1.Description': 'Deprecated synonym for Inapplicable, do not use',
            'Hidden@Org.OData.Core.V1.LongDescription':
                'To statically hide a property on a UI use [UI.Hidden](UI.md#Hidden) instead'
        },
        'ExceptionCategory': {
            '$Kind': 'Term',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'A machine-readable exception category',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'Application': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.ApplicationType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': '...',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'ApplicationType': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            'Component': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Software component of service implementation'
            },
            'ServiceRepository': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': '...'
            },
            'ServiceId': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': '...'
            },
            'ServiceVersion': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': '...'
            }
        },
        'Timestamp': {
            '$Kind': 'Term',
            '$Type': 'Edm.DateTimeOffset',
            '$Precision': 0,
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': '...',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'TransactionId': {
            '$Kind': 'Term',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': '...',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'ErrorResolution': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.ErrorResolutionType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Hints for resolving this error',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'ErrorResolutionType': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            'Analysis': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Short hint on how to analyze this error'
            },
            'Note': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Note for error resolution'
            },
            'AdditionalNote': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Additional note for error resolution'
            }
        },
        'Messages': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Edm.ComplexType',
            '@Org.OData.Core.V1.Description': 'Collection of end-user messages',
            '@Org.OData.Core.V1.LongDescription':
                'The name of the message type is service-specific, its structure components are identified by naming convention, following the names of the OData error response structure.\n\nThe minimum structure is\n- `code: Edm.String`\n- `message: Edm.String`\n- `target: Edm.String nullable`\n- `additionalTargets: Collection(Edm.String)`\n- `transition: Edm.Boolean`\n- `numericSeverity: Edm.Byte`\n- `longtextUrl: Edm.String nullable`\n          '
        },
        'additionalTargets': {
            '$Kind': 'Term',
            '$Collection': true,
            '$AppliesTo': ['Record'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true,
            '@Org.OData.Core.V1.Description': 'Additional targets for the message',
            '@Org.OData.Core.V1.LongDescription':
                'This instance annotation can be applied to the `error` object and the objects within the `details` array of an OData error response'
        },
        'longtextUrl': {
            '$Kind': 'Term',
            '$AppliesTo': ['Record'],
            '@Org.OData.Core.V1.IsURL': true,
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true,
            '@Org.OData.Core.V1.Description': 'Location of the message long text',
            '@Org.OData.Core.V1.LongDescription':
                'This instance annotation can be applied to the `error` object and the objects within the `details` array of an OData error response'
        },
        'numericSeverity': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.NumericMessageSeverityType',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true,
            '@Org.OData.Core.V1.Description': 'Classifies an end-user message as info, success, warning, or error',
            '@Org.OData.Core.V1.LongDescription':
                'This instance annotation can be applied to the `error` object and the objects within the `details` array of an OData error response'
        },
        'MaximumNumericMessageSeverity': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.NumericMessageSeverityType',
            '$Nullable': true,
            '$AppliesTo': ['EntityType'],
            '$BaseTerm': 'com.sap.vocabularies.Common.v1.Messages',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'The maximum severity of all end-user messages attached to an entity, null if no messages are attached',
            '@Org.OData.Core.V1.LongDescription':
                'This metadata annotation can be applied to entity types that are also annotated with term [`Common.Messages`](#Messages)'
        },
        'NumericMessageSeverityType': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.Byte',
            '@Org.OData.Core.V1.Description': 'Classifies an end-user message as info, success, warning, or error',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': 1,
                    '@Org.OData.Core.V1.Description': 'Success - no action required'
                },
                {
                    'Value': 2,
                    '@Org.OData.Core.V1.Description': 'Information - no action required'
                },
                {
                    'Value': 3,
                    '@Org.OData.Core.V1.Description': 'Warning - action may be required'
                },
                {
                    'Value': 4,
                    '@Org.OData.Core.V1.Description': 'Error - action is required'
                }
            ]
        },
        'IsActionCritical': {
            '$Kind': 'Term',
            '$Type': 'Edm.Boolean',
            '$DefaultValue': true,
            '$AppliesTo': ['Action', 'Function', 'ActionImport', 'FunctionImport'],
            '@Org.OData.Core.V1.Description':
                "Criticality of the function or action to enforce a warning or similar before it's executed"
        },
        'Attributes': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Edm.PropertyPath',
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Attributes related to this property, which may occur in denormalized entity types'
        },
        'RelatedRecursiveHierarchy': {
            '$Kind': 'Term',
            '$Type': 'Edm.AnnotationPath',
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'A recursive hierarchy related to this property. The annotation path must end in Aggregation.RecursiveHierarchy.'
        },
        'Interval': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.IntervalType',
            '$AppliesTo': ['EntityType', 'ComplexType'],
            '@Org.OData.Core.V1.Description': 'An interval with lower and upper boundaries described by two properties'
        },
        'IntervalType': {
            '$Kind': 'ComplexType',
            'Label': {
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'A short, human-readable text suitable for labels and captions in UIs',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'LowerBoundary': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Property holding the lower interval boundary'
            },
            'LowerBoundaryIncluded': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'The lower boundary value is included in the interval'
            },
            'UpperBoundary': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Property holding the upper interval boundary'
            },
            'UpperBoundaryIncluded': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'The upper boundary value is included in the interval'
            }
        },
        'ResultContext': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description':
                'The annotated entity type has one or more containment navigation properties.\n            An instance of the annotated entity type provides the context required for determining\n            the target entity sets reached by these containment navigation properties.'
        },
        'SAPObjectNodeType': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.SAPObjectNodeTypeType',
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'The SAP Object Node Type represented by the annotated entity type',
            '@Org.OData.Core.V1.LongDescription':
                'SAP Object Node Types define the structure of SAP Object Types, which are a generalization of Business Object, Technical Object, Configuration Object, and Analytical Object.'
        },
        'SAPObjectNodeTypeType': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Information about an SAP Object Node Type',
            'Name': {
                '@Org.OData.Core.V1.Description': 'The name of the SAP Object Node Type'
            }
        },
        'Composition': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['NavigationProperty'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'The annotated navigation property represents a logical composition, even though it is non-containment',
            '@Org.OData.Core.V1.LongDescription':
                'The entities related via this navigation property have an existential dependency on their composition parent. The entity set of the composition parent MUST contain a NavigationPropertyBinding for this navigation property.'
        },
        'SAPObjectNodeTypeReference': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'The entity referenced by the annotated property has the [`SAPObjectNodeType`](#SAPObjectNodeType) with this name',
            '@Org.OData.Core.V1.LongDescription':
                'The entity containing the property and the entity referenced by it will in general have different SAP Object Node Types.'
        },
        'IsNaturalPerson': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityType', 'Annotation'],
            '@Org.OData.Core.V1.Description':
                'The annotated entity type (e.g. `Employee`) or annotation (e.g. `IsImageUrl`) represents a natural person'
        },
        'ValueList': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.ValueListType',
            '$AppliesTo': ['Property', 'Parameter'],
            '@Org.OData.Core.V1.Description':
                'Specifies how to get a list of acceptable values for a property or parameter',
            '@Org.OData.Core.V1.LongDescription':
                'The value list can be based on user input that is passed in the value list request. The value list can be used for type-ahead and classical pick lists.'
        },
        'ValueListType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.Common.v1.QuickInfo'],
            'Label': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsLanguageDependent': true,
                '@Org.OData.Core.V1.Description':
                    'Headline for value list, fallback is the label of the property or parameter'
            },
            'CollectionPath': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Resource path of an OData collection with possible values, relative to CollectionRoot'
            },
            'RelativeCollectionPath': {
                '$Type': 'Edm.NavigationPropertyPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Navigation property path of an OData collection with possible values, relative to the annotation target'
            },
            'CollectionRoot': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Service root of the value list collection; not specified means local to the document containing the annotation',
                '@Org.OData.Core.V1.LongDescription':
                    '`CollectionRoot` must not be specified unless `CollectionPath` is provided.'
            },
            'DistinctValuesSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description':
                    "Indicates that the value list supports a 'distinct' aggregation on the value list properties defined via ValueListParameterInOut and ValueListParameterOut"
            },
            'SearchSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Value list supports the $search query option',
                '@Org.OData.Core.V1.LongDescription':
                    'The value of the target property is used as the search expression instead of in $filter'
            },
            'FetchValues': {
                '$Type': 'com.sap.vocabularies.Common.v1.FetchValuesType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Hint on when to fetch values'
            },
            'PresentationVariantQualifier': {
                '$Type': 'Org.OData.Core.V1.SimpleIdentifier',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Alternative representation of a value help, e.g. as a bar chart',
                '@Org.OData.Core.V1.LongDescription':
                    'Qualifier for annotation with term [UI.PresentationVariant](UI.md#PresentationVariant) on the entity set identified via CollectionPath'
            },
            'SelectionVariantQualifier': {
                '$Type': 'Org.OData.Core.V1.SimpleIdentifier',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Optional combination of parameters and filters to query the value help entity set',
                '@Org.OData.Core.V1.LongDescription':
                    'Qualifier for annotation with term [UI.SelectionVariant](UI.md#SelectionVariant) on the entity set identified via CollectionPath'
            },
            'Parameters': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.Common.v1.ValueListParameter',
                '@Org.OData.Core.V1.Description':
                    'Instructions on how to construct the value list request and consume response properties'
            },
            '@Org.OData.Core.V1.Description':
                'Exactly one of `CollectionPath` and `RelativeCollectionPath` must be provided.'
        },
        'FetchValuesType': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.Byte',
            '@Org.OData.Core.V1.Description': 'Hint on when to fetch values',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': 1,
                    '@Org.OData.Core.V1.Description': 'Fetch values immediately without filter'
                },
                {
                    'Value': 2,
                    '@Org.OData.Core.V1.Description': 'Fetch values with a filter'
                }
            ]
        },
        'ValueListRelevantQualifiers': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Core.V1.SimpleIdentifier',
            '@Org.OData.Core.V1.Description': 'List of qualifiers of relevant ValueList annotations',
            '@Org.OData.Core.V1.LongDescription':
                'The value of this annotation is a dynamic expression for calculating the qualifiers of relevant value lists depending on the values of one or more other properties.'
        },
        'ValueListWithFixedValues': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'Parameter'],
            '@Org.OData.Core.V1.Description':
                "If specified as true, there's only one value list mapping and its value list consists of a small number of fixed values",
            '@Org.OData.Validation.V1.ApplicableTerms': [
                'com.sap.vocabularies.Common.v1.ValueListShowValuesImmediately'
            ]
        },
        'ValueListShowValuesImmediately': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Annotation'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'A value list with a very small number of fixed values, can decide to show all values immediately'
        },
        'ValueListForValidation': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property', 'Parameter'],
            '@Org.OData.Core.V1.Description':
                'Contains the qualifier of the ValueList or ValueListMapping that should be used for validation',
            '@Org.OData.Core.V1.LongDescription':
                'An empty string identifies the ValueList or ValueListMapping without a qualifier.'
        },
        'ValueListReferences': {
            '$Kind': 'Term',
            '$Collection': true,
            '$AppliesTo': ['Property', 'Parameter'],
            '@Org.OData.Core.V1.IsURL': true,
            '@Org.OData.Core.V1.Description':
                'A list of URLs of CSDL documents containing value list mappings for this parameter or property'
        },
        'ValueListMapping': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.ValueListMappingType',
            '$AppliesTo': ['Property', 'Parameter'],
            '@Org.OData.Core.V1.Description':
                'Specifies the mapping between data service properties and value list properties',
            '@Org.OData.Core.V1.LongDescription':
                'The value list can be filtered based on user input. It can be used for type-ahead and classical pick lists. There may be many alternative mappings with different qualifiers.'
        },
        'ValueListMappingType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.Common.v1.QuickInfo'],
            'Label': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsLanguageDependent': true,
                '@Org.OData.Core.V1.Description':
                    'Headline for value list, fallback is the label of the property or parameter'
            },
            'CollectionPath': {
                '@Org.OData.Core.V1.Description':
                    'Resource path of an OData collection with possible values, relative to the document containing the value list mapping'
            },
            'DistinctValuesSupported': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description':
                    "Indicates that the value list supports a 'distinct' aggregation on the value list properties defined via ValueListParameterInOut and ValueListParameterOut"
            },
            'FetchValues': {
                '$Type': 'com.sap.vocabularies.Common.v1.FetchValuesType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Hint on when to fetch values'
            },
            'PresentationVariantQualifier': {
                '$Type': 'Org.OData.Core.V1.SimpleIdentifier',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Alternative representation of a value help, e.g. as a bar chart',
                '@Org.OData.Core.V1.LongDescription':
                    'Qualifier for annotation with term [UI.PresentationVariant](UI.md#PresentationVariant) on the value list entity set identified via CollectionPath in the ValueListReference annotation'
            },
            'SelectionVariantQualifier': {
                '$Type': 'Org.OData.Core.V1.SimpleIdentifier',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Optional combination of parameters and filters to query the value help entity set',
                '@Org.OData.Core.V1.LongDescription':
                    'Qualifier for annotation with term [UI.SelectionVariant](UI.md#SelectionVariant) on the entity set identified via CollectionPath'
            },
            'Parameters': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.Common.v1.ValueListParameter',
                '@Org.OData.Core.V1.Description':
                    'Instructions on how to construct the value list request and consume response properties'
            }
        },
        'ValueListParameter': {
            '$Kind': 'ComplexType',
            '$Abstract': true,
            'ValueListProperty': {
                '@Org.OData.Core.V1.Description':
                    'Path to property in the value list . Format is identical to PropertyPath annotations.'
            }
        },
        'ValueListParameterIn': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.Common.v1.ValueListParameter',
            'LocalDataProperty': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description':
                    'Path to property that is used to filter the value list with `eq` comparison',
                '@Org.OData.Core.V1.LongDescription':
                    'In case the property path contains a collection-based navigation or structural property, the filter is a set of `eq` comparisons connected by `or` operators'
            },
            'InitialValueIsSignificant': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Initial value, e.g. empty string, is a valid and significant value'
            }
        },
        'ValueListParameterConstant': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.Common.v1.ValueListParameter',
            'Constant': {
                '$Type': 'Edm.PrimitiveType',
                '@Org.OData.Core.V1.Description':
                    'Constant value that is used to filter the value list with `eq` comparison, using the same representation as property default values, see [CSDL XML, 7.2.7 Default Value](https://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_DefaultValue)'
            },
            'InitialValueIsSignificant': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description': 'Initial value, e.g. empty string, is a valid and significant value'
            }
        },
        'ValueListParameterConstants': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.Common.v1.ValueListParameter',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            'Constants': {
                '$Collection': true,
                '$Type': 'Edm.PrimitiveType',
                '@Org.OData.Core.V1.Description':
                    'List of constant values that are used to filter the value list with `eq` comparisons connected by `or` operators, using the same representation as property default values, see [CSDL XML, 7.2.7 Default Value](https://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_DefaultValue). Initial values are significant.',
                '@Org.OData.Core.V1.LongDescription': 'An empty list means a vacuous filter condition'
            }
        },
        'ValueListParameterInOut': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.Common.v1.ValueListParameter',
            'LocalDataProperty': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description':
                    'Path to property that is used to filter the value list with `startswith` comparison and filled from the picked value list item'
            },
            'InitialValueIsSignificant': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Initial value, e.g. empty string, is a valid and significant value'
            },
            '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.UI.v1.Importance']
        },
        'ValueListParameterOut': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.Common.v1.ValueListParameter',
            'LocalDataProperty': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Path to property that is filled from response'
            },
            '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.UI.v1.Importance']
        },
        'ValueListParameterDisplayOnly': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.Common.v1.ValueListParameter',
            '@Org.OData.Core.V1.Description': 'Value list property that is not used to fill the edited entity',
            '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.UI.v1.Importance']
        },
        'ValueListParameterFilterOnly': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.Common.v1.ValueListParameter',
            '@Org.OData.Core.V1.Description':
                'Value list property that is used to filter the value list, not connected to the edited entity',
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description': 'All filterable properties of the value list can be used to filter'
                }
            ]
        },
        'IsCalendarYear': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a year number as string following the logical pattern (-?)YYYY(Y*) consisting of an optional\n            minus sign for years B.C. followed by at least four digits. The string matches the regex pattern -?([1-9][0-9]{3,}|0[0-9]{3})\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsCalendarHalfyear': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a halfyear number as string following the logical pattern H consisting of a single digit.\n            The string matches the regex pattern [1-2]\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsCalendarQuarter': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a calendar quarter number as string following the logical pattern Q consisting of a single digit.\n            The string matches the regex pattern [1-4]\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsCalendarMonth': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a calendar month number as string following the logical pattern MM consisting of two digits.\n            The string matches the regex pattern 0[1-9]|1[0-2]\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsCalendarWeek': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a calendar week number as string following the logical pattern WW consisting of two digits.\n            The string matches the regex pattern 0[1-9]|[1-4][0-9]|5[0-3]\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsDayOfCalendarMonth': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Day number relative to a calendar month. Valid values are between 1 and 31.\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.SByte',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsDayOfCalendarYear': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Day number relative to a calendar year. Valid values are between 1 and 366.\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.Int16',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsCalendarYearHalfyear': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a calendar year and halfyear as string following the logical pattern (-?)YYYY(Y*)H consisting\n            of an optional minus sign for years B.C. followed by at least five digits, where the last digit represents the halfyear.\n            The string matches the regex pattern -?([1-9][0-9]{3,}|0[0-9]{3})[1-2]\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsCalendarYearQuarter': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a calendar year and quarter as string following the logical pattern (-?)YYYY(Y*)Q consisting\n            of an optional minus sign for years B.C. followed by at least five digits, where the last digit represents the quarter.\n            The string matches the regex pattern -?([1-9][0-9]{3,}|0[0-9]{3})[1-4]\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsCalendarYearMonth': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a calendar year and month as string following the logical pattern (-?)YYYY(Y*)MM consisting\n            of an optional minus sign for years B.C. followed by at least six digits, where the last two digits represent the months January to\n            December.\n            The string matches the regex pattern -?([1-9][0-9]{3,}|0[0-9]{3})(0[1-9]|1[0-2])\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsCalendarYearWeek': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a calendar year and week as string following the logical pattern (-?)YYYY(Y*)WW consisting\n          of an optional minus sign for years B.C. followed by at least six digits, where the last two digits represent week number in the year.\n          The string matches the regex pattern -?([1-9][0-9]{3,}|0[0-9]{3})(0[1-9]|[1-4][0-9]|5[0-3])\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsCalendarDate': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a calendar date: year, month and day as string following the logical pattern (-?)YYYY(Y*)MMDD consisting\n          of an optional minus sign for years B.C. followed by at least eight digits, where the last four digits represent\n          the months January to December (MM) and the day of the month (DD).\n          The string matches the regex pattern -?([1-9][0-9]{3,}|0[0-9]{3})(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])\n          The regex pattern does not reflect the additional constraint for "Day-of-month Values":\n          The day value must be no more than 30 if month is one of 04, 06, 09, or 11, no more than 28 if month is 02 and year is not divisible by 4,\n          or is divisible by 100 but not by 400, and no more than 29 if month is 02 and year is divisible by 400, or by 4 but not by 100.\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsFiscalYear': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a fiscal year number as string following the logical pattern YYYY consisting of four digits.\n          The string matches the regex pattern [1-9][0-9]{3}\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsFiscalPeriod': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a fiscal period as string following the logical pattern PPP consisting of three digits.\n          The string matches the regex pattern [0-9]{3}\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsFiscalYearPeriod': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a fiscal year and period as string following the logical pattern YYYYPPP consisting\n          of seven digits, where the last three digits represent the fiscal period in the year.\n          The string matches the regex pattern ([1-9][0-9]{3})([0-9]{3})\n          ',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsFiscalQuarter': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a fiscal quarter number as string following the logical pattern Q consisting of a single digit.\n          The string matches the regex pattern [1-4]',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsFiscalYearQuarter': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a fiscal year and quarter as string following the logical pattern YYYYQ consisting of\n          five digits, where the last digit represents the quarter.\n          The string matches the regex pattern [1-9][0-9]{3}[1-4]',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsFiscalWeek': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a fiscal week number as string following the logical pattern WW consisting of two digits.\n          The string matches the regex pattern 0[1-9]|[1-4][0-9]|5[0-3]',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsFiscalYearWeek': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Property encodes a fiscal year and week as string following the logical pattern YYYYWW consisting of\n          six digits, where the last two digits represent the week number in the year.\n          The string matches the regex pattern [1-9][0-9]{3}(0[1-9]|[1-4][0-9]|5[0-3])',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsDayOfFiscalYear': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Day number relative to a fiscal year. Valid values are between 1 and 371.',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'IsFiscalYearVariant': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description': 'Property encodes a fiscal year variant',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@com.sap.vocabularies.Common.v1.MutuallyExclusiveTerm#DatePart': true
        },
        'MutuallyExclusiveTerm': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Term'],
            '@Org.OData.Core.V1.Description':
                'Only one term of the group identified with the Qualifier attribute can be applied'
        },
        'OperationTemplate': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
            '$AppliesTo': ['Term', 'Property'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Qualified name of an operation that serves as template for the operation described by the annotated term or term property',
            '@Org.OData.Core.V1.LongDescription': 'Operations named in this annotation cannot themselves be invoked.'
        },
        'DraftRoot': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.DraftRootType',
            '$AppliesTo': ['EntitySet'],
            '@Org.OData.Core.V1.Description': 'Root entities of business documents that support the draft pattern'
        },
        'DraftRootType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.Common.v1.DraftNodeType',
            'PreparationAction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Action that prepares a draft document for later activation',
                '@Org.OData.Core.V1.LongDescription':
                    'The action is bound to the draft document root and has no parameters.'
            },
            'ActivationAction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '@Org.OData.Core.V1.Description': 'Action that activates a draft document',
                '@Org.OData.Core.V1.LongDescription':
                    'The action is bound to the draft document root and has no parameters.'
            },
            'DiscardAction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Action that discards a draft document',
                '@Org.OData.Core.V1.LongDescription':
                    'The action is bound to the draft document root and has no parameters.'
            },
            'EditAction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.OperationTemplate':
                    'com.sap.vocabularies.Common.v1.Template_EditAction',
                '@Org.OData.Core.V1.Description': 'Action that creates an edit draft',
                '@Org.OData.Core.V1.LongDescription':
                    'The action is bound to the active document root node and has the signature of [`Template_EditAction`](#Template_EditAction).'
            },
            'ResumeAction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'Action that resumes a draft document. The action re-acquires the exclusive lock if needed and checks if the related active document was not changed concurrently',
                '@Org.OData.Core.V1.LongDescription':
                    'The action is bound to the draft document root and has no parameters.'
            },
            'NewAction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.OperationTemplate':
                    'com.sap.vocabularies.Common.v1.Template_NewAction',
                '@Org.OData.Core.V1.Description': 'Action that creates a new draft',
                '@Org.OData.Core.V1.LongDescription':
                    'The action is bound to the draft document root entity set and has the signature of [`Template_NewAction`](#Template_NewAction).\n\nNew drafts may also be created by POSTing an entity with property `IsActiveEntity` = `false` (default) to the entity set.'
            },
            'AdditionalNewActions': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '@com.sap.vocabularies.Common.v1.OperationTemplate':
                    'com.sap.vocabularies.Common.v1.Template_NewAction',
                '@Org.OData.Core.V1.Description':
                    'Additional actions beside the default POST or standard `NewAction`that create a new draft',
                '@Org.OData.Core.V1.LongDescription':
                    'The actions are bound to the draft document root entity set and have the signature of [`Template_NewAction`](#Template_NewAction).'
            },
            'ShareAction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.OperationTemplate':
                    'com.sap.vocabularies.Common.v1.Template_ShareAction',
                '@Org.OData.Core.V1.Description':
                    'Action that shares a draft document with other users and restricts access to the listed users in their specified roles',
                '@Org.OData.Core.V1.LongDescription':
                    'The action is bound to the draft document root node and has the signature of [`Template_ShareAction`](#Template_ShareAction).\nIt restricts access to the listed users in their specified roles.\n\nIf this action is present, the client can receive notifications about changes to the\ncollaborative draft by opening a web socket connection at the [`WebSocketBaseURL`](#WebSocketBaseURL)\nfollowed by URL parameters\n- `relatedService` = base URL (relative to server root) of the OData service of the app\n- `draft` = draft UUID.'
            }
        },
        'DraftNode': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.DraftNodeType',
            '$AppliesTo': ['EntitySet'],
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description': 'Draft nodes are marked with [`DraftActivationVia`](#DraftActivationVia)'
                }
            ],
            '@Org.OData.Core.V1.Description':
                'Entities in this set are parts of business documents that support the draft pattern'
        },
        'DraftNodeType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description':
                        'The deprecated term [`DraftNode`](#DraftNode) effectively only tags the entity set, its value is an empty record'
                }
            ],
            'PreparationAction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '$Nullable': true,
                '@Org.OData.Core.V1.Revisions': [
                    {
                        'Kind': 'Deprecated',
                        'Description': 'Preparation is always called on the draft root node'
                    }
                ],
                '@Org.OData.Core.V1.Description': 'Action that prepares a draft document for later activation'
            },
            'ValidationFunction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '$Nullable': true,
                '@Org.OData.Core.V1.Revisions': [
                    {
                        'Kind': 'Deprecated',
                        'Description': 'Separate validation without side-effects is not useful'
                    }
                ],
                '@Org.OData.Core.V1.Description':
                    'Function that validates whether a draft document is ready for activation'
            }
        },
        'DraftActivationVia': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.SimpleIdentifier',
            '$AppliesTo': ['EntitySet'],
            '@Org.OData.Core.V1.Description':
                'Draft entities in this set are indirectly activated via draft entities in the referenced entity set'
        },
        'EditableFieldFor': {
            '$Kind': 'Term',
            '$Type': 'Edm.PropertyPath',
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'The annotated property is an editable field for the referenced key property'
        },
        'SimpleIdentifier': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'The SimpleIdentifier of an OData construct in scope',
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description':
                        'Use type [Core.SimpleIdentifier](https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Core.V1.md#SimpleIdentifier) instead'
                }
            ]
        },
        'QualifiedName': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'The namespace-qualified name of an OData construct in scope',
            '@Org.OData.Core.V1.LongDescription':
                'Alias-qualified names are not fully supported, and the use of namespace-qualified names is strongly recommended.'
        },
        'ActionOverload': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'The namespace-qualified name of an action with an optional overload',
            '@Org.OData.Core.V1.LongDescription':
                'The namespace-qualified name of an action, optionally followed by parentheses\n            containing the binding parameter type of a bound action overload to identify that bound overload,\n            or by empty parentheses to identify the unbound overload, like in the `Target` attribute of an `Annotation`.'
        },
        'SemanticKey': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Edm.PropertyPath',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description':
                'The listed properties form the semantic key, i.e. they are unique modulo IsActiveEntity'
        },
        'SideEffects': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.SideEffectsType',
            '$AppliesTo': ['EntitySet', 'EntityType', 'ComplexType', 'Action'],
            '@Org.OData.Core.V1.Description': 'Describes side-effects of modification operations'
        },
        'SideEffectsType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description':
                'Changes to the source properties or source entities may have side-effects on the target properties or entities.',
            '@Org.OData.Core.V1.LongDescription':
                'If neither TargetProperties nor TargetEntities are specified, a change to the source property values may have unforeseeable side-effects.\nAn empty NavigationPropertyPath may be used in TargetEntities to specify that any property of the annotated entity type may be affected.\n\nSide effects without a `TriggerAction` happen immediately when modifying one of the source properties or source entities. Side effects with a `TriggerAction` are deferred until explicitly triggered via the `TriggerAction`.\n\nSpecial case where the side effect is annotated on an action: here the change trigger is the action invocation, so `SourceProperties` and `SourceEntities` have no meaning,\nonly `TargetProperties` and `TargetEntities` are relevant. They are addressed via the binding parameter of the action, e.g. if the binding parameter is named `_it`, all paths have to start with `_it/`.\nThis can also be used with OData V2 services: the annotation target is a function import that is marked with [`sap:action-for`](https://wiki.scn.sap.com/wiki/display/EmTech/SAP+Annotations+for+OData+Version+2.0#SAPAnnotationsforODataVersion2.0-Elementedm:FunctionImport), and all paths have to start with `_it/`.',
            'SourceProperties': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description':
                    'Changes to the values of one or more of these structural properties may affect the targets'
            },
            'SourceEntities': {
                '$Collection': true,
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description':
                    'Changes to one or more of these entities may affect the targets. An empty path means the annotation target.'
            },
            'SourceEvents': {
                '$Collection': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'When the service raises one or more of these "events for side effects", the targets may be affected'
            },
            'TargetProperties': {
                '$Collection': true,
                '@Org.OData.Core.V1.Description':
                    'These structural properties may be affected if the value of one of the sources changes',
                '@Org.OData.Core.V1.LongDescription':
                    'The syntax follows closely the syntax rules for `Edm.PropertyPath`, with the addition of `*` as the last path segment meaning all structural properties directly reached via the preceding path'
            },
            'TargetEntities': {
                '$Collection': true,
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description':
                    'These entities will be affected if the value of one of the sources changes. All affected entities need to be explicitly listed. An empty path means the annotation target.'
            },
            'EffectTypes': {
                '$Type': 'com.sap.vocabularies.Common.v1.EffectType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Revisions': [
                    {
                        'Kind': 'Deprecated',
                        'Description': 'All side effects are essentially value changes, differentiation not needed.'
                    }
                ],
                '@Org.OData.Core.V1.Description':
                    'One or more of the targets may show these effects. If not specified, any effect is possible.'
            },
            'TriggerAction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Bound action to trigger side-effects after modifying an entity',
                '@Org.OData.Core.V1.LongDescription':
                    'Binding parameter type of the trigger action is the entity type annotated with `SideEffects`. The action does not have any additional parameters and does not return anything. It either succeeds with `204 No Content` or it fails with `4xx` or `5xx`.'
            },
            'Discretionary': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'Indicates whether the client can decide if a side-effect should be triggered or not',
                '@Org.OData.Core.V1.LongDescription':
                    'The value of this property typically a static boolean value. It can be used by clients (e.g. by asking the end user) to decide if the side effect should be triggered or not. This indicator is only allowed in case a trigger action is given as only then the execution control of the side effect is provided to the client.'
            }
        },
        'EffectType': {
            '$Kind': 'EnumType',
            '$IsFlags': true,
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description': 'All side effects are essentially value changes, differentiation not needed.'
                }
            ],
            'ValidationMessage': 1,
            'ValidationMessage@Org.OData.Core.V1.Description': 'Validation messages are assigned to a target',
            'ValidationMessage@Org.OData.Core.V1.LongDescription':
                'This side effect type indicates that validation messages may result from changes of source properties or entities.\nThus, a validation request can be sent either in conjunction with or separately after a modifying request.\nValidation messages shall be persisted with the draft and immediately available in a subsequent request without repeating the validation logic.',
            'ValueChange': 2,
            'ValueChange@Org.OData.Core.V1.Description': 'The value of a target changes',
            'ValueChange@Org.OData.Core.V1.LongDescription':
                'This side effect type declares that changes to source properties or entities may impact the values of any, one or multiple target properties or entities.\nUpon modification preparation logic is performed that determines additional values to be stored in the draft document.',
            'FieldControlChange': 4,
            'FieldControlChange@Org.OData.Core.V1.Description':
                'The value of the Common.FieldControl annotation of a target changes',
            'FieldControlChange@Org.OData.Core.V1.LongDescription':
                'This side effect type specifies that source properties or entities may impact the dynamic field control state of any, one or multiple target properties or entities.\nUpon modification field control logic is invoked so that meta-information like hidden or read-only is determined.'
        },
        'DefaultValuesFunction': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
            '$AppliesTo': ['EntitySet', 'NavigationProperty', 'Action', 'Function'],
            '@Org.OData.Core.V1.Description':
                'Function to calculate default values based on user input that is only known to the client and "context information" that is already available to the service',
            '@Org.OData.Core.V1.LongDescription':
                'The default values function must have a bound overload whose binding parameter type matches the annotation target\n- for an entity set: collection of entity type of entity set\n- for a navigation property: identical to the type of the navigation property (single- or collection-valued)\n- for a bound action/function: identical to the binding parameter type of the annotated action/function\n\nIn addition the overload can have non-binding parameters for values that the user has already entered:\n- for an entity set or navigation property: each non-binding parameter name and type must match the name and type of a property of the entity to be created\n- for an action or function: each non-binding parameter name and type must match the name and type of a non-binding parameter of the action or function to be called\n\nThe result type of the default values function is a complex type whose properties correspond in name and type to a subset of\n- the properties of the entity to create, or\n- the parameters of the action or function to call'
        },
        'DerivedDefaultValue': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property'],
            '@com.sap.vocabularies.Common.v1.Experimental':
                'This has been experimental for three years, consider to delete it',
            '@Org.OData.Core.V1.Description':
                'Function import to derive a default value for the property from a given context.',
            '@Org.OData.Core.V1.LongDescription':
                'Function import has two parameters of complex types:\n- `parameters`, a structure resembling the entity type the parameter entity set related to the entity set of the annotated property\n- `properties`, a structure resembling the type of the entity set of the annotated property\n\nThe return type must be of the same type as the annotated property.\n\nArguments passed to the function import are used as context for deriving the default value.\nThe function import returns this default value, or null in case such a value could not be determined.'
        },
        'FilterDefaultValue': {
            '$Kind': 'Term',
            '$Type': 'Edm.PrimitiveType',
            '$Nullable': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description': 'A default value for the property to be used in filter expressions.'
        },
        'FilterDefaultValueHigh': {
            '$Kind': 'Term',
            '$Type': 'Edm.PrimitiveType',
            '$Nullable': true,
            '$AppliesTo': ['Property'],
            '@com.sap.vocabularies.Common.v1.Experimental':
                'Requested by Roland Trapp as a counterpart to CDS annotation @Consumption.filter.defaultValueHigh',
            '@Org.OData.Core.V1.Description':
                "A default upper limit for the property to be used in 'less than or equal' filter expressions."
        },
        'DerivedFilterDefaultValue': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property'],
            '@com.sap.vocabularies.Common.v1.Experimental':
                'This has been experimental for three years, consider to delete it',
            '@Org.OData.Core.V1.Description':
                'Function import to derive a default value for the property from a given context in order to use it in filter expressions.',
            '@Org.OData.Core.V1.LongDescription':
                'Function import has two parameters of complex types:\n- `parameters`, a structure resembling the entity type the parameter\n  entity set related to the entity set of the annotated property\n- `properties`, a structure resembling the\n  type of the entity set of the annotated property\n\nThe return type must be of the same type as the annotated\nproperty.\n\nArguments passed to the function import are used as context for deriving the default value.\nThe function import returns this default value, or null in case such a value could not be determined.'
        },
        'SortOrder': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.Common.v1.SortOrderType',
            '$AppliesTo': ['EntitySet', 'EntityType'],
            '@Org.OData.Core.V1.Description': 'List of sort criteria',
            '@Org.OData.Core.V1.LongDescription':
                'The items of the annotated entity set or the items of the\n          collection of the annotated entity type are sorted by the first entry of the SortOrder collection.\n          Items with same value for this first sort criteria are sorted by the second entry of the SortOrder collection, and so on. '
        },
        'SortOrderType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description':
                'Exactly one of `Property`, `DynamicProperty` and `Expression` must be present',
            'Property': {
                '$Type': 'Edm.PropertyPath',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.PrimitivePropertyPath': true,
                '@Org.OData.Core.V1.Description': 'Sort property',
                '@Org.OData.Core.V1.Revisions': [
                    {
                        'Kind': 'Modified',
                        'Description': 'Now nullable if `DynamicProperty` is present'
                    }
                ]
            },
            'DynamicProperty': {
                '$Type': 'Edm.AnnotationPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Dynamic property introduced by an annotation and used as sort property',
                '@Org.OData.Core.V1.LongDescription':
                    'If the annotation referenced by the annotation path does not apply to the same collection of entities\n            as the one being sorted according to the [`UI.PresentationVariant`](UI.md#PresentationVariant) or `Common.SortOrder` annotation,\n            this instance of `UI.PresentationVariant/SortOrder` or `Common.SortOrder` MUST be silently ignored.',
                '@Org.OData.Validation.V1.AllowedTerms': [
                    'com.sap.vocabularies.Analytics.v1.AggregatedProperty',
                    'Org.OData.Aggregation.V1.CustomAggregate'
                ]
            },
            'Expression': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'Dynamic expression whose primitive result value is used to sort the instances'
            },
            'Descending': {
                '$Type': 'Edm.Boolean',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Sort direction, ascending if not specified otherwise'
            }
        },
        'RecursiveHierarchy': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.RecursiveHierarchyType',
            '$BaseTerm': 'Org.OData.Aggregation.V1.RecursiveHierarchy',
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description':
                        'Use terms [Aggregation.RecursiveHierarchy](https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Aggregation.V1.md#RecursiveHierarchy) and [Hierarchy.RecursiveHierarchy](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/Hierarchy.md#RecursiveHierarchy) instead'
                }
            ],
            '@Org.OData.Core.V1.Description': 'Defines a recursive hierarchy.'
        },
        'RecursiveHierarchyType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Revisions': [
                {
                    'Kind': 'Deprecated',
                    'Description':
                        'Use terms [Aggregation.RecursiveHierarchy](https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Aggregation.V1.md#RecursiveHierarchy) and [Hierarchy.RecursiveHierarchy](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/Hierarchy.md#RecursiveHierarchy) instead'
                }
            ],
            'ExternalNodeKeyProperty': {
                '$Type': 'Edm.PropertyPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Property holding the external human-readable key identifying the node'
            },
            'NodeDescendantCountProperty': {
                '$Type': 'Edm.PropertyPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Property holding the descendant count for a hierarchy node.\n            The descendant count of a node is the number of its descendants in the hierarchy structure of the result considering\n            only those nodes matching any specified $filter and $search. A property holding descendant counts has an integer\n            data type.'
            },
            'NodeDrillStateProperty': {
                '$Type': 'Edm.PropertyPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Property holding the drill state of a hierarchy node. The drill state is indicated\n            by one of the following string values: collapsed, expanded, or leaf. For an expanded node, its\n            children are included in the result collection. For a collapsed node, the children are included in the entity set, but\n            they are not part of the result collection. Retrieving them requires a relaxed filter expression or a separate request\n            filtering on the parent node ID with the ID of the collapsed node. A leaf does not have any child in the entity set.\n            '
            }
        },
        'CreatedAt': {
            '$Kind': 'Term',
            '$Type': 'Edm.DateTimeOffset',
            '$Nullable': true,
            '$AppliesTo': ['EntityType'],
            '$Precision': 0,
            '@Org.OData.Core.V1.Description': 'Creation timestamp',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'CreatedBy': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.UserID',
            '$Nullable': true,
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'First editor',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'ChangedAt': {
            '$Kind': 'Term',
            '$Type': 'Edm.DateTimeOffset',
            '$Nullable': true,
            '$AppliesTo': ['EntityType'],
            '$Precision': 0,
            '@Org.OData.Core.V1.Description': 'Last modification timestamp',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'ChangedBy': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Common.v1.UserID',
            '$Nullable': true,
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Last editor',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'UserID': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'User ID',
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true
        },
        'OriginalProtocolVersion': {
            '$Kind': 'Term',
            '$AppliesTo': ['Schema'],
            '@Org.OData.Core.V1.Description':
                'Original protocol version of a converted (V4) CSDL document, allowed values `2.0` and `3.0`'
        },
        'ApplyMultiUnitBehaviorForSortingAndFiltering': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description':
                'Sorting and filtering of amounts in multiple currencies needs special consideration',
            '@Org.OData.Core.V1.LongDescription':
                'TODO: add link to UX documentation on https://experience.sap.com/fiori-design/'
        },
        'mediaUploadLink': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property', 'EntityType'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@com.sap.vocabularies.Common.v1.IsInstanceAnnotation': true,
            '@Org.OData.Core.V1.RequiresType': 'Edm.Stream',
            '@Org.OData.Core.V1.IsURL': true,
            '@Org.OData.Core.V1.Description': 'URL for uploading new media content to a Document Management Service',
            '@Org.OData.Core.V1.LongDescription':
                'In contrast to the `@odata.mediaEditLink` this URL allows to upload new media content without directly changing a stream property or media resource.\nThe upload request typically uses HTTP POST with `Content-Type: multipart/form-data` following RFC 7578.\nThe upload request must contain one multipart representing the content of the file. The `name` parameter in the `Content-Disposition` header (as described in RFC 7578) is irrelevant, but the `filename` parameter is expected.\nIf the request succeeds the response will contain a JSON body of `Content-Type: application/json` with a JSON property `readLink`. The newly uploaded media resource can be linked to the stream property by changing the `@odata.mediaReadLink` to the value of this `readLink` in a subsequent PATCH request to the OData entity.'
        },
        'PrimitivePropertyPath': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Term', 'Property'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'A term or term property with this tag whose type is (a collection of) `Edm.PropertyPath` MUST resolve to a primitive structural property'
        },
        'WebSocketBaseURL': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntityContainer'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.IsURL': true,
            '@Org.OData.Core.V1.Description': 'Base URL for WebSocket connections',
            '@Org.OData.Core.V1.LongDescription': 'This annotation MUST be unqualified.'
        },
        'WebSocketChannel': {
            '$Kind': 'Term',
            '$Nullable': true,
            '$AppliesTo': ['EntityContainer'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Channel for WebSocket connections',
            '@Org.OData.Core.V1.LongDescription':
                'Messages sent over the channel follow the [ABAP Push Channel Protocol](https://community.sap.com/t5/application-development-blog-posts/specification-of-the-push-channel-protocol-pcp/ba-p/13137541).\nTo consume a channel, the client opens a web socket connection at the [`WebSocketBaseURL`](#WebSocketBaseURL)\nfollowed by URL parameters\n- parameter name = annotation qualifier, parameter value = channel ID (see below)\n- parameter name = `relatedService`, parameter value = base URL (relative to server root) of the OData service of the app\n\nSupported qualifiers and channel IDs:\n<dl>\n<dt>`sideEffects` <dd>Notifications about side effects to be triggered by the client (channel ID = non-null annotation value)\n</dl>'
        },
        'AddressViaNavigationPath': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description':
                'Service prefers requests to use a resource path with navigation properties',
            '@Org.OData.Core.V1.LongDescription':
                'Use this tag on services that do not restrict requests to certain resource paths\nvia [`Capabilities`](https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Capabilities.V1.html)\nor [`Core.RequiresExplicitBinding`](https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.html#RequiresExplicitBinding)\nannotations, but that prefer requests with a resource path that\ncontains the navigation properties reflecting the UI structure.\n\nFor example, entering a cancellation fee into an order item field bound to `CancellationItem/Fee`\nleads to a\n`PATCH Orders(23)/Items(5)/CancellationItem` request with `{"Fee": ...}` payload.'
        },
        'ReferentialConstraint': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.Common.v1.ReferentialConstraintType',
            '$AppliesTo': ['NavigationProperty'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                '[Referential constraints](https://oasis-tcs.github.io/odata-specs/odata-csdl-xml/odata-csdl-xml.html#ReferentialConstraint) without nullability requirement'
        },
        'ReferentialConstraintType': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'A record that behaves like the standard referential constraint on the navigation property targeted by a [`ReferentialConstraint`](#ReferentialConstraint) annotation,\n          but the nullability requirement for the dependent property is lifted.\n          It asserts that the principal property _of an existing related entity_\n          must have the same value as the dependent property.',
            'Property': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description':
                    'The path to the property is evaluated relative to the type containing the navigation property'
            },
            'ReferencedProperty': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description':
                    'The path to the referenced property MUST start with a segment containing the navigation property'
            }
        }
    }
} as CSDL;
