export default {
    'com.sap.cds.vocabularies.ObjectModel': {
        '$Alias': 'ObjectModel',
        '@Org.OData.Core.V1.Description': 'CDS annotation for ObjectModel (subset)',
        'modelingPattern': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntityType'],
            '$Type': 'com.sap.cds.vocabularies.ObjectModel.ModelingPatternType',
            '@Org.OData.Core.V1.Description':
                '(CDS annotation) Describes the intention of an entity; used for tools/editors.'
        },
        'ModelingPatternType': {
            '$Kind': 'EnumType',
            'ANALYTICAL_DIMENSION': 0,
            'ANALYTICAL_DIMENSION@Org.OData.Core.V1.Description':
                'Annotated entity represents the master data of an analytical cube. Usually should be accompanied by supportedCapabilities "ANALYTICAL_DIMENSION".',
            'ANALYTICAL_FACT': 1,
            'ANALYTICAL_FACT@Org.OData.Core.V1.Description':
                'Annotated entity contains transactional data and the relationship to master data entities. Usually should be accompanied by supportedCapabilities "DATA_STRUCTURE".',
            'ANALYTICAL_CUBE': 2,
            'ANALYTICAL_CUBE@Org.OData.Core.V1.Description':
                'Describes star schema as an analytical cube. Usually accompanied by supportedCapabilities "ANALYTICAL_PROVIDER" to expose the entity for reporting tools.',
            'LANGUAGE_DEPENDENT_TEXT': 3,
            'LANGUAGE_DEPENDENT_TEXT@Org.OData.Core.V1.Description':
                'Annotated entity contains language-dependent text for master data entities. Usually should be accompanied by supportedCapabilities "LANGUAGE_DEPENDENT_TEXT".'
        },
        'supportedCapabilities': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntityType'],
            '$Type': 'com.sap.cds.vocabularies.ObjectModel.SupportedCapabilitiesType',
            '@Org.OData.Core.V1.Description': '(CDS annotation) Represents consumption scenarios for the entity.'
        },
        'SupportedCapabilitiesType': {
            '$Kind': 'EnumType',
            '$IsFlags': true,
            'ANALYTICAL_DIMENSION': 0,
            'ANALYTICAL_DIMENSION@Org.OData.Core.V1.Description':
                'Defines an entity that represents the master data of an analytical cube. Usually should be accompanied by modelingPattern "ANALYTICAL_DIMENSION".',
            'ANALYTICAL_PROVIDER': 1,
            'ANALYTICAL_PROVIDER@Org.OData.Core.V1.Description':
                'Exposes an analytical query for reporting. Usually accompanied by modelingPattern "ANALYTICAL_CUBE".',
            'DATA_STRUCTURE': 2,
            'DATA_STRUCTURE@Org.OData.Core.V1.Description':
                'Defines a data structure. Usually accompanied by modelingPattern "ANALYTICAL_FACT".',
            'LANGUAGE_DEPENDENT_TEXT': 3,
            'LANGUAGE_DEPENDENT_TEXT@Org.OData.Core.V1.Description':
                'Functions as a text view that contains language-dependent text for another entity. Usually accompanied by modelingPattern "LANGUAGE_DEPENDENT_TEXT".'
        },
        'foreignKey': {
            '$Kind': 'Term',
            '$Type': 'com.sap.cds.vocabularies.ObjectModel.ForeignKeyType',
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description':
                '(CDS annotation) Points to a value list entity for the annotated element.'
        },
        'ForeignKeyType': {
            '$Kind': 'ComplexType',
            'association': {
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description':
                    'Association to an entity that is a value list for the annotated element.'
            }
        },
        'representativeKey': {
            '$Kind': 'Term',
            '$AppliesTo': ['EntityType'],
            '$Type': 'Edm.PropertyPath',
            '@Org.OData.Core.V1.Description':
                '(CDS annotation) Most specific element of the primary key. It is the key element for which the entity serves as a value list.'
        }
    }
};
