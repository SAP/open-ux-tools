

export default {
    'com.sap.cds.vocabularies.Aggregation': {
        $Alias: 'Aggregation',
        '@Org.OData.Core.V1.Description': 'CDS Terms for Aggregation (subset)',
        default: {
            $Kind: 'Term',
            $AppliesTo: ['Property'],
            '@Org.OData.Core.V1.Description': '(CDS annotation) Defines the default aggregation of a property',
            // from ABAP definition:
            // NONE;SUM;MIN;MAX;AVG;COUNT_DISTINCT;NOP;FORMULA;
            // but cds has (https://pages.github.tools.sap/cap/docs/advanced/odata#aggregation-methods):
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    Value: 'sum',
                    '@Org.OData.Core.V1.Description':
                        'Can be applied to numeric values to return the sum of the non-null values, or null if there are no non-null values or the input set is empty'
                },
                {
                    Value: 'min',
                    '@Org.OData.Core.V1.Description':
                        'Can be applied to values with a totally ordered domain to return the smallest of the non-null values, or null if there are no non-null values or the input set is empty'
                },
                {
                    Value: 'max',
                    '@Org.OData.Core.V1.Description':
                        'Can be applied to values with a totally ordered domain to return the largest of the non-null values, or null if there are no non-null values or the input set is empty'
                },
                {
                    Value: 'average',
                    '@Org.OData.Core.V1.Description':
                        'Can be applied to numeric values to return the sum of the non-null values divided by the count of the non-null values, or null if there are no non-null values or the input set is empty'
                },
                {
                    Value: 'countdistinct',
                    '@Org.OData.Core.V1.Description': 'Counts the distinct values, omitting any null values',
                    '@Org.OData.Core.V1.LongDescription':
                        'For navigation properties, it counts the distinct entities in the union of all entities related to entities in the input set. \n                  For collection-valued primitive properties, it counts the distinct items in the union of all collection values in the input set.'
                }
            ]
        }
    }
};
