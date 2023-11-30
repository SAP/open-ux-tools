export default {
    'com.sap.cds.vocabularies.Aggregation': {
        '$Alias': 'Aggregation',
        '@Org.OData.Core.V1.Description': 'CDS Terms for Aggregation (subset)',
        'default': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property'],
            '$Type': 'Aggregation.AggregationDefaultType',
            '@Org.OData.Core.V1.Description': '(CDS annotation) Defines the default aggregation of a property'
            // from ABAP definition:
            // NONE;SUM;MIN;MAX;AVG;COUNT_DISTINCT;NOP;FORMULA;
            // but cds has (https://pages.github.tools.sap/cap/docs/advanced/odata#aggregation-methods):
        },
        'AggregationDefaultType': {
            '$Kind': 'EnumType',
            'sum': 0,
            'sum@Org.OData.Core.V1.Description': 'Description aggregation type sum (TODO)',
            'min': 1,
            'min@Org.OData.Core.V1.Description': 'Description aggregation type min (TODO)',
            'max': 2,
            'max@Org.OData.Core.V1.Description': 'Description aggregation type max (TODO)',
            'average': 3,
            'average@Org.OData.Core.V1.Description': 'Description aggregation type average (TODO)',
            'countdistinct': 4,
            'countdistinct@Org.OData.Core.V1.Description': 'Description aggregation type countdistinct (TODO)'
        }
    }
};
