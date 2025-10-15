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
    'Org.OData.Validation.V1': {
        '$Alias': 'Validation',
        '@Org.OData.Core.V1.Description': 'Terms describing validation rules',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Validation.V1.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Validation.V1.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Validation.V1.md'
            }
        ],
        'Pattern': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property', 'Parameter', 'Term'],
            '@Org.OData.Core.V1.Description':
                'The pattern that a string property, parameter, or term must match. This SHOULD be a valid regular expression, according to the ECMA 262 regular expression dialect.',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String'
        },
        'Minimum': {
            '$Kind': 'Term',
            '$Type': 'Edm.PrimitiveType',
            '$AppliesTo': ['Property', 'Parameter', 'Term'],
            '@Org.OData.Core.V1.Description': 'Minimum value that a property, parameter, or term can have.',
            '@Org.OData.Validation.V1.ApplicableTerms': ['Org.OData.Validation.V1.Exclusive']
        },
        'Maximum': {
            '$Kind': 'Term',
            '$Type': 'Edm.PrimitiveType',
            '$AppliesTo': ['Property', 'Parameter', 'Term'],
            '@Org.OData.Core.V1.Description': 'Maximum value that a property, parameter, or term can have.',
            '@Org.OData.Validation.V1.ApplicableTerms': ['Org.OData.Validation.V1.Exclusive']
        },
        'Exclusive': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Annotation'],
            '@Org.OData.Core.V1.Description': 'Tags a Minimum or Maximum as exclusive, i.e. an open interval boundary.'
        },
        'AllowedValues': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Validation.V1.AllowedValue',
            '$AppliesTo': ['Property', 'Parameter', 'TypeDefinition'],
            '@Org.OData.Core.V1.Description':
                'A collection of valid values for the annotated property, parameter, or type definition'
        },
        'AllowedValue': {
            '$Kind': 'ComplexType',
            '@Org.OData.Validation.V1.ApplicableTerms': ['Org.OData.Core.V1.SymbolicName'],
            'Value': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'An allowed value for the property, parameter, or type definition'
            }
        },
        'MultipleOf': {
            '$Kind': 'Term',
            '$Type': 'Edm.Decimal',
            '$AppliesTo': ['Property', 'Parameter', 'Term'],
            '@Org.OData.Core.V1.Description':
                'The value of the annotated property, parameter, or term must be an integer multiple of this positive value. For temporal types, the value is measured in seconds.'
        },
        'Constraint': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Validation.V1.ConstraintType',
            '$AppliesTo': ['Property', 'NavigationProperty', 'Parameter', 'EntityType', 'ComplexType'],
            '@Org.OData.Core.V1.Description': 'Condition that the annotation target has to fulfill'
        },
        'ConstraintType': {
            '$Kind': 'ComplexType',
            'FailureMessage': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsLanguageDependent': true,
                '@Org.OData.Core.V1.Description':
                    'Human-readable message that can be shown to end users if the constraint is not fulfilled'
            },
            'Condition': {
                '$Type': 'Edm.Boolean',
                '@Org.OData.Core.V1.Description':
                    'Value MUST be a dynamic expression that evaluates to true if and only if the constraint is fulfilled'
            }
        },
        'ItemsOf': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Validation.V1.ItemsOfType',
            '$AppliesTo': ['EntityType', 'ComplexType'],
            '@Org.OData.Core.V1.Description':
                'A list of constraints describing that entities related via one navigation property MUST also be related via another, collection-valued navigation property. The same `path` value MUST NOT occur more than once.',
            '@Org.OData.Core.V1.LongDescription':
                'Example: entity type `Customer` has navigation properties `AllOrders`, `OpenOrders`, and `ClosedOrders`. \nThe term allows to express that items of `OpenOrders` and `ClosedOrders` are also items of the `AllOrders` navigation property,\neven though they are defined in an `Orders` entity set.'
        },
        'ItemsOfType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description':
                'Entities related via the single- or collection-valued navigation property identified by `path` are also related via the collection-valued navigation property identified by `target`.',
            'path': {
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description': 'A path to a single- or collection-valued navigation property'
            },
            'target': {
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description': 'A path to a collection-valued navigation property'
            }
        },
        'OpenPropertyTypeConstraint': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Validation.V1.SingleOrCollectionType',
            '$AppliesTo': ['ComplexType', 'EntityType'],
            '@Org.OData.Core.V1.Description':
                'Dynamic properties added to the annotated open structured type are restricted to the listed types.'
        },
        'DerivedTypeConstraint': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Validation.V1.SingleOrCollectionType',
            '$AppliesTo': [
                'EntitySet',
                'Singleton',
                'NavigationProperty',
                'Property',
                'TypeDefinition',
                'Parameter',
                'ReturnType'
            ],
            '@Org.OData.Core.V1.Description':
                'Values are restricted to types that are both identical to or derived from the declared type and a type listed in this collection.',
            '@Org.OData.Core.V1.LongDescription':
                'This allows restricting values to certain sub-trees of an inheritance hierarchy,\n          including hierarchies starting at the [Built-In Abstract Types](https://docs.oasis-open.org/odata/odata-csdl-json/v4.01/odata-csdl-json-v4.01.html#sec_BuiltInAbstractTypes).\n          Types listed in this collection are ignored if they are not derived from the declared type of the annotated model element\n          or would not be allowed as declared type of the annotated model element.\n\n          When applied to a collection-valued element, this annotation specifies the types allowed for members\n          of the collection without mentioning the `Collection()` wrapper.\n          The SingleOrCollectionType may only include the `Collection()` wrapper\n          if the annotation is applied to an element with declared type `Edm.Untyped`.'
        },
        'SingleOrCollectionType': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description':
                'The qualified name of a type in scope, optionally wrapped in `Collection()` to denote a collection of instances of the type'
        },
        'AllowedTerms': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Core.V1.QualifiedTermName',
            '$AppliesTo': ['Term', 'Property'],
            '@Org.OData.Core.V1.Description':
                'Annotate a term of type Edm.AnnotationPath, or a property of type Edm.AnnotationPath that is used within a structured term, to restrict the terms that can be targeted by the path.',
            '@Org.OData.Core.V1.LongDescription':
                'The annotation path expression is intended to end in a path segment with one of the listed terms. For forward compatibility, clients should be prepared for the annotation to reference terms besides those listed.',
            '@Org.OData.Core.V1.RequiresType': 'Edm.AnnotationPath'
        },
        'ApplicableTerms': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Org.OData.Core.V1.QualifiedTermName',
            '@Org.OData.Core.V1.Description':
                'Names of specific terms that are applicable and may be applied in the current context. This annotation does not restrict the use of other terms.'
        },
        'MaxItems': {
            '$Kind': 'Term',
            '$Type': 'Edm.Int64',
            '$AppliesTo': ['Collection'],
            '@Org.OData.Core.V1.Description':
                'The annotated collection must have at most the specified number of items.'
        },
        'MinItems': {
            '$Kind': 'Term',
            '$Type': 'Edm.Int64',
            '$AppliesTo': ['Collection'],
            '@Org.OData.Core.V1.Description':
                'The annotated collection must have at least the specified number of items.'
        }
    }
} as CSDL;
