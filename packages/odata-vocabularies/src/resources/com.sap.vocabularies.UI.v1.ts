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
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Aggregation.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.Aggregation.V1',
                    '$Alias': 'Aggregation'
                }
            ]
        },
        'https://sap.github.io/odata-vocabularies/vocabularies/Communication.json': {
            '$Include': [
                {
                    '$Namespace': 'com.sap.vocabularies.Communication.v1',
                    '$Alias': 'Communication'
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
        'https://sap.github.io/odata-vocabularies/vocabularies/HTML5.json': {
            '$Include': [
                {
                    '$Namespace': 'com.sap.vocabularies.HTML5.v1',
                    '$Alias': 'HTML5'
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
    'com.sap.vocabularies.UI.v1': {
        '$Alias': 'UI',
        '@Org.OData.Core.V1.Description': 'Terms for presenting data in user interfaces',
        '@Org.OData.Core.V1.LongDescription':
            'The SAP UI Vocabulary aims to optimize usage of data in UI channels.\nIt focuses on usage patterns of data in UIs, not on UI patterns, and it is completely independent of the\nUI technologies or devices used to visualize the data.\n\nThese usage patterns represent certain semantic views on business data, some of them very general,\nothers centering around the concept of a Thing, i.e. something tangible to end users.\nExamples for Things are semantic object instances or business object instances.\nOne example for a usage pattern is the collection of properties which helps the user to identify a Thing,\nthe [UI.Identification](#Identification) term.\nAnother example is the [UI.LineItem](#LineItem) term, which is a set of properties suitable for visualizing\na collection of business object instances, e.g. as a list or table.',
        '@Org.OData.Core.V1.Description#Published': '2019-02-14 © Copyright 2013 SAP SE. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/UI.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/UI.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/UI.md'
            }
        ],
        'HeaderInfo': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.HeaderInfoType',
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true,
            '@Org.OData.Core.V1.Description':
                'Information for the header area of an entity representation. HeaderInfo is mandatory for main entity types of the model'
        },
        'HeaderInfoType': {
            '$Kind': 'ComplexType',
            'TypeName': {
                '@Org.OData.Core.V1.IsLanguageDependent': true,
                '@Org.OData.Core.V1.Description': 'Name of the main entity type'
            },
            'TypeNamePlural': {
                '@Org.OData.Core.V1.IsLanguageDependent': true,
                '@Org.OData.Core.V1.Description': 'Plural form of the name of the main entity type'
            },
            'Title': {
                '$Type': 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Title, e.g. for overview pages',
                '@Org.OData.Core.V1.LongDescription':
                    'This can be a [DataField](#DataField) and any of its children, or a [DataFieldForAnnotation](#DataFieldForAnnotation) targeting [ConnectedFields](#ConnectedFields).',
                '@Org.OData.Validation.V1.DerivedTypeConstraint': [
                    'com.sap.vocabularies.UI.v1.DataField',
                    'com.sap.vocabularies.UI.v1.DataFieldForAnnotation'
                ]
            },
            'Description': {
                '$Type': 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Description, e.g. for overview pages',
                '@Org.OData.Core.V1.LongDescription':
                    'This can be a [DataField](#DataField) and any of its children, or a [DataFieldForAnnotation](#DataFieldForAnnotation) targeting [ConnectedFields](#ConnectedFields).',
                '@Org.OData.Validation.V1.DerivedTypeConstraint': [
                    'com.sap.vocabularies.UI.v1.DataField',
                    'com.sap.vocabularies.UI.v1.DataFieldForAnnotation'
                ]
            },
            'Image': {
                '$Type': 'Edm.Stream',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'Image for an instance of the entity type. If the property has a valid value, it can be used for the visualization of the instance. If it is not available or not valid the value of the property `ImageUrl` can be used instead.'
            },
            'ImageUrl': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Core.V1.Description':
                    'Image URL for an instance of the entity type. If the property has a valid value, it can be used for the visualization of the instance. If it is not available or not valid the value of the property `TypeImageUrl` can be used instead.'
            },
            'TypeImageUrl': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Core.V1.Description': 'Image URL for the entity type'
            },
            'Initials': {
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'Latin letters to be used in case no `Image`, `ImageUrl`, or `TypeImageUrl` is present'
            }
        },
        'Identification': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true,
            '@Org.OData.Core.V1.Description': 'Collection of fields identifying the object'
        },
        'Badge': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.BadgeType',
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true,
            '@Org.OData.Core.V1.Description': 'Information usually displayed in the form of a business card'
        },
        'BadgeType': {
            '$Kind': 'ComplexType',
            'HeadLine': {
                '$Type': 'com.sap.vocabularies.UI.v1.DataField',
                '@Org.OData.Core.V1.Description': 'Headline'
            },
            'Title': {
                '$Type': 'com.sap.vocabularies.UI.v1.DataField',
                '@Org.OData.Core.V1.Description': 'Title'
            },
            'ImageUrl': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Core.V1.Description':
                    'Image URL for an instance of the entity type. If the property has a valid value, it can be used for the visualization of the instance. If it is not available or not valid the value of the property `TypeImageUrl` can be used instead.'
            },
            'TypeImageUrl': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Core.V1.Description': 'Image URL for the entity type'
            },
            'MainInfo': {
                '$Type': 'com.sap.vocabularies.UI.v1.DataField',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Main information on the business card'
            },
            'SecondaryInfo': {
                '$Type': 'com.sap.vocabularies.UI.v1.DataField',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Additional information on the business card'
            }
        },
        'LineItem': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Collection of data fields for representation in a table or list',
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true
        },
        'StatusInfo': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Collection of data fields describing the status of an entity',
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true
        },
        'FieldGroup': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.FieldGroupType',
            '$AppliesTo': ['EntityType', 'Action', 'Function', 'ActionImport', 'FunctionImport'],
            '@Org.OData.Core.V1.Description': 'Group of fields with an optional label',
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true
        },
        'FieldGroupType': {
            '$Kind': 'ComplexType',
            'Label': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsLanguageDependent': true,
                '@Org.OData.Core.V1.Description': 'Label for the field group'
            },
            'Data': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
                '@Org.OData.Core.V1.Description': 'Collection of data fields'
            }
        },
        'ConnectedFields': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.ConnectedFieldsType',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description':
                'Group of semantically connected fields with a representation template and an optional label',
            '@Org.OData.Core.V1.Example': {
                '@com.sap.vocabularies.UI.v1.ConnectedFields#Material': {
                    'Label': 'Material',
                    'Template': '{MaterialName} - {MaterialClassName}',
                    'Data': {
                        'MaterialName': {
                            '@type': '#UI.DataField',
                            'Value': {
                                '$Path': 'Material'
                            }
                        },
                        'MaterialClassName': {
                            '@type': '#UI.DataField',
                            'Value': {
                                '$Path': 'MaterialClass'
                            }
                        }
                    }
                }
            }
        },
        'ConnectedFieldsType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description':
                'Group of semantically connected fields with a representation template and an optional label',
            'Label': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsLanguageDependent': true,
                '@Org.OData.Core.V1.Description': 'Label for the connected fields'
            },
            'Template': {
                '@Org.OData.Core.V1.IsLanguageDependent': true,
                '@Org.OData.Core.V1.Description': 'Template for representing the connected fields',
                '@Org.OData.Core.V1.LongDescription':
                    'Template variables are identifiers enclosed in curly braces, e.g. `{MaterialName} - {MaterialClassName}`. The `Data` collection assigns values to the template variables.'
            },
            'Data': {
                '$Type': 'Org.OData.Core.V1.Dictionary',
                '@Org.OData.Validation.V1.OpenPropertyTypeConstraint': ['com.sap.vocabularies.UI.v1.DataFieldAbstract'],
                '@Org.OData.Core.V1.Description': 'Dictionary of template variables',
                '@Org.OData.Core.V1.LongDescription':
                    'Each template variable used in `Template` must be assigned a value here. The value must be of type [DataFieldAbstract](#DataFieldAbstract)'
            }
        },
        'GeoLocations': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.UI.v1.GeoLocationType',
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true,
            '@Org.OData.Core.V1.Description': 'Collection of geographic locations'
        },
        'GeoLocation': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.GeoLocationType',
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true,
            '@Org.OData.Core.V1.Description': 'Geographic location'
        },
        'GeoLocationType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Properties that define a geographic location',
            'Latitude': {
                '$Type': 'Edm.Double',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Geographic latitude'
            },
            'Longitude': {
                '$Type': 'Edm.Double',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Geographic longitude'
            },
            'Location': {
                '$Type': 'Edm.GeographyPoint',
                '$Nullable': true,
                '$SRID': 'variable',
                '@Org.OData.Core.V1.Description': 'A point in a round-earth coordinate system'
            },
            'Address': {
                '$Type': 'com.sap.vocabularies.Communication.v1.AddressType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'vCard-style address'
            }
        },
        'Contacts': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Edm.AnnotationPath',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Collection of contacts',
            '@Org.OData.Core.V1.LongDescription':
                'Each collection item MUST reference an annotation of a Communication.Contact',
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true,
            '@Org.OData.Validation.V1.AllowedTerms': ['com.sap.vocabularies.Communication.v1.Contact']
        },
        'MediaResource': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.MediaResourceType',
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true,
            '@Org.OData.Core.V1.Description': 'Properties that describe a media resource',
            '@Org.OData.Core.V1.LongDescription': 'Either `Url` or `Stream` MUST be present, and never both.'
        },
        'MediaResourceType': {
            '$Kind': 'ComplexType',
            'Url': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'URL of media resource',
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.HTML5.v1.LinkTarget']
            },
            'Stream': {
                '$Type': 'Edm.Stream',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description': 'Stream of media resource',
                '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.HTML5.v1.LinkTarget']
            },
            'ContentType': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Content type, such as application/pdf, video/x-flv, image/jpeg',
                '@Org.OData.Core.V1.IsMediaType': true
            },
            'ByteSize': {
                '$Type': 'Edm.Int64',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Resource size in bytes'
            },
            'ChangedAt': {
                '$Type': 'Edm.DateTimeOffset',
                '$Nullable': true,
                '$Precision': 0,
                '@Org.OData.Core.V1.Description': 'Date of last change'
            },
            'Thumbnail': {
                '$Type': 'com.sap.vocabularies.UI.v1.ImageType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Thumbnail image'
            },
            'Title': {
                '$Type': 'com.sap.vocabularies.UI.v1.DataField',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Resource title'
            },
            'Description': {
                '$Type': 'com.sap.vocabularies.UI.v1.DataField',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Resource description'
            }
        },
        'ImageType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Properties that describe an image',
            '@Org.OData.Core.V1.LongDescription': 'Either `Url` or `Stream` MUST be present, and never both.',
            'Url': {
                '@Org.OData.Core.V1.Description': 'URL of image',
                '@Org.OData.Core.V1.IsURL': true
            },
            'Stream': {
                '$Type': 'Edm.Stream',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description': 'Stream of image',
                '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.HTML5.v1.LinkTarget']
            },
            'Width': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Width of image'
            },
            'Height': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Height of image'
            }
        },
        'DataPoint': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.DataPointType',
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true,
            '@Org.OData.Core.V1.Description':
                'Visualization of a single point of data, typically a number; may also be textual, e.g. a status value'
        },
        'DataPointType': {
            '$Kind': 'ComplexType',
            'Title': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Title of the data point',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'Description': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Short description',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'LongDescription': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Full description',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'Value': {
                '$Type': 'Edm.PrimitiveType',
                '@Org.OData.Core.V1.Description': 'Numeric value',
                '@Org.OData.Core.V1.LongDescription':
                    "\nThe value is typically provided via a `Path` construct. The path MUST lead to a direct property of the same entity type or a property of a complex property (recursively) of that entity type, navigation segments are not allowed.\n\nIt could be annotated with either `UoM.ISOCurrency` or `UoM.Unit`.\nPercentage values are annotated with `UoM.Unit = '%'`.\nA renderer should take an optional `Common.Text` annotation into consideration.\n            "
            },
            'TargetValue': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Target value'
            },
            'ForecastValue': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Forecast value'
            },
            'MinimumValue': {
                '$Type': 'Edm.Decimal',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Minimum value (for output rendering)'
            },
            'MaximumValue': {
                '$Type': 'Edm.Decimal',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Maximum value (for output rendering)'
            },
            'ValueFormat': {
                '$Type': 'com.sap.vocabularies.UI.v1.NumberFormat',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Number format'
            },
            'Visualization': {
                '$Type': 'com.sap.vocabularies.UI.v1.VisualizationType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Preferred visualization'
            },
            'SampleSize': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    '\n              Sample size used for the determination of the data point; should contain just integer value as Edm.Byte, Edm.SByte, Edm.Intxx, and Edm.Decimal with scale 0.\n            '
            },
            'ReferencePeriod': {
                '$Type': 'com.sap.vocabularies.UI.v1.ReferencePeriod',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Reference period'
            },
            'Criticality': {
                '$Type': 'com.sap.vocabularies.UI.v1.CriticalityType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Service-calculated criticality, alternative to CriticalityCalculation'
            },
            'CriticalityLabels': {
                '$Type': 'Edm.AnnotationPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Custom labels for the criticality legend. Annotation path MUST end in UI.CriticalityLabels',
                '@Org.OData.Validation.V1.AllowedTerms': ['com.sap.vocabularies.UI.v1.CriticalityLabels']
            },
            'CriticalityRepresentation': {
                '$Type': 'com.sap.vocabularies.UI.v1.CriticalityRepresentationType',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description': 'Decides if criticality is visualized in addition by means of an icon'
            },
            'CriticalityCalculation': {
                '$Type': 'com.sap.vocabularies.UI.v1.CriticalityCalculationType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Parameters for client-calculated criticality, alternative to Criticality'
            },
            'Trend': {
                '$Type': 'com.sap.vocabularies.UI.v1.TrendType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Service-calculated trend, alternative to TrendCalculation'
            },
            'TrendCalculation': {
                '$Type': 'com.sap.vocabularies.UI.v1.TrendCalculationType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Parameters for client-calculated trend, alternative to Trend'
            },
            'Responsible': {
                '$Type': 'com.sap.vocabularies.Communication.v1.ContactType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Contact person'
            }
        },
        'NumberFormat': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Describes how to visualise a number',
            'ScaleFactor': {
                '$Type': 'Edm.Decimal',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Display value in *ScaleFactor* units, e.g. 1000 for k (kilo), 1e6 for M (Mega)'
            },
            'NumberOfFractionalDigits': {
                '$Type': 'Edm.Byte',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Number of fractional digits of the scaled value to be visualized'
            }
        },
        'VisualizationType': {
            '$Kind': 'EnumType',
            'Number': 0,
            'Number@Org.OData.Core.V1.Description': 'Visualize as a number',
            'BulletChart': 1,
            'BulletChart@Org.OData.Core.V1.Description': 'Visualize as bullet chart - requires TargetValue',
            'Progress': 2,
            'Progress@Org.OData.Core.V1.Description': 'Visualize as progress indicator - requires TargetValue',
            'Rating': 3,
            'Rating@Org.OData.Core.V1.Description':
                'Visualize as partially or completely filled stars/hearts/... - requires TargetValue',
            'Donut': 4,
            'Donut@Org.OData.Core.V1.Description':
                'Visualize as donut, optionally with missing segment - requires TargetValue',
            'DeltaBulletChart': 5,
            'DeltaBulletChart@Org.OData.Core.V1.Description': 'Visualize as delta bullet chart - requires TargetValue'
        },
        'ReferencePeriod': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Reference period',
            'Description': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Short description of the reference period',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'Start': {
                '$Type': 'Edm.DateTimeOffset',
                '$Nullable': true,
                '$Precision': 0,
                '@Org.OData.Core.V1.Description': 'Start of the reference period'
            },
            'End': {
                '$Type': 'Edm.DateTimeOffset',
                '$Nullable': true,
                '$Precision': 0,
                '@Org.OData.Core.V1.Description': 'End of the reference period'
            }
        },
        'CriticalityType': {
            '$Kind': 'EnumType',
            '@Org.OData.Core.V1.Description':
                'Criticality of a value or status, represented e.g. via semantic colors (https://experience.sap.com/fiori-design-web/foundation/colors/#semantic-colors)',
            'VeryNegative': -1,
            'VeryNegative@com.sap.vocabularies.Common.v1.Experimental': true,
            'VeryNegative@Org.OData.Core.V1.Description':
                'Very negative / dark-red status - risk - out of stock - late',
            'Neutral': 0,
            'Neutral@Org.OData.Core.V1.Description': 'Neutral / grey status - inactive - open - in progress',
            'Negative': 1,
            'Negative@Org.OData.Core.V1.Description': 'Negative / red status - attention - overload - alert',
            'Critical': 2,
            'Critical@Org.OData.Core.V1.Description': 'Critical / orange status - warning',
            'Positive': 3,
            'Positive@Org.OData.Core.V1.Description':
                'Positive / green status - completed - available - on track - acceptable',
            'VeryPositive': 4,
            'VeryPositive@com.sap.vocabularies.Common.v1.Experimental': true,
            'VeryPositive@Org.OData.Core.V1.Description': 'Very positive - above max stock - excess',
            'Information': 5,
            'Information@com.sap.vocabularies.Common.v1.Experimental': true,
            'Information@Org.OData.Core.V1.Description': 'Information - noticable - informative'
        },
        'CriticalityCalculationType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.CriticalityThresholdsType',
            '@Org.OData.Core.V1.Description':
                'Describes how to calculate the criticality of a value depending on the improvement direction',
            '@Org.OData.Core.V1.LongDescription':
                '\nThe calculation is done by comparing a value to the threshold values relevant for the specified improvement direction.\n\nThe value to be compared is\n  - Value - if ReferenceValue is not specified\n  - Value sub ReferenceValue – if ReferenceValue is specified and IsRelativeDifference is not specified or specified as false\n  - (Value sub ReferenceValue) divBy ReferenceValue – if ReferenceValue is specified and IsRelativeDifference is specified as true\n\nFor improvement direction `Target`, the criticality is calculated using both low and high threshold values. It will be\n  - Positive if the value is greater than or equal to AcceptanceRangeLowValue and lower than or equal to AcceptanceRangeHighValue\n  - Neutral if the value is greater than or equal to ToleranceRangeLowValue and lower than AcceptanceRangeLowValue OR greater than AcceptanceRangeHighValue and lower than or equal to ToleranceRangeHighValue\n  - Critical if the value is greater than or equal to DeviationRangeLowValue and lower than ToleranceRangeLowValue OR greater than ToleranceRangeHighValue  and lower than or equal to DeviationRangeHighValue\n  - Negative if the value is lower than DeviationRangeLowValue or greater than DeviationRangeHighValue\n\nFor improvement direction `Minimize`, the criticality is calculated using the high threshold values. It is\n  - Positive if the value is lower than or equal to AcceptanceRangeHighValue\n  - Neutral if the value is  greater than AcceptanceRangeHighValue and lower than or equal to ToleranceRangeHighValue\n  - Critical if the value is greater than ToleranceRangeHighValue and lower than or equal to DeviationRangeHighValue\n  - Negative if the value is greater than DeviationRangeHighValue\n\nFor improvement direction `Maximize`, the criticality is calculated using the low threshold values. It is\n  - Positive if the value is greater than or equal to AcceptanceRangeLowValue\n  - Neutral if the value is less than AcceptanceRangeLowValue and greater than or equal to ToleranceRangeLowValue\n  - Critical if the value is lower than ToleranceRangeLowValue and greater than or equal to DeviationRangeLowValue\n  - Negative if the value is lower than DeviationRangeLowValue\n\nThresholds are optional. For unassigned values, defaults are determined in this order:\n  - For DeviationRange, an omitted LowValue translates into the smallest possible number (-INF), an omitted HighValue translates into the largest possible number (+INF)\n  - For ToleranceRange, an omitted LowValue will be initialized with DeviationRangeLowValue, an omitted HighValue will be initialized with DeviationRangeHighValue\n  - For AcceptanceRange, an omitted LowValue will be initialized with ToleranceRangeLowValue, an omitted HighValue will be initialized with ToleranceRangeHighValue\n          ',
            'ReferenceValue': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'Reference value for the calculation, e.g. number of sales for the last year'
            },
            'IsRelativeDifference': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description': 'Calculate with a relative difference'
            },
            'ImprovementDirection': {
                '$Type': 'com.sap.vocabularies.UI.v1.ImprovementDirectionType',
                '@Org.OData.Core.V1.Description': 'Describes in which direction the value improves'
            },
            'ConstantThresholds': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.LevelThresholdsType',
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'List of thresholds depending on the aggregation level as a set of constant values',
                '@Org.OData.Core.V1.LongDescription':
                    'Constant thresholds shall only be used in order to refine constant values given for the data point overall (aggregation level with empty collection of property paths), but not if the thresholds are based on other measure elements.'
            }
        },
        'CriticalityThresholdsType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Thresholds for calculating the criticality of a value',
            'AcceptanceRangeLowValue': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Lowest value that is considered positive'
            },
            'AcceptanceRangeHighValue': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Highest value that is considered positive'
            },
            'ToleranceRangeLowValue': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Lowest value that is considered neutral'
            },
            'ToleranceRangeHighValue': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Highest value that is considered neutral'
            },
            'DeviationRangeLowValue': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Lowest value that is considered critical'
            },
            'DeviationRangeHighValue': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Highest value that is considered critical'
            }
        },
        'ImprovementDirectionType': {
            '$Kind': 'EnumType',
            '@Org.OData.Core.V1.Description': 'Describes which direction of a value change is seen as an improvement',
            'Minimize': 1,
            'Minimize@Org.OData.Core.V1.Description': 'Lower is better',
            'Target': 2,
            'Target@Org.OData.Core.V1.Description': 'Closer to the target is better',
            'Maximize': 3,
            'Maximize@Org.OData.Core.V1.Description': 'Higher is better'
        },
        'LevelThresholdsType': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.CriticalityThresholdsType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Thresholds for an aggregation level',
            'AggregationLevel': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description':
                    'An unordered tuple of dimensions, i.e. properties which are intended to be used for grouping in aggregating requests. In analytical UIs, e.g. an analytical chart, the aggregation level typically corresponds to the visible dimensions.'
            }
        },
        'TrendType': {
            '$Kind': 'EnumType',
            '@Org.OData.Core.V1.Description': 'The trend of a value',
            'StrongUp': 1,
            'StrongUp@Org.OData.Core.V1.Description': 'Value grows strongly',
            'Up': 2,
            'Up@Org.OData.Core.V1.Description': 'Value grows',
            'Sideways': 3,
            'Sideways@Org.OData.Core.V1.Description': 'Value does not significantly grow or shrink',
            'Down': 4,
            'Down@Org.OData.Core.V1.Description': 'Value shrinks',
            'StrongDown': 5,
            'StrongDown@Org.OData.Core.V1.Description': 'Value shrinks strongly'
        },
        'TrendCalculationType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Describes how to calculate the trend of a value',
            '@Org.OData.Core.V1.LongDescription':
                '\nBy default, the calculation is done by comparing the difference between Value and ReferenceValue to the threshold values.\nIf IsRelativeDifference is set, the difference of Value and ReferenceValue is divided by ReferenceValue and the relative difference is compared.\n\nThe trend is\n  - StrongUp if the difference is greater than or equal to StrongUpDifference\n  - Up if the difference is less than StrongUpDifference and greater than or equal to UpDifference\n  - Sideways if the difference  is less than UpDifference and greater than DownDifference\n  - Down if the difference is greater than StrongDownDifference and lower than or equal to DownDifference\n  - StrongDown if the difference is lower than or equal to StrongDownDifference',
            'ReferenceValue': {
                '$Type': 'Edm.PrimitiveType',
                '@Org.OData.Core.V1.Description':
                    'Reference value for the calculation, e.g. number of sales for the last year'
            },
            'IsRelativeDifference': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Calculate with a relative difference'
            },
            'UpDifference': {
                '$Type': 'Edm.Decimal',
                '@Org.OData.Core.V1.Description': 'Threshold for Up'
            },
            'StrongUpDifference': {
                '$Type': 'Edm.Decimal',
                '@Org.OData.Core.V1.Description': 'Threshold for StrongUp'
            },
            'DownDifference': {
                '$Type': 'Edm.Decimal',
                '@Org.OData.Core.V1.Description': 'Threshold for Down'
            },
            'StrongDownDifference': {
                '$Type': 'Edm.Decimal',
                '@Org.OData.Core.V1.Description': 'Threshold for StrongDown'
            }
        },
        'KPI': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.KPIType',
            '$AppliesTo': ['EntitySet', 'EntityType'],
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true,
            '@Org.OData.Core.V1.Description':
                'A Key Performance Indicator (KPI) bundles a SelectionVariant and a DataPoint, and provides details for progressive disclosure'
        },
        'KPIType': {
            '$Kind': 'ComplexType',
            'ID': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Optional identifier to reference this instance from an external context'
            },
            'ShortDescription': {
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description': 'Very short description',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'SelectionVariant': {
                '$Type': 'com.sap.vocabularies.UI.v1.SelectionVariantType',
                '@Org.OData.Core.V1.Description':
                    'Selection variant, either specified inline or referencing another annotation via Path'
            },
            'DataPoint': {
                '$Type': 'com.sap.vocabularies.UI.v1.DataPointType',
                '@Org.OData.Core.V1.Description':
                    'Data point, either specified inline or referencing another annotation via Path'
            },
            'AdditionalDataPoints': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.DataPointType',
                '@Org.OData.Core.V1.Description':
                    'Additional data points, either specified inline or referencing another annotation via Path',
                '@Org.OData.Core.V1.LongDescription':
                    'Additional data points are typically related to the main data point and provide complementing information or could be used for comparisons'
            },
            'Detail': {
                '$Type': 'com.sap.vocabularies.UI.v1.KPIDetailType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Contains information about KPI details, especially drill-down presentations'
            }
        },
        'KPIDetailType': {
            '$Kind': 'ComplexType',
            'DefaultPresentationVariant': {
                '$Type': 'com.sap.vocabularies.UI.v1.PresentationVariantType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Presentation variant, either specified inline or referencing another annotation via Path'
            },
            'AlternativePresentationVariants': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.PresentationVariantType',
                '@Org.OData.Core.V1.Description':
                    'A list of alternative presentation variants, either specified inline or referencing another annotation via Path'
            },
            'SemanticObject': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Name of the Semantic Object. If not specified, use Semantic Object annotated at the property referenced in KPI/DataPoint/Value'
            },
            'Action': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Name of the Action on the Semantic Object. If not specified, let user choose which of the available actions to trigger.'
            }
        },
        'Chart': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.ChartDefinitionType',
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true,
            '@Org.OData.Core.V1.Description': 'Visualization of multiple data points'
        },
        'ChartDefinitionType': {
            '$Kind': 'ComplexType',
            'Title': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Title of the chart',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'Description': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Short description',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'ChartType': {
                '$Type': 'com.sap.vocabularies.UI.v1.ChartType',
                '@Org.OData.Core.V1.Description': 'Chart type'
            },
            'AxisScaling': {
                '$Type': 'com.sap.vocabularies.UI.v1.ChartAxisScalingType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Describes the scale of the chart value axes'
            },
            'Measures': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@com.sap.vocabularies.Common.v1.PrimitivePropertyPath': true,
                '@Org.OData.Core.V1.Description': 'Measures of the chart, e.g. size and color in a bubble chart'
            },
            'DynamicMeasures': {
                '$Collection': true,
                '$Type': 'Edm.AnnotationPath',
                '@Org.OData.Core.V1.Description':
                    'Dynamic properties introduced by annotations and used as measures of the chart',
                '@Org.OData.Core.V1.LongDescription':
                    'If the annotation referenced by an annotation path does not apply to the same collection of entities\n            as the one being visualized according to the `UI.Chart` annotation, the annotation path MUST be silently ignored.',
                '@Org.OData.Validation.V1.AllowedTerms': [
                    'com.sap.vocabularies.Analytics.v1.AggregatedProperty',
                    'Org.OData.Aggregation.V1.CustomAggregate'
                ]
            },
            'MeasureAttributes': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.ChartMeasureAttributeType',
                '@Org.OData.Core.V1.Description':
                    'Describes Attributes for Measures. All Measures used in this collection must also be part of the Measures Property.'
            },
            'Dimensions': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Dimensions of the chart, e.g. x- and y-axis of a bubble chart'
            },
            'DimensionAttributes': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.ChartDimensionAttributeType',
                '@Org.OData.Core.V1.Description':
                    'Describes Attributes for Dimensions. All Dimensions used in this collection must also be part of the Dimensions Property.'
            },
            'Actions': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
                '@Org.OData.Core.V1.Description': 'Available actions and action groups',
                '@Org.OData.Validation.V1.DerivedTypeConstraint': [
                    'com.sap.vocabularies.UI.v1.DataFieldForActionAbstract',
                    'com.sap.vocabularies.UI.v1.DataFieldForActionGroup'
                ]
            }
        },
        'ChartType': {
            '$Kind': 'EnumType',
            'Column': 0,
            'ColumnStacked': 1,
            'ColumnDual': 2,
            'ColumnStackedDual': 3,
            'ColumnStacked100': 4,
            'ColumnStackedDual100': 5,
            'Bar': 6,
            'BarStacked': 7,
            'BarDual': 8,
            'BarStackedDual': 9,
            'BarStacked100': 10,
            'BarStackedDual100': 11,
            'Area': 12,
            'AreaStacked': 13,
            'AreaStacked100': 14,
            'HorizontalArea': 15,
            'HorizontalAreaStacked': 16,
            'HorizontalAreaStacked100': 17,
            'Line': 18,
            'LineDual': 19,
            'Combination': 20,
            'CombinationStacked': 21,
            'CombinationDual': 22,
            'CombinationStackedDual': 23,
            'HorizontalCombinationStacked': 24,
            'Pie': 25,
            'Donut': 26,
            'Scatter': 27,
            'Bubble': 28,
            'Radar': 29,
            'HeatMap': 30,
            'TreeMap': 31,
            'Waterfall': 32,
            'Bullet': 33,
            'VerticalBullet': 34,
            'HorizontalWaterfall': 35,
            'HorizontalCombinationDual': 36,
            'HorizontalCombinationStackedDual': 37,
            'Donut100': 38,
            'Donut100@com.sap.vocabularies.Common.v1.Experimental': true
        },
        'ChartAxisScalingType': {
            '$Kind': 'ComplexType',
            'ScaleBehavior': {
                '$Type': 'com.sap.vocabularies.UI.v1.ChartAxisScaleBehaviorType',
                '$DefaultValue': 'AutoScale',
                '@Org.OData.Core.V1.Description': 'Scale is fixed or adapts automatically to rendered values'
            },
            'AutoScaleBehavior': {
                '$Type': 'com.sap.vocabularies.UI.v1.ChartAxisAutoScaleBehaviorType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Settings for automatic scaling'
            },
            'FixedScaleMultipleStackedMeasuresBoundaryValues': {
                '$Type': 'com.sap.vocabularies.UI.v1.FixedScaleMultipleStackedMeasuresBoundaryValuesType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Boundary values for fixed scaling of a stacking chart type with multiple measures'
            }
        },
        'ChartAxisScaleBehaviorType': {
            '$Kind': 'EnumType',
            'AutoScale': 0,
            'AutoScale@Org.OData.Core.V1.Description': 'Value axes scale automatically',
            'FixedScale': 1,
            'FixedScale@Org.OData.Core.V1.Description':
                'Fixed minimum and maximum values are applied, which are derived from the @UI.MeasureAttributes.DataPoint/MinimumValue and .../MaximumValue annotation by default.\n        For stacking chart types with multiple measures, they are taken from ChartAxisScalingType/FixedScaleMultipleStackedMeasuresBoundaryValues.\n            '
        },
        'ChartAxisAutoScaleBehaviorType': {
            '$Kind': 'ComplexType',
            'ZeroAlwaysVisible': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'Forces the value axis to always display the zero value'
            },
            'DataScope': {
                '$Type': 'com.sap.vocabularies.UI.v1.ChartAxisAutoScaleDataScopeType',
                '$DefaultValue': 'DataSet',
                '@Org.OData.Core.V1.Description': 'Determines the automatic scaling'
            }
        },
        'ChartAxisAutoScaleDataScopeType': {
            '$Kind': 'EnumType',
            'DataSet': 0,
            'DataSet@Org.OData.Core.V1.Description':
                'Minimum and maximum axes values are determined from the entire data set',
            'VisibleData': 1,
            'VisibleData@Org.OData.Core.V1.Description':
                'Minimum and maximum axes values are determined from the currently visible data. Scrolling will change the scale.'
        },
        'FixedScaleMultipleStackedMeasuresBoundaryValuesType': {
            '$Kind': 'ComplexType',
            'MinimumValue': {
                '$Type': 'Edm.Decimal',
                '@Org.OData.Core.V1.Description': 'Minimum value on value axes'
            },
            'MaximumValue': {
                '$Type': 'Edm.Decimal',
                '@Org.OData.Core.V1.Description': 'Maximum value on value axes'
            }
        },
        'ChartDimensionAttributeType': {
            '$Kind': 'ComplexType',
            'Dimension': {
                '$Type': 'Edm.PropertyPath',
                '$Nullable': true
            },
            'Role': {
                '$Type': 'com.sap.vocabularies.UI.v1.ChartDimensionRoleType',
                '$Nullable': true
            },
            'HierarchyLevel': {
                '$Type': 'Edm.Int32',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'For a dimension with a hierarchy, members are selected from this level. The root node of the hierarchy is at level 0.'
            },
            'ValuesForSequentialColorLevels': {
                '$Collection': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'All values in this collection should be assigned to levels of the same color.'
            },
            'EmphasizedValues': {
                '$Collection': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description': 'All values in this collection should be emphasized.'
            },
            'EmphasisLabels': {
                '$Type': 'com.sap.vocabularies.UI.v1.EmphasisLabelType',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'Assign a label to values with an emphasized representation. This is required, if more than one emphasized value has been specified.'
            }
        },
        'ChartMeasureAttributeType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Exactly one of `Measure` and `DynamicMeasure` must be present',
            'Measure': {
                '$Type': 'Edm.PropertyPath',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.PrimitivePropertyPath': true
            },
            'DynamicMeasure': {
                '$Type': 'Edm.AnnotationPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Dynamic property introduced by an annotation and used as a measure in a chart',
                '@Org.OData.Core.V1.LongDescription':
                    'If the annotation referenced by an annotation path does not apply to the same collection of entities\n            as the one being visualized according to the `UI.Chart` annotation, the annotation path MUST be silently ignored.',
                '@Org.OData.Validation.V1.AllowedTerms': [
                    'com.sap.vocabularies.Analytics.v1.AggregatedProperty',
                    'Org.OData.Aggregation.V1.CustomAggregate'
                ]
            },
            'Role': {
                '$Type': 'com.sap.vocabularies.UI.v1.ChartMeasureRoleType',
                '$Nullable': true
            },
            'DataPoint': {
                '$Type': 'Edm.AnnotationPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    "Annotation path MUST end in @UI.DataPoint and the data point's Value MUST be the same property as in Measure",
                '@Org.OData.Validation.V1.AllowedTerms': ['com.sap.vocabularies.UI.v1.DataPoint']
            },
            'UseSequentialColorLevels': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'All measures for which this setting is true should be assigned to levels of the same color.'
            }
        },
        'ChartDimensionRoleType': {
            '$Kind': 'EnumType',
            'Category': 0,
            'Series': 1,
            'Category2': 2
        },
        'ChartMeasureRoleType': {
            '$Kind': 'EnumType',
            'Axis1': 0,
            'Axis2': 1,
            'Axis3': 2
        },
        'EmphasisLabelType': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Assigns a label to the set of emphasized values and optionally also for non-emphasized values. This information can be used for semantic coloring.',
            'EmphasizedValuesLabel': {},
            'NonEmphasizedValuesLabel': {
                '$Nullable': true
            }
        },
        'ValueCriticality': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.UI.v1.ValueCriticalityType',
            '$AppliesTo': ['Property', 'TypeDefinition'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Assign criticalities to primitive values. This information can be used for semantic coloring.'
        },
        'ValueCriticalityType': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Assigns a fixed criticality to a primitive value. This information can be used for semantic coloring.',
            'Value': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'MUST be a fixed value of primitive type'
            },
            'Criticality': {
                '$Type': 'com.sap.vocabularies.UI.v1.CriticalityType',
                '$Nullable': true
            }
        },
        'CriticalityLabels': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.UI.v1.CriticalityLabelType',
            '$AppliesTo': ['Property', 'EntityType', 'TypeDefinition'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                '\n              Assign labels to criticalities. This information can be used for semantic coloring.\n              When applied to a property, a label for a criticality must be provided, if more than one value of the annotated property has been assigned to the same criticality.\n              There must be no more than one label per criticality.\n          '
        },
        'CriticalityLabelType': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Assigns a label to a criticality. This information can be used for semantic coloring.',
            'Criticality': {
                '$Type': 'com.sap.vocabularies.UI.v1.CriticalityType'
            },
            'Label': {
                '@Org.OData.Core.V1.IsLanguageDependent': true,
                '@Org.OData.Core.V1.Description': 'Criticality label'
            }
        },
        'SelectionFields': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'Edm.PropertyPath',
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true,
            '@Org.OData.Core.V1.Description':
                'Properties that might be relevant for filtering a collection of entities of this type'
        },
        'Facets': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.UI.v1.Facet',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Collection of facets'
        },
        'HeaderFacets': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.UI.v1.Facet',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Facets for additional object header information'
        },
        'QuickViewFacets': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.UI.v1.Facet',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Facets that may be used for a quick overview of the object'
        },
        'QuickCreateFacets': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.UI.v1.Facet',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'Facets that may be used for a (quick) create of the object'
        },
        'FilterFacets': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.UI.v1.ReferenceFacet',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description':
                'Facets that reference UI.FieldGroup annotations to group filterable fields'
        },
        'OperationParameterFacets': {
            '$Kind': 'Term',
            '$Collection': true,
            '$Type': 'com.sap.vocabularies.UI.v1.ReferenceFacet',
            '$AppliesTo': ['Action', 'Function', 'ActionImport', 'FunctionImport'],
            '@Org.OData.Core.V1.Description':
                'Facets that reference UI.FieldGroup annotations to group action or function parameters'
        },
        'Facet': {
            '$Kind': 'ComplexType',
            '$Abstract': true,
            '@Org.OData.Core.V1.Description': 'Abstract base type for facets',
            '@Org.OData.Validation.V1.ApplicableTerms': [
                'com.sap.vocabularies.UI.v1.Hidden',
                'com.sap.vocabularies.UI.v1.PartOfPreview'
            ],
            'Label': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsLanguageDependent': true,
                '@Org.OData.Core.V1.Description': 'Facet label'
            },
            'ID': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Unique identifier of a facet. ID should be stable, as long as the perceived semantics of the facet is unchanged.'
            }
        },
        'CollectionFacet': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.Facet',
            '@Org.OData.Core.V1.Description': 'Collection of facets',
            'Facets': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.Facet',
                '@Org.OData.Core.V1.Description':
                    'Nested facets. An empty collection may be used as a placeholder for content added via extension points.'
            }
        },
        'ReferenceFacet': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.Facet',
            '@Org.OData.Core.V1.Description': 'Facet that refers to a thing perspective, e.g. LineItem',
            'Target': {
                '$Type': 'Edm.AnnotationPath',
                '@Org.OData.Core.V1.Description':
                    'Referenced information: Communication.Contact, Communication.Address, or a term that is tagged with UI.ThingPerspective, e.g. UI.StatusInfo, UI.LineItem, UI.Identification, UI.FieldGroup, UI.Badge',
                '@Org.OData.Validation.V1.AllowedTerms': [
                    'com.sap.vocabularies.Communication.v1.Address',
                    'com.sap.vocabularies.Communication.v1.Contact',
                    'com.sap.vocabularies.UI.v1.Badge',
                    'com.sap.vocabularies.UI.v1.Chart',
                    'com.sap.vocabularies.UI.v1.Contacts',
                    'com.sap.vocabularies.UI.v1.DataPoint',
                    'com.sap.vocabularies.UI.v1.FieldGroup',
                    'com.sap.vocabularies.UI.v1.GeoLocation',
                    'com.sap.vocabularies.UI.v1.GeoLocations',
                    'com.sap.vocabularies.UI.v1.HeaderInfo',
                    'com.sap.vocabularies.UI.v1.Identification',
                    'com.sap.vocabularies.UI.v1.KPI',
                    'com.sap.vocabularies.UI.v1.LineItem',
                    'com.sap.vocabularies.UI.v1.MediaResource',
                    'com.sap.vocabularies.UI.v1.Note',
                    'com.sap.vocabularies.UI.v1.PresentationVariant',
                    'com.sap.vocabularies.UI.v1.SelectionFields',
                    'com.sap.vocabularies.UI.v1.SelectionPresentationVariant',
                    'com.sap.vocabularies.UI.v1.StatusInfo'
                ]
            }
        },
        'ReferenceURLFacet': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.Facet',
            '@Org.OData.Core.V1.Description': 'Facet that refers to a URL',
            'Url': {
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Core.V1.Description': 'URL of referenced information',
                '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.HTML5.v1.LinkTarget']
            },
            'UrlContentType': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsMediaType': true,
                '@Org.OData.Core.V1.Description': 'Media type of referenced information'
            }
        },
        'SelectionPresentationVariant': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.SelectionPresentationVariantType',
            '$AppliesTo': ['EntitySet', 'EntityType'],
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true,
            '@Org.OData.Core.V1.Description':
                'A SelectionPresentationVariant bundles a Selection Variant and a Presentation Variant'
        },
        'SelectionPresentationVariantType': {
            '$Kind': 'ComplexType',
            'ID': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Optional identifier to reference this variant from an external context'
            },
            'Text': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsLanguageDependent': true,
                '@Org.OData.Core.V1.Description': 'Name of the bundling variant'
            },
            'SelectionVariant': {
                '$Type': 'com.sap.vocabularies.UI.v1.SelectionVariantType',
                '@Org.OData.Core.V1.Description':
                    'Selection variant, either specified inline or referencing another annotation via Path'
            },
            'PresentationVariant': {
                '$Type': 'com.sap.vocabularies.UI.v1.PresentationVariantType',
                '@Org.OData.Core.V1.Description':
                    'Presentation variant, either specified inline or referencing another annotation via Path'
            }
        },
        'PresentationVariant': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.PresentationVariantType',
            '$AppliesTo': ['EntitySet', 'EntityType'],
            '@com.sap.vocabularies.UI.v1.ThingPerspective': true,
            '@Org.OData.Core.V1.Description':
                'Defines how the result of a queried collection of entities is shaped and how this result is displayed'
        },
        'PresentationVariantType': {
            '$Kind': 'ComplexType',
            'ID': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Optional identifier to reference this variant from an external context'
            },
            'Text': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsLanguageDependent': true,
                '@Org.OData.Core.V1.Description': 'Name of the presentation variant'
            },
            'MaxItems': {
                '$Type': 'Edm.Int32',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Maximum number of items that should be included in the result'
            },
            'SortOrder': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.Common.v1.SortOrderType',
                '@Org.OData.Core.V1.Description':
                    'Collection can be provided inline or as a reference to a Common.SortOrder annotation via Path'
            },
            'GroupBy': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description':
                    'Sequence of groupable properties p1, p2, ... defining how the result is composed of instances representing groups,\n            one for each combination of value properties in the queried collection. The sequence specifies a certain level\n            of aggregation for the queried collection, and every group instance will provide aggregated values for\n            properties that are aggregatable. Moreover, the series of sub-sequences (p1), (p1, p2), ... forms a leveled hierarchy,\n            which may become relevant in combination with `InitialExpansionLevel`.'
            },
            'TotalBy': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description':
                    'Sub-sequence q1, q2, ... of properties p1, p2, ... specified in GroupBy. With this, additional levels of aggregation\n            are requested in addition to the most granular level defined by GroupBy: Every element in the series of sub-sequences\n            (q1), (q1, q2), ... introduces an additional aggregation level included in the result.'
            },
            'Total': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@com.sap.vocabularies.Common.v1.PrimitivePropertyPath': true,
                '@Org.OData.Core.V1.Description':
                    'Aggregatable properties for which aggregated values should be provided for the additional aggregation levels specified in TotalBy.'
            },
            'DynamicTotal': {
                '$Collection': true,
                '$Type': 'Edm.AnnotationPath',
                '@Org.OData.Core.V1.Description':
                    'Dynamic properties introduced by annotations for which aggregated values should be provided for the additional aggregation levels specified in TotalBy',
                '@Org.OData.Core.V1.LongDescription':
                    'If the annotation referenced by an annotation path does not apply to the same collection of entities\n            as the one being presented according to the `UI.PresentationVariant` annotation, the annotation path MUST be silently ignored.',
                '@Org.OData.Validation.V1.AllowedTerms': [
                    'com.sap.vocabularies.Analytics.v1.AggregatedProperty',
                    'Org.OData.Aggregation.V1.CustomAggregate'
                ]
            },
            'IncludeGrandTotal': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description':
                    'Result should include a grand total for the properties specified in Total'
            },
            'InitialExpansionLevel': {
                '$Type': 'Edm.Int32',
                '$DefaultValue': 1,
                '@Org.OData.Core.V1.Description':
                    'Level up to which the hierarchy defined for the queried collection should be expanded initially.\n            The hierarchy may be implicitly imposed by the sequence of the GroupBy, or by an explicit hierarchy annotation.'
            },
            'Visualizations': {
                '$Collection': true,
                '$Type': 'Edm.AnnotationPath',
                '@Org.OData.Core.V1.Description':
                    'Lists available visualization types. Currently supported types are `UI.LineItem`, `UI.Chart`, and `UI.DataPoint`.\n              For each type, no more than a single annotation is meaningful. Multiple instances of the same visualization type\n              shall be modeled with different presentation variants.\n              A reference to `UI.Lineitem` should always be part of the collection (least common denominator for renderers).\n              The first entry of the collection is the default visualization.\n            ',
                '@Org.OData.Validation.V1.AllowedTerms': [
                    'com.sap.vocabularies.UI.v1.Chart',
                    'com.sap.vocabularies.UI.v1.DataPoint',
                    'com.sap.vocabularies.UI.v1.LineItem'
                ]
            },
            'RecursiveHierarchyQualifier': {
                '$Type': 'Org.OData.Aggregation.V1.HierarchyQualifier',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'Qualifier of the recursive hierarchy that should be applied to the Visualization'
            },
            'RequestAtLeast': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description':
                    'Properties that should always be included in the result of the queried collection',
                '@Org.OData.Core.V1.LongDescription':
                    'Properties in `RequestAtLeast` must occur either in the `$select` clause of an OData request\n            or among the grouping properties in an `$apply=groupby((grouping properties),...)` clause of an\n            aggregating OData request.'
            },
            'SelectionFields': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description':
                    'Properties that should be presented for filtering a collection of entities.\n            Can be provided inline or as a reference to a `UI.SelectionFields` annotation via Path.'
            }
        },
        'SelectionVariant': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.SelectionVariantType',
            '$AppliesTo': ['EntitySet', 'EntityType'],
            '@Org.OData.Core.V1.Description':
                'A SelectionVariant denotes a combination of parameters and filters to query the annotated entity set'
        },
        'SelectionVariantType': {
            '$Kind': 'ComplexType',
            'ID': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    ' May contain identifier to reference this instance from an external context'
            },
            'Text': {
                '$Nullable': true,
                '@Org.OData.Core.V1.IsLanguageDependent': true,
                '@Org.OData.Core.V1.Description': 'Name of the selection variant'
            },
            'Parameters': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.ParameterAbstract',
                '@Org.OData.Core.V1.Description': 'Parameters of the selection variant'
            },
            'FilterExpression': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Filter string for query part of URL, without `$filter=`'
            },
            'SelectOptions': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.SelectOptionType',
                '@Org.OData.Core.V1.Description': 'ABAP Select Options Pattern'
            }
        },
        'ParameterAbstract': {
            '$Kind': 'ComplexType',
            '$Abstract': true,
            '@Org.OData.Core.V1.Description': 'Key property of a parameter entity type'
        },
        'Parameter': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.ParameterAbstract',
            '@Org.OData.Core.V1.Description': 'Single-valued parameter',
            'PropertyName': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Path to a key property of a parameter entity type'
            },
            'PropertyValue': {
                '$Type': 'Edm.PrimitiveType',
                '@Org.OData.Core.V1.Description': 'Value for the key property'
            }
        },
        'IntervalParameter': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.ParameterAbstract',
            '@Org.OData.Core.V1.Description': "Interval parameter formed with a 'from' and a 'to' property",
            'PropertyNameFrom': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': "Path to the 'from' property of a parameter entity type"
            },
            'PropertyValueFrom': {
                '$Type': 'Edm.PrimitiveType',
                '@Org.OData.Core.V1.Description': "Value for the 'from' property"
            },
            'PropertyNameTo': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': "Path to the 'to' property of a parameter entity type"
            },
            'PropertyValueTo': {
                '$Type': 'Edm.PrimitiveType',
                '@Org.OData.Core.V1.Description': "Value for the 'to' property"
            }
        },
        'SelectOptionType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'List of value ranges for a single property',
            '@Org.OData.Core.V1.LongDescription':
                'Exactly one of `PropertyName` and `DynamicPropertyName` must be present',
            'PropertyName': {
                '$Type': 'Edm.PropertyPath',
                '$Nullable': true,
                '@com.sap.vocabularies.Common.v1.PrimitivePropertyPath': true,
                '@Org.OData.Core.V1.Description': 'Path to the property',
                '@Org.OData.Core.V1.Revisions': [
                    {
                        'Kind': 'Modified',
                        'Description': 'Now nullable if `DynamicPropertyName` is present'
                    }
                ]
            },
            'DynamicPropertyName': {
                '$Type': 'Edm.AnnotationPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Dynamic property introduced by annotations for which value ranges are specified',
                '@Org.OData.Core.V1.LongDescription':
                    'If the annotation referenced by the annotation path does not apply to the same collection of entities\n            as the one being filtered according to the `UI.SelectionVariant` annotation, this instance of `UI.SelectionVariant/SelectOptions` MUST be silently ignored.\n            For an example, see the `UI.SelectionVariant` annotation in the [example](../examples/DynamicProperties-sample.xml).',
                '@Org.OData.Validation.V1.AllowedTerms': [
                    'com.sap.vocabularies.Analytics.v1.AggregatedProperty',
                    'Org.OData.Aggregation.V1.CustomAggregate'
                ]
            },
            'Ranges': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.SelectionRangeType',
                '@Org.OData.Core.V1.Description': 'List of value ranges'
            }
        },
        'SelectionRangeType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description':
                'Value range. If the range option only requires a single value, the value must be in the property Low',
            'Sign': {
                '$Type': 'com.sap.vocabularies.UI.v1.SelectionRangeSignType',
                '@Org.OData.Core.V1.Description': 'Include or exclude values'
            },
            'Option': {
                '$Type': 'com.sap.vocabularies.UI.v1.SelectionRangeOptionType',
                '@Org.OData.Core.V1.Description': 'Comparison operator'
            },
            'Low': {
                '$Type': 'Edm.PrimitiveType',
                '@Org.OData.Core.V1.Description': 'Single value or lower interval boundary'
            },
            'High': {
                '$Type': 'Edm.PrimitiveType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Upper interval boundary'
            }
        },
        'SelectionRangeSignType': {
            '$Kind': 'EnumType',
            'I': 0,
            'I@Org.OData.Core.V1.Description': 'Inclusive',
            'E': 1,
            'E@Org.OData.Core.V1.Description': 'Exclusive'
        },
        'SelectionRangeOptionType': {
            '$Kind': 'EnumType',
            '@Org.OData.Core.V1.Description': 'Comparison operator',
            'EQ': 0,
            'EQ@Org.OData.Core.V1.Description': 'Equal to',
            'BT': 1,
            'BT@Org.OData.Core.V1.Description': 'Between',
            'CP': 2,
            'CP@Org.OData.Core.V1.Description': 'Contains pattern',
            'LE': 3,
            'LE@Org.OData.Core.V1.Description': 'Less than or equal to',
            'GE': 4,
            'GE@Org.OData.Core.V1.Description': 'Greater than or equal to',
            'NE': 5,
            'NE@Org.OData.Core.V1.Description': 'Not equal to',
            'NB': 6,
            'NB@Org.OData.Core.V1.Description': 'Not between',
            'NP': 7,
            'NP@Org.OData.Core.V1.Description': 'Does not contain pattern',
            'GT': 8,
            'GT@Org.OData.Core.V1.Description': 'Greater than',
            'LT': 9,
            'LT@Org.OData.Core.V1.Description': 'Less than'
        },
        'ThingPerspective': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Term'],
            '@Org.OData.Core.V1.Description': 'The annotated term is a Thing Perspective'
        },
        'IsSummary': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Record'],
            '@Org.OData.Core.V1.Description':
                'This Facet and all included Facets are the summary of the thing. At most one Facet of a thing can be tagged with this term',
            '@Org.OData.Core.V1.RequiresType': 'com.sap.vocabularies.UI.v1.Facet'
        },
        'PartOfPreview': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Record'],
            '@Org.OData.Core.V1.Description':
                'This record and all included structural elements are part of the Thing preview',
            '@Org.OData.Core.V1.LongDescription': 'This term can be applied e.g. to UI.Facet and UI.DataField'
        },
        'Map': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Record'],
            '@Org.OData.Core.V1.Description':
                'Target MUST reference a UI.GeoLocation, Communication.Address or a collection of these',
            '@Org.OData.Core.V1.RequiresType': 'com.sap.vocabularies.UI.v1.ReferenceFacet'
        },
        'Gallery': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Record'],
            '@Org.OData.Core.V1.Description': 'Target MUST reference a UI.MediaResource',
            '@Org.OData.Core.V1.RequiresType': 'com.sap.vocabularies.UI.v1.ReferenceFacet'
        },
        'IsImageURL': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'Term', 'TypeDefinition'],
            '@Org.OData.Core.V1.Description':
                'Properties and terms annotated with this term MUST contain a valid URL referencing an resource with a MIME type image',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String',
            '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.Common.v1.IsNaturalPerson']
        },
        'IsImage': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'EntityType', 'TypeDefinition'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Properties annotated with this term MUST be a stream property annotated with a MIME type image. Entity types annotated with this term MUST be a media entity type annotated with a MIME type image.',
            '@Org.OData.Core.V1.RequiresType': 'Edm.Stream',
            '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.Common.v1.IsNaturalPerson']
        },
        'MultiLineText': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'PropertyValue', 'Parameter', 'TypeDefinition'],
            '@Org.OData.Core.V1.Description':
                'Properties and parameters annotated with this annotation should be rendered as multi-line text (e.g. text area)',
            '@Org.OData.Core.V1.RequiresType': 'Edm.String'
        },
        'Placeholder': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property', 'Parameter'],
            '@Org.OData.Core.V1.Description':
                'A short, human-readable text that gives a hint or an example to help the user with data entry',
            '@Org.OData.Core.V1.IsLanguageDependent': true
        },
        'InputMask': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.InputMaskType',
            '$AppliesTo': ['Property', 'Parameter'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Properties or parameters annotated with this term will get a mask in edit mode',
            '@Org.OData.Core.V1.LongDescription':
                'Input masks improve readability and help to enter data correctly. \nSo, masks can be especially useful for input fields that have a fixed pattern, e.g. DUNS numbers or similar. \n[Here](../examples/UI.InputMask-sample.xml) you can find an example for this annotation'
        },
        'InputMaskType': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            'Mask': {
                '@Org.OData.Core.V1.Description': 'The mask to be applied to the property or the parameter'
            },
            'PlaceholderSymbol': {
                '$MaxLength': 1,
                '$DefaultValue': '_',
                '@Org.OData.Core.V1.Description':
                    'A single character symbol to be shown where the user can type a character'
            },
            'Rules': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.InputMaskRuleType',
                '@Org.OData.Core.V1.Description': 'Rules that define valid values for one symbol in the mask',
                '@Org.OData.Core.V1.LongDescription':
                    "The following rules are defined as default and don't need to be listed here: * = ., C = [a-zA-Z], 9 = [0-9]"
            }
        },
        'InputMaskRuleType': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            'MaskSymbol': {
                '$MaxLength': 1,
                '@Org.OData.Core.V1.Description':
                    'A symbol in the mask that stands for a regular expression which must be matched by the user input in every position where this symbol occurs'
            },
            'RegExp': {
                '@Org.OData.Core.V1.Description': 'Regular expression that defines the valid values for the mask symbol'
            }
        },
        'TextArrangement': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.TextArrangementType',
            '$AppliesTo': ['Annotation', 'EntityType'],
            '@Org.OData.Core.V1.Description': 'Describes the arrangement of a code or ID value and its text',
            '@Org.OData.Core.V1.LongDescription':
                'This term annotates one of the following:\n1. a [`Common.Text`](Common.md#Text) annotation of the code or ID property where the annotation value is the text\n2. an entity type, this has the same effect as annotating all `Common.Text` annotations of properties of that entity type.'
        },
        'TextArrangementType': {
            '$Kind': 'EnumType',
            'TextFirst': 0,
            'TextFirst@Org.OData.Core.V1.Description': 'Text is first, followed by the code/ID (e.g. in parentheses)',
            'TextLast': 1,
            'TextLast@Org.OData.Core.V1.Description':
                'Code/ID is first, followed by the text (e.g. separated by a dash)',
            'TextSeparate': 2,
            'TextSeparate@Org.OData.Core.V1.Description':
                'Code/ID and text are represented separately (code/ID will be shown and text can be visualized in a separate place)',
            'TextOnly': 3,
            'TextOnly@Org.OData.Core.V1.Description': 'Only text is represented, code/ID is hidden (e.g. for UUIDs)'
        },
        'DateTimeStyle': {
            '$Kind': 'Term',
            '$Nullable': true,
            '$AppliesTo': ['Property', 'Parameter'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'The temporal value represented by the annotated property or parameter shall be shown on the UI in the given style',
            '@Org.OData.Core.V1.LongDescription':
                'Requires type `Edm.Date`, `Edm.TimeOfDay`, or `Edm.DateTimeOffset`.\n          If this annotation is absent or null or an empty string, temporal values are shown in a default style.',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': 'short',
                    '@Org.OData.Core.V1.Description': '7/25/24, 1:11 PM'
                },
                {
                    'Value': 'medium',
                    '@Org.OData.Core.V1.Description': 'Jul 25, 2024, 1:11:51 PM'
                },
                {
                    'Value': 'long',
                    '@Org.OData.Core.V1.Description': 'July 25, 2024 at 1:11:51 PM GMT+2'
                },
                {
                    'Value': 'full',
                    '@Org.OData.Core.V1.Description':
                        'Thursday, July 25, 2024 at 1:11:51 PM Central European Summer Time'
                }
            ]
        },
        'Note': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.NoteType',
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Visualization of a note attached to an entity',
            '@Org.OData.Core.V1.LongDescription':
                'Administrative data is given by the annotations\n          [`Common.CreatedBy`](Common.md#CreatedBy),\n          [`Common.CreatedAt`](Common.md#CreatedAt),\n          [`Common.ChangedBy`](Common.md#ChangedBy),\n          [`Common.ChangedAt`](Common.md#ChangedAt)\n          on the same entity type.'
        },
        'NoteType': {
            '$Kind': 'ComplexType',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            'Title': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Title of the note',
                '@Org.OData.Core.V1.LongDescription':
                    'The title of a note is hidden with an annotation `@UI.Note/Title/@UI.Hidden`, not with\n            an annotation on the property targeted by `@UI.Note/Title`.',
                '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.UI.v1.Hidden']
            },
            'Content': {
                '@Org.OData.Core.V1.Description': 'Content of the note, as a string',
                '@Org.OData.Core.V1.LongDescription':
                    'The property targeted by `@UI.Note/Content` must be annotated with `Core.MediaType` and\n            may be annotated with `Common.SAPObjectNodeTypeReference`. When it is tagged with `Core.IsLanguageDependent`,\n            another property of the same entity type that is tagged with [`Common.IsLanguageIdentifier`](Common.md#IsLanguageIdentifier)\n            determines the language of the note.',
                '@Org.OData.Validation.V1.ApplicableTerms': [
                    'Org.OData.Core.V1.MediaType',
                    'Org.OData.Core.V1.IsLanguageDependent',
                    'com.sap.vocabularies.Common.v1.SAPObjectNodeTypeReference'
                ]
            },
            'Type': {
                '@Org.OData.Core.V1.Description': 'A type used for grouping notes'
            },
            'MaximalLength': {
                '$Type': 'Edm.Int32',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Type-specific maximal length of the content of the note'
            },
            'MultipleNotes': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Whether the type allows multiple notes for one object'
            }
        },
        'Importance': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.ImportanceType',
            '$AppliesTo': ['Annotation', 'Record'],
            '@Org.OData.Core.V1.Description': 'Expresses the importance of e.g. a DataField or an annotation'
        },
        'ImportanceType': {
            '$Kind': 'EnumType',
            'High': 0,
            'High@Org.OData.Core.V1.Description': 'High importance',
            'Medium': 1,
            'Medium@Org.OData.Core.V1.Description': 'Medium importance',
            'Low': 2,
            'Low@Org.OData.Core.V1.Description': 'Low importance'
        },
        'Hidden': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'NavigationProperty', 'Record', 'Parameter'],
            '@Org.OData.Core.V1.Description':
                'Properties or facets (see UI.Facet) annotated with this term will not be rendered if the annotation evaluates to true.',
            '@Org.OData.Core.V1.LongDescription':
                'Hidden properties usually carry technical information that is used for application control and is of no direct interest to end users.\n          The annotation value may be an expression to dynamically hide or render the annotated feature. If a navigation property is annotated with `Hidden` true, all subsequent parts are hidden - independent of their own potential `Hidden` annotations.'
        },
        'IsCopyAction': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Record'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.RequiresType': 'com.sap.vocabularies.UI.v1.DataFieldForAction',
            '@Org.OData.Core.V1.Description':
                'The annotated [`DataFieldForAction`](#DataFieldForAction) record references an action that deep-copies an instance of the annotated entity type',
            '@Org.OData.Core.V1.LongDescription':
                'The referenced action MUST be bound to the annotated entity type and MUST create a new instance of the same entity type as a deep copy of the bound instance.\nUpon successful completion, the response MUST contain a `Location` header that contains the edit URL or read URL of the created entity,\nand the response MUST be either `201 Created` and a representation of the created entity,\nor `204 No Content` if the request included a `Prefer` header with a value of `return=minimal` and did not include the system query options `$select` and `$expand`.'
        },
        'IsAIOperation': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Action', 'Function', 'ActionImport', 'FunctionImport'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'The annotated operation is powered by AI',
            '@Org.OData.Core.V1.LongDescription':
                'This term allows making end-users aware that the annotated operation uses AI functionality to process the selected application data.'
        },
        'CreateHidden': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$AppliesTo': ['EntitySet', 'EntityType'],
            '@Org.OData.Core.V1.Description':
                'EntitySets annotated with this term can control the visibility of the Create operation dynamically',
            '@Org.OData.Core.V1.LongDescription':
                'The annotation value should be a path to another property from a related entity.'
        },
        'UpdateHidden': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$AppliesTo': ['EntitySet', 'EntityType'],
            '@Org.OData.Core.V1.Description':
                'EntitySets annotated with this term can control the visibility of the Edit/Save operation dynamically',
            '@Org.OData.Core.V1.LongDescription':
                'The annotation value should be a path to another property from the same or a related entity.'
        },
        'DeleteHidden': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$AppliesTo': ['EntitySet', 'EntityType'],
            '@Org.OData.Core.V1.Description':
                'EntitySets annotated with this term can control the visibility of the Delete operation dynamically',
            '@Org.OData.Core.V1.LongDescription':
                'The annotation value should be a path to another property from the same or a related entity.'
        },
        'HiddenFilter': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'NavigationProperty'],
            '@Org.OData.Core.V1.Description':
                'Properties annotated with this term will not be rendered as filter criteria if the annotation evaluates to true.',
            '@Org.OData.Core.V1.LongDescription':
                'Properties annotated with `HiddenFilter` are intended as parts of a `$filter` expression that cannot be directly influenced by end users.\n          The properties will be rendered in all other places, e.g. table columns or form fields. This is in contrast to properties annotated with [Hidden](#Hidden) that are not rendered at all.\n          If a navigation property is annotated with `HiddenFilter` true, all subsequent parts are hidden in filter - independent of their own potential `HiddenFilter` annotations.'
        },
        'AdaptationHidden': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property', 'EntitySet', 'EntityType'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                "Properties or entities annotated with this term can't be used for UI adaptation/configuration/personalization",
            '@Org.OData.Core.V1.LongDescription':
                'The tagged elements can only be used in UI based on metadata, annnotations or code.'
        },
        'DataFieldDefault': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'Default representation of a property as a datafield, e.g. when the property is added as a table column or form field via personalization',
            '@Org.OData.Core.V1.LongDescription':
                'Only concrete subtypes of [DataFieldAbstract](#DataFieldAbstract) can be used for a DataFieldDefault. For type [DataField](#DataField) and its subtypes the annotation target SHOULD be the same property that is referenced via a path expression in the `Value` of the datafield.'
        },
        'DataFieldAbstract': {
            '$Kind': 'ComplexType',
            '$Abstract': true,
            '@Org.OData.Core.V1.Description':
                'Elementary building block that represents a piece of data and/or allows triggering an action',
            '@Org.OData.Core.V1.LongDescription':
                'By using the applicable terms UI.Hidden, UI.Importance or HTML5.CssDefaults, the visibility, the importance and\n          and the default css settings (as the width) of the data field can be influenced. ',
            '@Org.OData.Validation.V1.ApplicableTerms': [
                'com.sap.vocabularies.UI.v1.Hidden',
                'com.sap.vocabularies.UI.v1.Importance',
                'com.sap.vocabularies.UI.v1.PartOfPreview',
                'com.sap.vocabularies.HTML5.v1.CssDefaults',
                'com.sap.vocabularies.HTML5.v1.RowSpanForDuplicateValues',
                'com.sap.vocabularies.Common.v1.FieldControl'
            ],
            'Label': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'A short, human-readable text suitable for labels and captions in UIs',
                '@Org.OData.Core.V1.IsLanguageDependent': true
            },
            'Criticality': {
                '$Type': 'com.sap.vocabularies.UI.v1.CriticalityType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Criticality of the data field value'
            },
            'CriticalityRepresentation': {
                '$Type': 'com.sap.vocabularies.UI.v1.CriticalityRepresentationType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Decides if criticality is visualized in addition by means of an icon'
            },
            'IconUrl': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Optional icon',
                '@Org.OData.Core.V1.IsURL': true
            }
        },
        'CriticalityRepresentationType': {
            '$Kind': 'EnumType',
            'WithIcon': 0,
            'WithIcon@Org.OData.Core.V1.Description': 'Criticality is represented with an icon',
            'WithoutIcon': 1,
            'WithoutIcon@Org.OData.Core.V1.Description':
                'Criticality is represented without icon, e.g. only via text color',
            'OnlyIcon': 2,
            'OnlyIcon@com.sap.vocabularies.Common.v1.Experimental': true,
            'OnlyIcon@Org.OData.Core.V1.Description': 'Criticality is represented only by using an icon'
        },
        'DataFieldForAnnotation': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
            '@Org.OData.Core.V1.Description': 'A structured piece of data described by an annotation',
            'Target': {
                '$Type': 'Edm.AnnotationPath',
                '@Org.OData.Core.V1.Description':
                    'Target MUST reference an annotation of terms Communication.Contact, Communication.Address, UI.DataPoint, UI.Chart, UI.FieldGroup, or UI.ConnectedFields',
                '@Org.OData.Validation.V1.AllowedTerms': [
                    'com.sap.vocabularies.Communication.v1.Address',
                    'com.sap.vocabularies.Communication.v1.Contact',
                    'com.sap.vocabularies.UI.v1.Chart',
                    'com.sap.vocabularies.UI.v1.ConnectedFields',
                    'com.sap.vocabularies.UI.v1.DataPoint',
                    'com.sap.vocabularies.UI.v1.FieldGroup',
                    'com.sap.vocabularies.UI.v1.PresentationVariant',
                    'com.sap.vocabularies.UI.v1.SelectionPresentationVariant'
                ]
            }
        },
        'DataFieldForActionAbstract': {
            '$Kind': 'ComplexType',
            '$Abstract': true,
            '$BaseType': 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
            '@Org.OData.Core.V1.Description': 'Triggers an action',
            'Inline': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description':
                    'Action should be placed close to (or even inside) the visualized term'
            },
            'Determining': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description':
                    'Determines whether the action completes a process step (e.g. approve, reject).'
            }
        },
        'DataFieldForAction': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.DataFieldForActionAbstract',
            '@Org.OData.Core.V1.Description': 'Triggers an OData action',
            '@Org.OData.Core.V1.LongDescription':
                'The action is NOT tied to a data value (in contrast to [DataFieldWithAction](#DataFieldWithAction)).',
            'Action': {
                '$Type': 'com.sap.vocabularies.UI.v1.ActionName',
                '@Org.OData.Core.V1.Description':
                    'Name of an Action, Function, ActionImport, or FunctionImport in scope'
            },
            'InvocationGrouping': {
                '$Type': 'com.sap.vocabularies.UI.v1.OperationGroupingType',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Expresses how invocations of this action on multiple instances should be grouped'
            }
        },
        'OperationGroupingType': {
            '$Kind': 'EnumType',
            'Isolated': 0,
            'Isolated@Org.OData.Core.V1.Description': 'Invoke each action in isolation from other actions',
            'ChangeSet': 1,
            'ChangeSet@Org.OData.Core.V1.Description': 'Group all actions into a single change set'
        },
        'DataFieldForIntentBasedNavigation': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.DataFieldForActionAbstract',
            '@Org.OData.Core.V1.Description': 'Triggers intent-based UI navigation',
            '@Org.OData.Core.V1.LongDescription':
                'The navigation intent is expressed as a Semantic Object and optionally an Action on that object.\n\nIt is NOT tied to a data value (in contrast to [DataFieldWithIntentBasedNavigation](#DataFieldWithIntentBasedNavigation)).',
            'SemanticObject': {
                '@Org.OData.Core.V1.Description': 'Name of the Semantic Object'
            },
            'Action': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Name of the Action on the Semantic Object. If not specified, let user choose which of the available actions to trigger.'
            },
            'NavigationAvailable': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description':
                    'The navigation intent is for that user with the selected context and parameters available'
            },
            'RequiresContext': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description':
                    'Determines whether  a context needs to be passed to the target of this navigation.'
            },
            'Mapping': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.Common.v1.SemanticObjectMappingType',
                '@Org.OData.Core.V1.Description':
                    'Maps properties of the annotated entity type to properties of the Semantic Object'
            }
        },
        'DataFieldForActionGroup': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Collection of OData actions and intent based navigations',
            'ID': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Identifier of an action group. ID should be stable, as long as the perceived semantics of the action group is unchanged.',
                '@Org.OData.Core.V1.LongDescription':
                    'The ID should be unique among all action groups used in all data fields of one entity type / set.'
            },
            'Actions': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.DataFieldForActionAbstract',
                '@Org.OData.Core.V1.Description':
                    'Collection of data fields that refer to actions or intent based navigations'
            }
        },
        'DataField': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.DataFieldAbstract',
            '@Org.OData.Core.V1.Description': 'A piece of data',
            'Value': {
                '$Type': 'Edm.Untyped',
                '@Org.OData.Core.V1.Description': "The data field's value",
                '@Org.OData.Validation.V1.DerivedTypeConstraint': [
                    'Edm.PrimitiveType',
                    'Collection(Edm.Binary)',
                    'Collection(Edm.Boolean)',
                    'Collection(Edm.Byte)',
                    'Collection(Edm.Date)',
                    'Collection(Edm.DateTimeOffset)',
                    'Collection(Edm.Decimal)',
                    'Collection(Edm.Double)',
                    'Collection(Edm.Duration)',
                    'Collection(Edm.Guid)',
                    'Collection(Edm.Int16)',
                    'Collection(Edm.Int32)',
                    'Collection(Edm.Int64)',
                    'Collection(Edm.SByte)',
                    'Collection(Edm.Single)',
                    'Collection(Edm.String)',
                    'Collection(Edm.TimeOfDay)'
                ],
                '@Org.OData.Core.V1.IsLanguageDependent': true
            }
        },
        'DataFieldWithAction': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.DataField',
            '@Org.OData.Core.V1.Description': 'A piece of data that allows triggering an OData action',
            '@Org.OData.Core.V1.LongDescription':
                'The action is tied to a data value. This is in contrast to [DataFieldForAction](#DataFieldForAction) which is not tied to a specific data value.',
            'Value': {
                '$Type': 'Edm.PrimitiveType'
            },
            'Action': {
                '$Type': 'com.sap.vocabularies.UI.v1.ActionName',
                '@Org.OData.Core.V1.Description':
                    'Name of an Action, Function, ActionImport, or FunctionImport in scope'
            }
        },
        'DataFieldWithIntentBasedNavigation': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.DataField',
            '@Org.OData.Core.V1.Description': 'A piece of data that allows triggering intent-based UI navigation',
            '@Org.OData.Core.V1.LongDescription':
                'The navigation intent is expressed as a Semantic Object and optionally an Action on that object.\n\nIt is tied to a data value which should be rendered as a hyperlink.\nThis is in contrast to [DataFieldForIntentBasedNavigation](#DataFieldForIntentBasedNavigation) which is not tied to a specific data value.',
            'Value': {
                '$Type': 'Edm.PrimitiveType'
            },
            'SemanticObject': {
                '@Org.OData.Core.V1.Description': 'Name of the Semantic Object'
            },
            'Action': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Name of the Action on the Semantic Object. If not specified, let user choose which of the available actions to trigger.'
            },
            'Mapping': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.Common.v1.SemanticObjectMappingType',
                '@Org.OData.Core.V1.Description':
                    'Maps properties of the annotated entity type to properties of the Semantic Object'
            }
        },
        'DataFieldWithNavigationPath': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.DataField',
            '@Org.OData.Core.V1.Description': 'A piece of data that allows navigating to related data',
            '@Org.OData.Core.V1.LongDescription': 'It should be rendered as a hyperlink',
            'Value': {
                '$Type': 'Edm.PrimitiveType'
            },
            'Target': {
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description':
                    'Contains either a navigation property or a term cast, where term is of type Edm.EntityType or a concrete entity type or a collection of these types'
            }
        },
        'DataFieldWithUrl': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.DataField',
            '@Org.OData.Core.V1.Description': 'A piece of data that allows navigating to other information on the Web',
            '@Org.OData.Core.V1.LongDescription': 'It should be rendered as a hyperlink',
            'Value': {
                '$Type': 'Edm.PrimitiveType'
            },
            'Url': {
                '@Org.OData.Core.V1.Description': 'Target of the hyperlink',
                '@Org.OData.Core.V1.IsURL': true,
                '@Org.OData.Validation.V1.ApplicableTerms': ['com.sap.vocabularies.HTML5.v1.LinkTarget']
            },
            'UrlContentType': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Media type of the hyperlink target, e.g. `video/mp4`',
                '@Org.OData.Core.V1.IsMediaType': true
            }
        },
        'DataFieldWithActionGroup': {
            '$Kind': 'ComplexType',
            '$BaseType': 'com.sap.vocabularies.UI.v1.DataField',
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Collection of OData actions and intent based navigations',
            'Value': {
                '$Type': 'Edm.PrimitiveType'
            },
            'Actions': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.DataField',
                '@Org.OData.Core.V1.Description':
                    'Collection of data fields that are either [DataFieldWithAction](#DataFieldWithAction), [DataFieldWithIntentBasedNavigation](#DataFieldWithIntentBasedNavigation), [DataFieldWithNavigationPath](#DataFieldWithNavigationPath), or [DataFieldWithUrl](#DataFieldWithUrl)'
            }
        },
        'Criticality': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.CriticalityType',
            '$AppliesTo': ['Annotation'],
            '@Org.OData.Core.V1.Description': 'Service-calculated criticality, alternative to UI.CriticalityCalculation'
        },
        'CriticalityCalculation': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.CriticalityCalculationType',
            '$AppliesTo': ['Annotation'],
            '@Org.OData.Core.V1.Description':
                'Parameters for client-calculated criticality, alternative to UI.Criticality'
        },
        'Emphasized': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Record'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Highlight something that is of special interest',
            '@Org.OData.Core.V1.LongDescription':
                "The usage of a property or operation should be highlighted as it's of special interest for the end user"
        },
        'OrderBy': {
            '$Kind': 'Term',
            '$Type': 'Edm.PropertyPath',
            '$AppliesTo': ['Property'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Sort by the referenced property instead of by the annotated property',
            '@Org.OData.Core.V1.LongDescription':
                'Example: annotated property `SizeCode` has string values XS, S, M, L, XL, referenced property SizeOrder has numeric values -2, -1, 0, 1, 2. Numeric ordering by SizeOrder will be more understandable than lexicographic ordering by SizeCode.'
        },
        'ParameterDefaultValue': {
            '$Kind': 'Term',
            '$Type': 'Edm.PrimitiveType',
            '$Nullable': true,
            '$AppliesTo': ['Parameter'],
            '@Org.OData.Core.V1.Description': 'Define default values for action parameters',
            '@Org.OData.Core.V1.LongDescription':
                'For unbound actions the default value can either be a constant expression, or a dynamic expression using absolute paths, e.g. singletons or function import results.\n            Whereas for bound actions the bound entity and its properties and associated properties can be used as default values'
        },
        'RecommendationState': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.RecommendationStateType',
            '@Org.OData.Core.V1.Description': 'Indicates whether a field contains or has a recommended value',
            '@Org.OData.Core.V1.LongDescription':
                'Intelligent systems can help users by recommending input the user may "prefer".'
        },
        'RecommendationStateType': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.Byte',
            '@Org.OData.Core.V1.Description': 'Indicates whether a field contains or has a recommended value',
            '@Org.OData.Core.V1.LongDescription':
                'Editable fields for which a recommendation has been pre-filled or that have recommendations that differ from existing human input need to be highlighted.',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': 0,
                    '@Org.OData.Core.V1.Description': 'regular - with human or default input, no recommendation'
                },
                {
                    'Value': 1,
                    '@Org.OData.Core.V1.Description': 'highlighted - without human input and with recommendation'
                },
                {
                    'Value': 2,
                    '@Org.OData.Core.V1.Description': 'warning - with human or default input and with recommendation'
                }
            ]
        },
        'RecommendationList': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.UI.v1.RecommendationListType',
            '$AppliesTo': ['Property', 'Parameter', 'TypeDefinition'],
            '@Org.OData.Core.V1.Description':
                'Specifies how to get a list of recommended values for a property or parameter',
            '@Org.OData.Core.V1.LongDescription':
                'Intelligent systems can help users by recommending input the user may "prefer".'
        },
        'RecommendationListType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Reference to a recommendation list',
            '@Org.OData.Core.V1.LongDescription':
                'A recommendation consists of one or more values for editable fields plus a rank between 0.0 and 9.9, with 9.9 being the best recommendation.',
            'CollectionPath': {
                '@Org.OData.Core.V1.Description': 'Resource path of a collection of recommended values'
            },
            'RankProperty': {
                '@Org.OData.Core.V1.Description':
                    'Name of the property within the collection of recommended values that describes the rank of the recommendation'
            },
            'Binding': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.UI.v1.RecommendationBinding',
                '@Org.OData.Core.V1.Description': 'List of pairs of a local property and recommended value property'
            }
        },
        'RecommendationBinding': {
            '$Kind': 'ComplexType',
            'LocalDataProperty': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Path to editable property for which recommended values exist'
            },
            'ValueListProperty': {
                '@Org.OData.Core.V1.Description':
                    'Path to property in the collection of recommended values. Format is identical to PropertyPath annotations.'
            }
        },
        'Recommendations': {
            '$Kind': 'Term',
            '$Type': 'Edm.ComplexType',
            '$AppliesTo': ['EntityType'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Recommendations for an entity',
            '@Org.OData.Core.V1.LongDescription':
                'This complex-typed annotation contains structural properties corresponding via name equality\nto non-key structural primitive properties of the entity type for which recommendations are available.\nThe type of such a property is a collection of a informal specialization of [`PropertyRecommendationType`](#PropertyRecommendationType).\n(The specializiations are called "informal" because they may omit the property `RecommendedFieldDescription`.)\n\nClients retrieve the recommendations with a GET request that includes this annotation in a `$select` clause.\nThe recommendations MAY be computed asynchronously, see [this diagram](../docs/recommendations.md).'
        },
        'PropertyRecommendationType': {
            '$Kind': 'ComplexType',
            '$Abstract': true,
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description': 'Base type containing recommendations for an entity type property',
            'RecommendedFieldValue': {
                '$Type': 'Edm.PrimitiveType',
                '@Org.OData.Core.V1.Description': 'Recommended value',
                '@Org.OData.Core.V1.LongDescription':
                    'In informal specializations of this base type, this property is specialized to the primitive type of the entity type property.\n            If the recommendation has a description, this property has a [`Common.Text`](Common.md#Text) annotation\n            that evaluates to the `RecommendedFieldDescription` property.',
                '@com.sap.vocabularies.Common.v1.Text': {
                    '$Path': 'RecommendedFieldDescription'
                }
            },
            'RecommendedFieldDescription': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Description of the recommended value',
                '@Org.OData.Core.V1.LongDescription':
                    'In informal specializations of this base type, this property is specialized to the string type of the text property corresponding to the entity type property.\n            It is omitted from informal specializations for recommendations without description.'
            },
            'RecommendedFieldScoreValue': {
                '$Type': 'Edm.Decimal',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'Confidence score of the recommended value'
            },
            'RecommendedFieldIsSuggestion': {
                '$Type': 'Edm.Boolean',
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'Whether the recommended value shall be suggested in the input field',
                '@Org.OData.Core.V1.LongDescription':
                    'For any collection of a specialization of `PropertyRecommendationType`\n            in a property containing [`Recommendations`](#Recommendations),\n            this flag can be true in at most one instance of the collection,\n            and only if the `RecommendedFieldScoreValue` exceeds a certain threshold.'
            }
        },
        'ExcludeFromNavigationContext': {
            '$Kind': 'Term',
            '$Type': 'Org.OData.Core.V1.Tag',
            '$DefaultValue': true,
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                'The contents of this property must not be propagated to the app-to-app navigation context'
        },
        'DoNotCheckScaleOfMeasuredQuantity': {
            '$Kind': 'Term',
            '$Type': 'Edm.Boolean',
            '$AppliesTo': ['Property', 'TypeDefinition'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'Do not check the number of fractional digits of the annotated measured quantity',
            '@Org.OData.Core.V1.LongDescription':
                'The annotated property contains a measured quantity, and the user may enter more fractional digits than defined for the corresponding unit of measure.\n\nThis switches off the validation of user input with respect to decimals.'
        },
        'LeadingEntitySet': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntityContainer'],
            '@com.sap.vocabularies.Common.v1.Experimental': true,
            '@Org.OData.Core.V1.Description':
                'The referenced entity set is the preferred starting point for UIs using this service'
        },
        'ActionName': {
            '$Kind': 'TypeDefinition',
            '$UnderlyingType': 'Edm.String',
            '@Org.OData.Core.V1.Description': 'Name of an Action, Function, ActionImport, or FunctionImport in scope',
            '@Org.OData.Core.V1.LongDescription':
                'Possible values are\n\n- Namespace-qualified name of an action or function (`foo.bar`)\n- Namespace-qualified name of an action or function followed by parentheses with the parameter signature to identify a specific overload, like in an [annotation target](https://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_Target) (`foo.bar(baz.qux)`)\n- Simple name of an action import or function import of the annotated service (`quux`)\n- Namespace-qualified name of an entity container, followed by a slash and the simple name of an action import or function import in any referenced schema (`foo.corge/quux`)'
        }
    }
} as CSDL;
