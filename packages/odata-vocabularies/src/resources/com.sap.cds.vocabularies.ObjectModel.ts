export default {
    'com.sap.cds.vocabularies.ObjectModel': {
        '$Alias': 'ObjectModel',
        '@Org.OData.Core.V1.Description': 'CDS annotation for ObjectModel (subset)',
        'modelingPattern': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntityType'],
            '$Type': 'com.sap.cds.vocabularies.ObjectModel.ModelingPatternType',
            '@Org.OData.Core.V1.Description': '(CDS annotation) Defines the modeling pattern (TODO)'
        },
        'ModelingPatternType': {
            '$Kind': 'EnumType',
            'ANALYTICAL_DIMENSION': 0,
            'ANALYTICAL_DIMENSION@Org.OData.Core.V1.Description': 'Description for ANALYTICAL_DIMENSION (TODO)',
            'ANALYTICAL_FACT': 1,
            'ANALYTICAL_FACT@Org.OData.Core.V1.Description': 'Description for ANALYTICAL_FACT (TODO)',
            'ANALYTICAL_CUBE': 2,
            'ANALYTICAL_CUBE@Org.OData.Core.V1.Description': 'Description for ANALYTICAL_CUBE (TODO)',
            'LANGUAGE_DEPENDENT_TEXT': 3,
            'LANGUAGE_DEPENDENT_TEXT@Org.OData.Core.V1.Description': 'Description for LANGUAGE_DEPENDENT_TEXT (TODO)'
        },
        'supportedCapabilities': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntityType'],
            '$Type': 'com.sap.cds.vocabularies.ObjectModel.SupportedCapabilitiesType',
            '@Org.OData.Core.V1.Description': '(CDS annotation) Defines the supported capabilities (TODO)'
        },
        'SupportedCapabilitiesType': {
            '$Kind': 'EnumType',
            '$IsFlags': true,
            'ANALYTICAL_DIMENSION': 0,
            'ANALYTICAL_DIMENSION@Org.OData.Core.V1.Description': 'Description for ANALYTICAL_DIMENSION (TODO)',
            'ANALYTICAL_PROVIDER': 1,
            'ANALYTICAL_PROVIDER@Org.OData.Core.V1.Description': 'Description for ANALYTICAL_PROVIDER (TODO)',
            'DATA_STRUCTURE': 2,
            'DATA_STRUCTURE@Org.OData.Core.V1.Description': 'Description for DATA_STRUCTURE (TODO)',
            'LANGUAGE_DEPENDENT_TEXT': 3,
            'LANGUAGE_DEPENDENT_TEXT@Org.OData.Core.V1.Description': 'Description for LANGUAGE_DEPENDENT_TEXT (TODO)'
        },
        'foreignKey': {
            '$Kind': 'Term',
            '$Type': 'com.sap.cds.vocabularies.ObjectModel.ForeignKeyType',
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description': 'TODO description for foreignKey'
        },
        'ForeignKeyType': {
            '$Kind': 'ComplexType',
            'association': {
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description': 'TODO description for ForeignKeyType.association'
            }
        },
        'representativeKey': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntityType'],
            '$Type': 'Edm.PropertyPath',
            '@Org.OData.Core.V1.Description': '(CDS annotation) Defines the representativeKey (TODO)'
        },
        'objectIdentifier': {
            '$Kind': 'Term',
            '$Type': 'com.sap.cds.vocabularies.ObjectModel.ObjectIdentifierType',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': 'TODO description for objectIdentifier'
        },
        'ObjectIdentifierType': {
            '$Kind': 'ComplexType',
            'oidElement': {
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'TODO description for ObjectIdentifierType.oidElement'
            }
        }
    }
};
