// Last content update: Wed Oct 15 2025 09:21:20 GMT+0200 (Central European Summer Time)
import type { CSDL } from '@sap-ux/vocabularies/CSDL';

export default {
    '$Version': '4.0',
    '$Reference': {
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Validation.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.Validation.V1',
                    '$Alias': 'Validation'
                }
            ]
        }
    },
    'Org.OData.Core.V1': {
        '$Alias': 'Core',
        '@Org.OData.Core.V1.Description': 'Core terms needed to write vocabularies',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Core.V1.md'
            }
        ],
        'ODataVersions': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description':
                'A space-separated list of supported versions of the OData Protocol. Note that 4.0 is implied by 4.01 and does not need to be separately listed.'
        },
        'SchemaVersion': {
            '$Kind': 'Term',
            '$AppliesTo': ['Schema', 'Reference'],
            '@Org.OData.Core.V1.Description':
                'Service-defined value representing the version of the schema. Services MAY use semantic versioning, but clients MUST NOT assume this is the case.'
        },
        'Revisions': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Core.V1.RevisionType',
            '@Org.OData.Core.V1.Description': 'List of revisions of a model element'
        },
        'RevisionType': {
            '$Kind': 'ComplexType',
            'Version': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'The schema version with which this revision was first published'
            },
            'Kind': {
                '$Type': 'Org.OData.Core.V1.RevisionKind',
                '@Org.OData.Core.V1.Description': 'The kind of revision'
            },
            'Description': {
                '@Org.OData.Core.V1.Description': 'Text describing the reason for the revision'
            }
        },
        'RevisionKind': {
            '$Kind': 'EnumType',
            'Added': 0,
            'Added@Org.OData.Core.V1.Description': 'Model element was added',
            'Modified': 1,
            'Modified@Org.OData.Core.V1.Description': 'Model element was modified',
            'Deprecated': 2,
            'Deprecated@Org.OData.Core.V1.Description': 'Model element was deprecated'
        },
        'Description': {
            '$Kind': 'Term',
            '$Nullable': true,
            '@Org.OData.Core.V1.Description': 'A brief description of a model element',
            '@Org.OData.Core.V1.IsLanguageDependent': true
        },
        'LongDescription': {
            '$Kind': 'Term',
            '$Nullable': true,
            '@Org.OData.Core.V1.Description': 'A long description of a model element',
            '@Org.OData.Core.V1.IsLanguageDependent': true
        },
        'Links': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Core.V1.Link',
            '@Org.OData.Core.V1.Description': 'Link to related information'
        },
        'Link': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description':
                'The Link term is inspired by the `atom:link` element, see [RFC4287](https://tools.ietf.org/html/rfc4287#section-4.2.7), and the `Link` HTTP header, see [RFC5988](https://tools.ietf.org/html/rfc5988)',
            'rel': {
                '@Org.OData.Core.V1.Description':
                    'Link relation type, see [IANA Link Relations](http://www.iana.org/assignments/link-relations/link-relations.xhtml)'
            },
            'href': {
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Core.V1.Description': 'URL of related information'
            }
        },
        'Example': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.ExampleValue',
            '$AppliesTo': [
                'EntityType',
                'ComplexType',
                'TypeDefinition',
                'Term',
                'Property',
                'NavigationProperty',
                'Parameter',
                'ReturnType'
            ],
            '@Org.OData.Core.V1.Description': 'Example for an instance of the annotated model element',
            '@Org.OData.Core.V1.Example': {
                'Description':
                    'The value of Core.Example is a record/object containing the example value and/or annotation examples.',
                '@Org.OData.Core.V1.Example#primitive': {
                    '@odata.type': '#Core.PrimitiveExampleValue',
                    'Description': 'Primitive example value',
                    'Value': 'Hello World'
                },
                '@Org.OData.Core.V1.Example#complex': {
                    '@odata.type': '#Core.ComplexExampleValue',
                    'Description': 'Complex example value',
                    'Value': {
                        'ExampleProperty': 'with value'
                    }
                },
                '@Org.OData.Core.V1.Example#entity': {
                    '@odata.type': '#Core.EntityExampleValue',
                    'Description': 'Entity example value',
                    'Value': {
                        'ExampleKeyProperty': 'with value'
                    }
                },
                '@Org.OData.Core.V1.Example#external': {
                    '@odata.type': '#Core.ExternalExampleValue',
                    'Description': 'External example',
                    'ExternalValue': 'https://services.odata.org/TripPinRESTierService/(S(5fjoyrzpnvzrrvmxzzq25i4q))/Me'
                }
            }
        },
        'ExampleValue': {
            '$Kind': 'ComplexType',
            'Description': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Description of the example value'
            }
        },
        'PrimitiveExampleValue': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Core.V1.ExampleValue',
            'Value': {
                '$Type': 'Edm.PrimitiveType',
                '@Org.OData.Core.V1.Description': 'Example value for the custom parameter'
            }
        },
        'ComplexExampleValue': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Core.V1.ExampleValue',
            'Value': {
                '$Type': 'Edm.ComplexType',
                '@Org.OData.Core.V1.Description': 'Example value for the custom parameter'
            }
        },
        'EntityExampleValue': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Core.V1.ExampleValue',
            'Value': {
                '$Kind': 'NavigationProperty',
                '$Type': 'Edm.EntityType',
                '@Org.OData.Core.V1.Description': 'Example value for the custom parameter'
            }
        },
        'ExternalExampleValue': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Core.V1.ExampleValue',
            'ExternalValue': {
                '@Org.OData.Core.V1.Description': 'Url reference to the value in its literal format',
                '@Org.OData.Core.V1.IsURL': true
            }
        },
        'Messages': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Core.V1.MessageType',
            '@Org.OData.Core.V1.Description': 'Instance annotation for warning and info messages'
        },
        'MessageType': {
            '$Kind': 'ComplexType',
            'code': {
                '@Org.OData.Core.V1.Description': 'Machine-readable, language-independent message code'
            },
            'message': {
                '@Org.OData.Core.V1.Description': 'Human-readable, language-dependent message text',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'severity': {
                '$Type': 'Org.OData.Core.V1.MessageSeverity',
                '@Org.OData.Core.V1.Description': 'Severity of the message'
            },
            'target': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'A path to the target of the message detail, relative to the annotated instance'
            },
            'details': {
                '$Collection': true,
                '$Type': 'Org.OData.Core.V1.MessageType',
                '@Org.OData.Core.V1.Description': 'List of detail messages'
            }
        },
        'MessageSeverity': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': 'success',
                    '@Org.OData.Core.V1.Description': 'Positive feedback - no action required'
                },
                {
                    'Value': 'info',
                    '@Org.OData.Core.V1.Description': 'Additional information - no action required'
                },
                {
                    'Value': 'warning',
                    '@Org.OData.Core.V1.Description': 'Warning - action may be required'
                },
                {
                    'Value': 'error',
                    '@Org.OData.Core.V1.Description': 'Error - action is required'
                }
            ]
        },
        'ValueException': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.ValueExceptionType',
            '@Org.OData.Core.V1.Description': 'The annotated value is problematic'
        },
        'ExceptionType': {
            '$Kind': 'ComplexType',
            '$Abstract': true,
            'info': {
                '$Type': 'Org.OData.Core.V1.MessageType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Information about the exception'
            }
        },
        'ValueExceptionType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Core.V1.ExceptionType',
            'value': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'String representation of the exact value'
            }
        },
        'ResourceException': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.ResourceExceptionType',
            '@Org.OData.Core.V1.Description': 'The annotated instance within a success payload is problematic'
        },
        'ResourceExceptionType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Core.V1.ExceptionType',
            'retryLink': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'A GET request to this URL retries retrieving the problematic instance',
                '@Org.OData.Core.V1.IsURL': true
            }
        },
        'DataModificationException': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.DataModificationExceptionType',
            '@Org.OData.Core.V1.Description':
                'A modification operation failed on the annotated instance or collection within a success payload'
        },
        'DataModificationExceptionType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'Org.OData.Core.V1.ExceptionType',
            'failedOperation': {
                '$Type': 'Org.OData.Core.V1.DataModificationOperationKind',
                '@Org.OData.Core.V1.Description': 'The kind of modification operation that failed'
            },
            'responseCode': {
                '$Type': 'Edm.Int16',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Response code of the failed operation, e.g. 424 for a failed dependency',
                '@Org.OData.Validation.V1.Minimum': 100,
                '@Org.OData.Validation.V1.Maximum': 599
            }
        },
        'DataModificationOperationKind': {
            '$Kind': 'EnumType',
            '$UnderlyingType': 'Edm.Int32',
            'insert': 0,
            'insert@Org.OData.Core.V1.Description': 'Insert new instance',
            'update': 1,
            'update@Org.OData.Core.V1.Description': 'Update existing instance',
            'upsert': 2,
            'upsert@Org.OData.Core.V1.Description': 'Insert new instance or update it if it already exists',
            'delete': 3,
            'delete@Org.OData.Core.V1.Description': 'Delete existing instance',
            'invoke': 4,
            'invoke@Org.OData.Core.V1.Description': 'Invoke action or function',
            'link': 5,
            'link@Org.OData.Core.V1.Description': 'Add link between entities',
            'unlink': 6,
            'unlink@Org.OData.Core.V1.Description': 'Remove link between entities'
        },
        'IsLanguageDependent': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Term', 'Property'],
            '@Org.OData.Core.V1.Description': 'Properties and terms annotated with this term are language-dependent',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String'
        },
        'Tag': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.Boolean',
            '@Org.OData.Core.V1.Description': 'This is the type to use for all tagging terms'
        },
        'RequiresType': {
            '$Kind': 'Term',
            '$AppliesTo': ['Term'],
            '@Org.OData.Core.V1.Description':
                'Terms annotated with this term can only be applied to elements that have a type that is identical to or derived from the given type name'
        },
        'AppliesViaContainer': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Term'],
            '@Org.OData.Core.V1.Description':
                'The target path of an annotation with the tagged term MUST start with an entity container or the annotation MUST be embedded within an entity container, entity set or singleton',
            '@Org.OData.Core.V1.LongDescription':
                'Services MAY additionally annotate a container-independent model element (entity type, property, navigation property) if allowed by the `AppliesTo` property of the term\n          and the annotation applies to all uses of that model element.'
        },
        'ResourcePath': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntitySet', 'Singleton', 'ActionImport', 'FunctionImport'],
            '@Org.OData.Core.V1.Description':
                'Resource path for entity container child, can be relative to xml:base and the request URL',
            '@Org.OData.Core.V1.IsURL': true
        },
        'DereferenceableIDs': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'Entity-ids are URLs that locate the identified entity'
        },
        'ConventionalIDs': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityContainer'],
            '@Org.OData.Core.V1.Description': 'Entity-ids follow OData URL conventions'
        },
        'Permissions': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Permission',
            '$AppliesTo': [
                'Property',
                'ComplexType',
                'TypeDefinition',
                'EntityType',
                'EntitySet',
                'NavigationProperty',
                'Action',
                'Function'
            ],
            '@Org.OData.Core.V1.Description': 'Permissions for accessing a resource'
        },
        'Permission': {
            '$Kind': 'EnumType',
            '$IsFlags': true,
            'None': 0,
            'None@Org.OData.Core.V1.Description': 'No permissions',
            'Read': 1,
            'Read@Org.OData.Core.V1.Description': 'Read permission',
            'Write': 2,
            'Write@Org.OData.Core.V1.Description': 'Write permission',
            'ReadWrite': 3,
            'ReadWrite@Org.OData.Core.V1.Description': 'Read and write permission',
            'Invoke': 4,
            'Invoke@Org.OData.Core.V1.Description': 'Permission to invoke actions'
        },
        'ContentID': {
            '$Kind': 'Term',
            '@Org.OData.Core.V1.Description': 'A unique identifier for nested entities within a request.'
        },
        'DefaultNamespace': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Schema', 'Include'],
            '@Org.OData.Core.V1.Description':
                'Functions, actions and types in this namespace can be referenced in URLs with or without namespace- or alias- qualification.',
            '@Org.OData.Core.V1.LongDescription':
                'Data Modelers should ensure uniqueness of schema children across all default namespaces, and should avoid naming bound functions, actions, or derived types with the same name as a structural or navigational property of the type.'
        },
        'Immutable': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'A value for this non-key property can be provided by the client on insert and remains unchanged on update'
        },
        'Computed': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description': 'A value for this property is generated on both insert and update'
        },
        'ComputedDefaultValue': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'A value for this property can be provided by the client on insert and update. If no value is provided on insert, a non-static default value is generated'
        },
        'IsURL': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'Term'],
            '@Org.OData.Core.V1.Description': 'Properties and terms annotated with this term MUST contain a valid URL',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String'
        },
        'AcceptableMediaTypes': {
            '$Kind': 'Term',
            '$Collection': true,
            '$AppliesTo': ['EntityType', 'Property', 'Term', 'TypeDefinition', 'Parameter', 'ReturnType'],
            '@Org.OData.Core.V1.Description':
                'Lists the MIME types acceptable for the annotated entity type marked with HasStream="true" or the annotated binary, stream, or string property or term',
            '@Org.OData.Core.V1.LongDescription':
                'The annotation of a TypeDefinition propagates to the model elements having this type',
            '@Org.OData.Core.V1.IsMediaType': true
        },
        'MediaType': {
            '$Kind': 'Term',
            '$Nullable': true,
            '$AppliesTo': ['EntityType', 'Property', 'Term', 'TypeDefinition', 'Parameter', 'ReturnType'],
            '@Org.OData.Core.V1.Description':
                'The media type of the media stream of the annotated entity type marked with HasStream="true" or the annotated binary, stream, or string property or term',
            '@Org.OData.Core.V1.LongDescription':
                'The annotation of a TypeDefinition propagates to the model elements having this type',
            '@Org.OData.Core.V1.IsMediaType': true
        },
        'IsMediaType': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'Term'],
            '@Org.OData.Core.V1.Description':
                'Properties and terms annotated with this term MUST contain a valid MIME type',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String'
        },
        'ContentDisposition': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.ContentDispositionType',
            '$AppliesTo': ['EntityType', 'Property', 'Term'],
            '@Org.OData.Core.V1.Description':
                'The content disposition of the media stream of the annotated entity type marked with HasStream="true" or the annotated binary, stream, or string property or term'
        },
        'ContentDispositionType': {
            '$Kind': 'ComplexType',
            'Type': {
                '$DefaultValue': 'attachment',
                '@Org.OData.Core.V1.Description':
                    'The disposition type of the binary or stream value, see [RFC 6266, Disposition Type](https://datatracker.ietf.org/doc/html/rfc6266#section-4.2)'
            },
            'Filename': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    "The proposed filename for downloading the binary or stream value, see [RFC 6266, Disposition Parameter: 'Filename'](https://datatracker.ietf.org/doc/html/rfc6266#section-4.3)"
            }
        },
        'OptimisticConcurrency': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Edm.PropertyPath',
            '$AppliesTo': ['EntitySet'],
            '@Org.OData.Core.V1.Description':
                "Data modification requires the use of ETags. A non-empty collection contains the set of properties that are used to compute the ETag. An empty collection means that the service won't tell how it computes the ETag"
        },
        'AdditionalProperties': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityType', 'ComplexType'],
            '@Org.OData.Core.V1.Description':
                'Instances of this type may contain properties in addition to those declared in $metadata',
            '@Org.OData.Core.V1.LongDescription':
                'If specified as false clients can assume that instances will not contain dynamic properties, irrespective of the value of the OpenType attribute.'
        },
        'AutoExpand': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityType', 'NavigationProperty', 'Property'],
            '@Org.OData.Core.V1.Description':
                'The service will automatically expand this stream property, navigation property, or the media stream of this media entity type even if not requested with $expand'
        },
        'AutoExpandReferences': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['NavigationProperty'],
            '@Org.OData.Core.V1.Description':
                'The service will automatically expand this navigation property as entity references even if not requested with $expand=.../$ref'
        },
        'MayImplement': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Core.V1.QualifiedTypeName',
            '@Org.OData.Core.V1.Description':
                'A collection of qualified type names outside of the type hierarchy that instances of this type might be addressable as by using a type-cast segment.'
        },
        'QualifiedTermName': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'The qualified name of a term in scope.'
        },
        'QualifiedTypeName': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'The qualified name of a type in scope.'
        },
        'QualifiedActionName': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'The qualified name of an action in scope.'
        },
        'QualifiedBoundOperationName': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'The qualified name of a bound action or function in scope.',
            '@Org.OData.Core.V1.LongDescription':
                'Either\n- the qualified name of an action, to indicate the single bound overload with the specified binding parameter type, \n- the qualified name of a function, to indicate all bound overloads with the specified binding parameter type, or \n- the qualified name of a function followed by parentheses containing a comma-separated list of parameter types, in the order of their definition, to identify a single function overload with the first (binding) parameter matching the specified parameter type.\n        '
        },
        'Ordered': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'NavigationProperty', 'EntitySet', 'ReturnType', 'Term'],
            '@Org.OData.Core.V1.Description':
                'Collection has a stable order. Ordered collections of primitive or complex types can be indexed by ordinal.'
        },
        'PositionalInsert': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'NavigationProperty', 'EntitySet'],
            '@Org.OData.Core.V1.Description': 'Items can be inserted at a given ordinal index.'
        },
        'AlternateKeys': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Core.V1.AlternateKey',
            '$AppliesTo': ['EntityType', 'EntitySet', 'NavigationProperty'],
            '@Org.OData.Core.V1.Description': 'Communicates available alternate keys'
        },
        'AlternateKey': {
            '$Kind': 'ComplexType',
            'Key': {
                '$Collection': true,
                '$Type': 'Org.OData.Core.V1.PropertyRef',
                '@Org.OData.Core.V1.Description': 'The set of properties that make up this key'
            }
        },
        'PropertyRef': {
            '$Kind': 'ComplexType',
            'Name': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description':
                    'A path expression resolving to a primitive property of the entity type itself or to a primitive property of a complex or navigation property (recursively) of the entity type. The names of the properties in the path are joined together by forward slashes.'
            },
            'Alias': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'A SimpleIdentifier that MUST be unique within the set of aliases, structural and navigation properties of the containing entity type that MUST be used in the key predicate of URLs'
            }
        },
        'Dictionary': {
            '$Kind': 'ComplexType',
            '$OpenType': true,
            '@Org.OData.Core.V1.Description':
                'A dictionary of name-value pairs. Names must be valid property names, values may be restricted to a list of types via an annotation with term `Validation.OpenPropertyTypeConstraint`.',
            '@Org.OData.Core.V1.LongDescription':
                '\nProperty|Type\n:-------|:---\nAny simple identifier | Any type listed in `Validation.OpenPropertyTypeConstraint`, or any type if there is no constraint\n'
        },
        'OptionalParameter': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.OptionalParameterType',
            '$AppliesTo': ['Parameter'],
            '@Org.OData.Core.V1.Description': 'Supplying a value for the action or function parameter is optional.',
            '@Org.OData.Core.V1.LongDescription':
                'All parameters marked as optional must come after any parameters not marked as optional. The binding parameter must not be marked as optional.'
        },
        'OptionalParameterType': {
            '$Kind': 'ComplexType',
            'DefaultValue': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Default value for an optional parameter of primitive or enumeration type, using the same rules as the `cast` function in URLs.',
                '@Org.OData.Core.V1.LongDescription':
                    'If no explicit DefaultValue is specified, the service is free on how to interpret omitting the parameter from the request. For example, a service might interpret an omitted optional parameter `KeyDate` as having the current date.'
            }
        },
        'OperationAvailable': {
            '$Kind': 'Term',
            '$Type': 'Edm.Boolean',
            '$Nullable': true,
            '$DefaultValue': true,
            '$AppliesTo': ['Action', 'Function'],
            '@Org.OData.Core.V1.Description': 'Action or function is available',
            '@Org.OData.Core.V1.LongDescription':
                'The annotation value will usually be an expression, e.g. using properties of the binding parameter type for instance-dependent availability, or using properties of a singleton for global availability. The static value `null` means that availability cannot be determined upfront and is instead expressed as an operation advertisement.'
        },
        'RequiresExplicitBinding': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$Nullable': true,
            '$DefaultValue': true,
            '$AppliesTo': ['Action', 'Function'],
            '@Org.OData.Core.V1.Description':
                'This bound action or function is only available on model elements annotated with the ExplicitOperationBindings term.'
        },
        'ExplicitOperationBindings': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Core.V1.QualifiedBoundOperationName',
            '@Org.OData.Core.V1.Description':
                'The qualified names of explicitly bound operations that are supported on the target model element. These operations are in addition to any operations not annotated with RequiresExplicitBinding that are bound to the type of the target model element.'
        },
        'LocalDateTime': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'A string representing a Local Date-Time value with no offset.',
            '@Org.OData.Validation.V1.Pattern':
                '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9](\\\\.[0-9]+)?)?$'
        },
        'SymbolicName': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.SimpleIdentifier',
            '@Org.OData.Core.V1.Description': 'A symbolic name for a model element'
        },
        'SimpleIdentifier': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '$MaxLength': 128,
            '@Org.OData.Core.V1.Description':
                'A [simple identifier](https://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_SimpleIdentifier)',
            '@Org.OData.Validation.V1.Pattern':
                '^[\\p{L}\\p{Nl}_][\\p{L}\\p{Nl}\\p{Nd}\\p{Mn}\\p{Mc}\\p{Pc}\\p{Cf}]{0,}$'
        },
        'GeometryFeature': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.GeometryFeatureType',
            '$Nullable': true,
            '@Org.OData.Core.V1.Description':
                'A [Feature Object](https://datatracker.ietf.org/doc/html/rfc7946#section-3.2) represents a spatially bounded thing'
        },
        'GeometryFeatureType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description':
                'A [Feature Object](https://datatracker.ietf.org/doc/html/rfc7946#section-3.2) represents a spatially bounded thing',
            'geometry': {
                '$Type': 'Edm.Geometry',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Location of the Feature'
            },
            'properties': {
                '$Type': 'Org.OData.Core.V1.Dictionary',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Properties of the Feature'
            },
            'id': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Commonly used identifer for a Feature'
            }
        },
        'AnyStructure': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['EntityType', 'ComplexType'],
            '@Org.OData.Core.V1.Description':
                'Instances of a type are annotated with this tag if they have no common structure in a given response payload',
            '@Org.OData.Core.V1.LongDescription':
                'The select-list of a context URL MUST be `(@Core.AnyStructure)` if it would otherwise be empty,\n          but this instance annotation SHOULD be omitted from the response value.'
        },
        'IsDelta': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['ReturnType', 'Parameter'],
            '@Org.OData.Core.V1.Description':
                'The annotated Action or Function Parameter or Return Type is represented as a Delta payload',
            '@Org.OData.Core.V1.LongDescription':
                'The parameter or result is represented as a delta payload, which may include deleted entries as well as changes to related \n          entities and relationships, according to the format-specific delta representation.'
        }
    }
} as CSDL;
