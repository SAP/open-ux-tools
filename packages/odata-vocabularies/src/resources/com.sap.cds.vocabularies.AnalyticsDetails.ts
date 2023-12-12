export default {
    'com.sap.cds.vocabularies.AnalyticsDetails': {
        '$Alias': 'AnalyticsDetails',
        '@Org.OData.Core.V1.Description': 'CDS annotation for AnalyticsDetails (subset)',
        'measureType': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property'],
            '$Type': 'AnalyticsDetails.MeasureTypeEnumeration',
            '@Org.OData.Core.V1.Description': '(CDS annotation) Defines the measure type (TODO)'
        },
        'MeasureTypeEnumeration': {
            '$Kind': 'EnumType',
            'BASE': 0,
            'BASE@Org.OData.Core.V1.Description': 'Description for BASE (TODO)',
            'RESTRICTION': 1,
            'RESTRICTION@Org.OData.Core.V1.Description': 'Description for RESTRICTION (TODO)',
            'CALCULATION': 2,
            'CALCULATION@Org.OData.Core.V1.Description': 'Description for CALCULATION (TODO)'
        },
        'exceptionAggregationSteps': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property'],
            '$Collection': true,
            '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.ExceptionAggregationStepType',
            '@Org.OData.Core.V1.Description': 'TODO description for exception aggregation steps'
        },
        'ExceptionAggregationStepType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Type of exception aggregation step (TODO)',
            '@Org.OData.Core.V1.LongDescription': '(Long Description) Type of exception aggregation step (TODO)',
            'exceptionAggregationBehavior': {
                '$Type': 'AnalyticsDetails.ExceptionAggregationBehaviorType',
                '@Org.OData.Core.V1.Description': 'Description exception aggregation behavior (TODO)'
            },

            'exceptionAggregationElements': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'TODO description for exception aggregation elements'
            }
        },
        'ExceptionAggregationBehaviorType': {
            '$Kind': 'EnumType',
            'SUM': 0,
            'SUM@Org.OData.Core.V1.Description': 'Description for SUM (TODO)',
            'MIN': 1,
            'MIN@Org.OData.Core.V1.Description': 'Description for MIN (TODO)',
            'MAX': 2,
            'MAX@Org.OData.Core.V1.Description': 'Description for MAX (TODO)',
            'COUNT': 3,
            'COUNT@Org.OData.Core.V1.Description': 'Description for COUNT (TODO)',
            'COUNT_DISTINCT': 4,
            'COUNT_DISTINCT@Org.OData.Core.V1.Description': 'Description for COUNT_DISTINCT (TODO)',
            'AVG': 5,
            'AVG@Org.OData.Core.V1.Description': 'Description for AVG (TODO)',
            'STD': 6,
            'STD@Org.OData.Core.V1.Description': 'Description for STD (TODO)',
            'FIRST': 7,
            'FIRST@Org.OData.Core.V1.Description': 'Description for FIRST (TODO)',
            'LAST': 8,
            'LAST@Org.OData.Core.V1.Description': 'Description for LAST (TODO)',
            'NHA': 9,
            'NHA@Org.OData.Core.V1.Description': 'Description for NHA (TODO)'
        },
        'variable': {
            '$Kind': 'Term',
            '$AppliesTo': ['Parameter'],
            '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.VariableType',
            '@Org.OData.Core.V1.Description': 'TODO description for variable'
        },
        'VariableType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Type of variable (TODO)',
            '@Org.OData.Core.V1.LongDescription': '(Long Description) Type of variable (TODO)',
            'usageType': {
                '$Type': 'AnalyticsDetails.VariableUsageTypeEnumeration',
                '@Org.OData.Core.V1.Description': 'Description variable usageType (TODO)'
            },
            'referenceElement': {
                '$Type': 'Edm.PropertyPath',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'TODO description for variable reference element'
            },
            'mandatory': {
                '$Type': 'Edm.Boolean',
                '$Nullable': true,
                '$DefaultValue': false,
                '@Org.OData.Core.V1.Description': 'TODO description for variable mandatory'
            },
            'defaultValue': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'TODO description for variable default value'
            },
            'defaultValueHigh': {
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'TODO description for variable default value high'
            },
            'defaultHierarchyNode': {
                '$Nullable': true,
                '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.HierarchyNodeType',
                '@Org.OData.Core.V1.Description': 'TODO description for default hierarchy node'
            },
            'defaultRanges': {
                '$Nullable': true,
                '$Collection': true,
                '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.RangeType',
                '@Org.OData.Core.V1.Description': 'TODO description for variable default ranges'
            },
            'selectionType': {
                '$Nullable': true,
                '$Type': 'AnalyticsDetails.VariableSelectionTypeEnumeration',
                '@Org.OData.Core.V1.Description': 'Description variable selectionType (TODO)'
            },
            'multipleSelections': {
                '$Type': 'Edm.Boolean',
                '$Nullable': true,
                '$DefaultValue': true,
                '@Org.OData.Core.V1.Description': 'TODO description for variable multiple selections'
            },
            'hierarchyBinding': {
                '$Nullable': true,
                '$Collection': true,
                '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.HierarchyBindingType',
                '@Org.OData.Core.V1.Description': 'TODO description for hierarchy binding'
            },
            'hierarchyAssociation': {
                '$Nullable': true,
                '$Type': 'Edm.NavigationPropertyPath',
                '@Org.OData.Core.V1.Description': 'TODO description for hierarchy association'
            }
        },
        'VariableUsageTypeEnumeration': {
            '$Kind': 'EnumType',
            'PARAMETER': 0,
            'PARAMETER@Org.OData.Core.V1.Description': 'Description for PARAMETER (TODO)',
            'FILTER': 1,
            'FILTER@Org.OData.Core.V1.Description': 'Description for FILTER (TODO)',
            'FORMULA': 2,
            'FORMULA@Org.OData.Core.V1.Description': 'Description for FORMULA (TODO)'
        },
        'VariableSelectionTypeEnumeration': {
            '$Kind': 'EnumType',
            'SINGLE': 0,
            'SINGLE@Org.OData.Core.V1.Description': 'Description for SINGLE (TODO)',
            'INTERVAL': 1,
            'INTERVAL@Org.OData.Core.V1.Description': 'Description for INTERVAL (TODO)',
            'RANGE': 2,
            'RANGE@Org.OData.Core.V1.Description': 'RANGE for FORMULA (TODO)',
            'HIERARCHY_NODE': 3,
            'HIERARCHY_NODE@Org.OData.Core.V1.Description': 'RANGE for HIERARCHY_NODE (TODO)'
        },
        'HierarchyNodeType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Type of hierarchy node (TODO)',
            '@Org.OData.Core.V1.LongDescription': '(Long Description) Type of hierarchy node (TODO)',
            'nodeType': {
                '@Org.OData.Core.V1.Description': 'TODO description for hierarchy node type code'
            },
            'node': {
                '$Collection': true,
                '$Type': 'com.sap.cds.vocabularies.AnalyticsDetails.NodeEntryType',
                '@Org.OData.Core.V1.Description': 'TODO description for hierarchy node node'
            }
        },
        'NodeEntryType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Type of hierarchy node entry (TODO)',
            'element': {
                '@Org.OData.Core.V1.Description': 'TODO description for hierarchy node entry element'
            },
            'value': {
                '@Org.OData.Core.V1.Description': 'TODO description for hierarchy node entry value'
            }
        },
        'RangeType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Type of range (TODO)',
            'sign': {
                '$Type': 'AnalyticsDetails.RangeSignType',
                '@Org.OData.Core.V1.Description': 'Description range sign (TODO)'
            },
            'option': {
                '$Type': 'AnalyticsDetails.RangeOptionType',
                '@Org.OData.Core.V1.Description': 'Description range option (TODO)'
            },

            'low': {
                '@Org.OData.Core.V1.Description': 'TODO description for range type low'
            },
            'high': {
                '@Org.OData.Core.V1.Description': 'TODO description for range type high'
            }
        },
        'RangeSignType': {
            '$Kind': 'EnumType',
            'I': 0,
            'I@Org.OData.Core.V1.Description': 'Description for I (TODO)',
            'E': 1,
            'E@Org.OData.Core.V1.Description': 'Description for E (TODO)'
        },
        'RangeOptionType': {
            '$Kind': 'EnumType',
            'EQ': 0,
            'EQ@Org.OData.Core.V1.Description': 'Description for EQ (TODO)',
            'BT': 1,
            'BT@Org.OData.Core.V1.Description': 'Description for BT (TODO)',
            'CP': 2,
            'CP@Org.OData.Core.V1.Description': 'Description for CP (TODO)',
            'LE': 3,
            'LE@Org.OData.Core.V1.Description': 'Description for LE (TODO)',
            'GE': 4,
            'GE@Org.OData.Core.V1.Description': 'Description for GE (TODO)',
            'NE': 5,
            'NE@Org.OData.Core.V1.Description': 'Description for NE (TODO)',
            'NB': 6,
            'NB@Org.OData.Core.V1.Description': 'Description for NB (TODO)',
            'NP': 7,
            'NP@Org.OData.Core.V1.Description': 'Description for NP (TODO)',
            'GT': 8,
            'GT@Org.OData.Core.V1.Description': 'Description for GT (TODO)',
            'LT': 9,
            'LT@Org.OData.Core.V1.Description': 'Description for LT (TODO)'
        },
        'HierarchyBindingType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Type of hierarchy binding (TODO)',
            'type': {
                '$Type': 'AnalyticsDetails.HierarchyBindingTypeEnumeration',
                '@Org.OData.Core.V1.Description': 'Description hierarchy binding type type (TODO)'
            },
            'value': {
                '@Org.OData.Core.V1.Description': 'TODO description for hierarchy binding type value'
            },
            'variableSequence': {
                '$Type': 'Edm.Int16',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'TODO description for hierarchy binding type variable sequence'
            }
        },
        'HierarchyBindingTypeEnumeration': {
            '$Kind': 'EnumType',
            'PARAMETER': 0,
            'PARAMETER@Org.OData.Core.V1.Description': 'Description for PARAMETER (TODO)',
            'CONSTANT': 1,
            'CONSTANT@Org.OData.Core.V1.Description': 'Description for CONSTANT (TODO)',
            'SYSTEM_FIELD': 2,
            'SYSTEM_FIELD@Org.OData.Core.V1.Description': 'Description for SYSTEM_FIELD (TODO)'
        }
    }
};
