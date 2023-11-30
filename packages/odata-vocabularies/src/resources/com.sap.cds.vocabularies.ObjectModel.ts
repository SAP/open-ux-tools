
export default {
    'com.sap.cds.vocabularies.ObjectModel': {
        '$Alias': 'ObjectModel',
        '@Org.OData.Core.V1.Description': 'CDS annotation for ObjectModel (subset)',
        'modelingPattern': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntityType'],
            '@Org.OData.Core.V1.Description': '(CDS annotation) Defines the modeling pattern (TODO)',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': 'ANALYTICAL_CUBE',
                    '@Org.OData.Core.V1.Description': 'TODO description for ANALYTICAL_CUBE'
                },
                {
                    'Value': 'ANALYTICAL_DIMENSION',
                    '@Org.OData.Core.V1.Description': 'TODO description for ANALYTICAL_DIMENSION'
                },
                {
                    'Value': 'ANALYTICAL_FACT',
                    '@Org.OData.Core.V1.Description': 'TODO description for ANALYTICAL_FACT'
                },
                {
                    'Value': 'ANALYTICAL_PARENT_CHILD_HIERARCHY_NODE',
                    '@Org.OData.Core.V1.Description': 'TODO description for ANALYTICAL_PARENT_CHILD_HIERARCHY_NODE'
                },
                {
                    'Value': 'ANALYTICAL_KPI',
                    '@Org.OData.Core.V1.Description': 'TODO description for ANALYTICAL_KPI'
                }
            ]
        },
        'supportedCapabilities': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntityType'],
            '$Collection': true,
            '@Org.OData.Core.V1.Description': '(CDS annotation) Defines the supported capabilities (TODO)',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': 'ANALYTICAL_DIMENSION',
                    '@Org.OData.Core.V1.Description': 'TODO description for ANALYTICAL_DIMENSION'
                },
                {
                    'Value': 'ANALYTICAL_PROVIDER',
                    '@Org.OData.Core.V1.Description': 'TODO description for ANALYTICAL_PROVIDER'
                },
                {
                    'Value': 'ANALYTICAL_PARENT_CHILD_HIERARCHY_NODE',
                    '@Org.OData.Core.V1.Description': 'TODO description for ANALYTICAL_PARENT_CHILD_HIERARCHY_NODE'
                },
                {
                    'Value': 'ANALYTICAL_KPI',
                    '@Org.OData.Core.V1.Description': 'TODO description for ANALYTICAL_KPI'
                }
            ]
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
