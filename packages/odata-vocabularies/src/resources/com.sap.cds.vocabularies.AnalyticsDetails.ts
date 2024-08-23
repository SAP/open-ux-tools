export default {
    'com.sap.cds.vocabularies.AnalyticsDetails': {
        '$Alias': 'AnalyticsDetails',
        '@Org.OData.Core.V1.Description': 'CDS annotation for AnalyticsDetails (subset)',
        'measureType': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property'],
            '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.MeasureTypeEnumeration',
            '@Org.OData.Core.V1.Description': '(CDS annotation) Specifies in which way a measure should treated.'
        },
        'MeasureTypeEnumeration': {
            '$Kind': 'EnumType',
            'BASE': 0,
            'BASE@Org.OData.Core.V1.Description': 'Measure from the provider',
            'RESTRICTION': 1,
            'RESTRICTION@Org.OData.Core.V1.Description': 'Restricted measure',
            'CALCULATION': 2,
            'CALCULATION@Org.OData.Core.V1.Description': 'Calculated measure (formula) after aggregation'
        },
        'exceptionAggregationSteps': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property'],
            '$Collection': true,
            '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.ExceptionAggregationStepType',
            '@Org.OData.Core.V1.Description':
                '(CDS annotation) Used to define different (to the default aggregation) aggregation behavior for specified elements. In general there can be multiple elements in which a measure has to be aggregated differently. Therefore a list of ExceptionAggregationSteps can be assigned.'
        },
        'ExceptionAggregationStepType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description':
                'Used to define different (to the default aggregation) aggregation behavior for specified elements.',
            'exceptionAggregationBehavior': {
                '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.ExceptionAggregationBehaviorType',
                '@Org.OData.Core.V1.Description': 'Defines the aggregation behavior.'
            },
            'exceptionAggregationElements': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'Specifies the elements which should be aggregated in this step.'
            }
        },
        'ExceptionAggregationBehaviorType': {
            '$Kind': 'EnumType',
            'SUM': 0,
            'SUM@Org.OData.Core.V1.Description': 'Sum',
            'MIN': 1,
            'MIN@Org.OData.Core.V1.Description': 'Minimum',
            'MAX': 2,
            'MAX@Org.OData.Core.V1.Description': 'Maximum',
            'COUNT': 3,
            'COUNT@Org.OData.Core.V1.Description': 'Count data',
            'COUNTNULL': 4,
            'COUNTNULL@Org.OData.Core.V1.Description': 'Count data, where the value is not NULL.',
            'COUNTNULLZERO': 5,
            'COUNTNULLZERO@Org.OData.Core.V1.Description': 'Count data, where the value is not NULL or exactly 0.',
            'AVG': 6,
            'AVG@Org.OData.Core.V1.Description': 'Average',
            'AVERAGENULL': 7,
            'AVERAGENULL@Org.OData.Core.V1.Description':
                'Average, but data with a NULL value in the aggregated column is not counted.',
            'AVERAGENULLZERO': 8,
            'AVERAGENULLZERO@Org.OData.Core.V1.Description':
                'Like AVERAGENULL, but data with value exactly 0 are also not counted.',
            'STD': 9,
            'STD@Org.OData.Core.V1.Description': 'Standard deviation',
            'FIRST': 10,
            'FIRST@Org.OData.Core.V1.Description': 'First',
            'LAST': 11,
            'LAST@Org.OData.Core.V1.Description': 'Last'
        },
        'variable': {
            '$Kind': 'Term',
            '$AppliesTo': ['Parameter'],
            '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.VariableType',
            '@Org.OData.Core.V1.Description':
                '(CDS annotation) Annotation for a parameter, only supported in analytics. With this annotation a parameter can become a variable which represents an interval or a range. It can also become optional or can represent multiple values.'
        },
        'VariableType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Defines the specifics of the variable.',
            'usageType': {
                '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.VariableUsageTypeEnumeration',
                '@Org.OData.Core.V1.Description':
                    'Describes how the variable is used. It is a mandatory classification corresponding to the terminology Parameter Variable, Filter Variable, Formula Variable.'
            },
            'referenceElement': {
                '$Type': 'Edm.PropertyPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'An element in the entity to which the variable refers. In case of a filter variable this annotation is mandatory and must contain the element which represents the dimension. In general it restricts the usage in expressions, serves a reference for default values and it may result in a default value help.'
            },
            'mandatory': {
                '$Type': 'Edm.Boolean',
                '$Nullable': true,
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description':
                    'If mandatory is set to true or if the annotation is not set, the system enforces that the variable contains a value at runtime. If set to false, the variable is optional.'
            },
            'defaultValue': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Specifies a default value. If the variable is input enabled, the variable is prefilled with the default value. If the variable is hidden, the variable is processed with the default value.'
            },
            'defaultValueHigh': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description':
                    'Only for variables with selectionType #INTERVAL or #RANGE. Is used in combination with defaultValue: defaultValue contains the lower, defaultValueHigh the upper boundary of the interval.'
            },
            'defaultRanges': {
                '$Nullable': true,
                '$Collection': true,
                '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.RangeType',
                '@Org.OData.Core.V1.Description':
                    'Specifies a complex default filter in combination with the selectionType #RANGE (or #SINGLE / #INTERVAL in combinaton with "multipleSelections: true"). The default value ranges must comply to the combination of selectionType and multipleSelections.'
            },
            'selectionType': {
                '$Nullable': true,
                '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.VariableSelectionTypeEnumeration',
                '@Org.OData.Core.V1.Description': 'Determines how values can be entered.'
            },
            'multipleSelections': {
                '$Type': 'Edm.Boolean',
                '$Nullable': true,
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description':
                    'Is used to indicate that several lines (aka “rows”) can be entered on the filter input (selection) UIs.'
            }
        },
        'VariableUsageTypeEnumeration': {
            '$Kind': 'EnumType',
            'PARAMETER': 0,
            'PARAMETER@Org.OData.Core.V1.Description':
                'The variable is used for a parameter of the underlying data source.',
            'FILTER': 1,
            'FILTER@Org.OData.Core.V1.Description':
                'The variable is used in filters for the dimension represented by the element annotated as referenceElement.',
            'FORMULA': 2,
            'FORMULA@Org.OData.Core.V1.Description':
                'The variable is used as a placeholder in expressions defining calculated measures.'
        },
        'VariableSelectionTypeEnumeration': {
            '$Kind': 'EnumType',
            'SINGLE': 0,
            'SINGLE@Org.OData.Core.V1.Description': 'Single value.',
            'INTERVAL': 1,
            'INTERVAL@Org.OData.Core.V1.Description':
                'Interval is a special case of a Range with "sign = including" and "option = BT".',
            'RANGE': 2,
            'RANGE@Org.OData.Core.V1.Description':
                'A Range is a complete (ABAP like) SELECT-option including sign (including/excluding) and operator (EQ, CP, BT...).'
        },
        'RangeType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Specifies a #RANGE via sub fields "sign", "option", "low", and "high".',
            'sign': {
                '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.RangeSignType',
                '@Org.OData.Core.V1.Description': 'Include or exclude matching values.'
            },
            'option': {
                '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.RangeOptionType',
                '@Org.OData.Core.V1.Description': 'Specifies the comparison operator.'
            },
            'low': {
                '@Org.OData.Core.V1.Description': 'Specifies the comparison value.'
            },
            'high': {
                '@Org.OData.Core.V1.Description': 'Specifies the upper value for comparison operators BT and NB.'
            }
        },
        'RangeSignType': {
            '$Kind': 'EnumType',
            'I': 0,
            'I@Org.OData.Core.V1.Description': 'Include',
            'E': 1,
            'E@Org.OData.Core.V1.Description': 'Exclude'
        },
        'RangeOptionType': {
            '$Kind': 'EnumType',
            'EQ': 0,
            'EQ@Org.OData.Core.V1.Description': 'Equals',
            'BT': 1,
            'BT@Org.OData.Core.V1.Description': 'Between',
            'CP': 2,
            'CP@Org.OData.Core.V1.Description': 'Covers pattern',
            'LE': 3,
            'LE@Org.OData.Core.V1.Description': 'Less or equal',
            'GE': 4,
            'GE@Org.OData.Core.V1.Description': 'Greater or equal',
            'NE': 5,
            'NE@Org.OData.Core.V1.Description': 'Not equals',
            'NB': 6,
            'NB@Org.OData.Core.V1.Description': 'Not between',
            'NP': 7,
            'NP@Org.OData.Core.V1.Description': 'Not covers pattern',
            'GT': 8,
            'GT@Org.OData.Core.V1.Description': 'Greater than',
            'LT': 9,
            'LT@Org.OData.Core.V1.Description': 'Less than'
        }
    }
};
