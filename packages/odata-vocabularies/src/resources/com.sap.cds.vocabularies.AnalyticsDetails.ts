export default {
    'com.sap.cds.vocabularies.AnalyticsDetails': {
        '$Alias': 'AnalyticsDetails',
        '@Org.OData.Core.V1.Description': 'CDS annotation for AnalyticsDetails (subset)',
        'measureType': {
            '$Kind': 'Term',
            '$AppliesTo': ['Property'],
            '@Org.OData.Core.V1.Description': '(CDS annotation) Defines the measure type (TODO)',
            '@Org.OData.Validation.V1.AllowedValues': [
                {
                    'Value': 'BASE',
                    '@Org.OData.Core.V1.Description': 'TODO description for BASE'
                },
                {
                    'Value': 'RESTRICTION',
                    '@Org.OData.Core.V1.Description': 'TODO description for RESTRICTION'
                },
                {
                    'Value': 'CALCULATION',
                    '@Org.OData.Core.V1.Description': 'TODO description for CALCULATION'
                }
            ]
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
                '@Org.OData.Core.V1.Description': 'Description exception aggregation behavior (TODO)',
                '@Org.OData.Validation.V1.AllowedValues': [
                    {
                        'Value': 'SUM',
                        '@Org.OData.Core.V1.Description': 'TODO description for SUM'
                    },
                    {
                        'Value': 'MIN',
                        '@Org.OData.Core.V1.Description': 'TODO description for MIN'
                    },
                    {
                        'Value': 'MAX',
                        '@Org.OData.Core.V1.Description': 'TODO description for MAX'
                    },
                    {
                        'Value': 'COUNT',
                        '@Org.OData.Core.V1.Description': 'TODO description for COUNT'
                    },
                    {
                        'Value': 'COUNT_DISTINCT',
                        '@Org.OData.Core.V1.Description': 'TODO description for COUNT_DISTINCT'
                    },
                    {
                        'Value': 'AVG',
                        '@Org.OData.Core.V1.Description': 'TODO description for AVG'
                    },
                    {
                        'Value': 'STD',
                        '@Org.OData.Core.V1.Description': 'TODO description for STD'
                    },
                    {
                        'Value': 'FIRST',
                        '@Org.OData.Core.V1.Description': 'TODO description for FIRST'
                    },
                    {
                        'Value': 'LAST',
                        '@Org.OData.Core.V1.Description': 'TODO description for LAST'
                    },
                    {
                        'Value': 'NHA',
                        '@Org.OData.Core.V1.Description': 'TODO description for NHA'
                    }
                ]
            },
            'exceptionAggregationElements': {
                '$Collection': true,
                '$Type': 'Edm.PropertyPath',
                '@Org.OData.Core.V1.Description': 'TODO description for exception aggregation elements'
            }
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
                '@Org.OData.Core.V1.Description': 'Description variable usageType (TODO)',
                '@Org.OData.Validation.V1.AllowedValues': [
                    {
                        'Value': 'PARAMETER',
                        '@Org.OData.Core.V1.Description': 'TODO description for PARAMETER'
                    },
                    {
                        'Value': 'FILTER',
                        '@Org.OData.Core.V1.Description': 'TODO description for FILTER'
                    },
                    {
                        'Value': 'FORMULA',
                        '@Org.OData.Core.V1.Description': 'TODO description for FORMULA'
                    }
                ]
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
                '@Org.OData.Core.V1.Description': 'Description variable selectionType (TODO)',
                '@Org.OData.Validation.V1.AllowedValues': [
                    {
                        'Value': 'SINGLE',
                        '@Org.OData.Core.V1.Description': 'TODO range SINGLE'
                    },
                    {
                        'Value': 'INTERVAL',
                        '@Org.OData.Core.V1.Description': 'TODO range INTERVAL'
                    },
                    {
                        'Value': 'RANGE',
                        '@Org.OData.Core.V1.Description': 'TODO range RANGE'
                    },
                    {
                        'Value': 'HIERARCHY_NODE',
                        '@Org.OData.Core.V1.Description': 'TODO range HIERARCHY_NODE'
                    }
                ]
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
                '@Org.OData.Core.V1.Description': 'Description range sign (TODO)',
                '@Org.OData.Validation.V1.AllowedValues': [
                    {
                        'Value': 'I',
                        '@Org.OData.Core.V1.Description': 'TODO range I (include)'
                    },
                    {
                        'Value': 'E',
                        '@Org.OData.Core.V1.Description': 'TODO range E (exclude)'
                    }
                ]
            },
            'option': {
                '@Org.OData.Core.V1.Description': 'Description range option (TODO)',
                '@Org.OData.Validation.V1.AllowedValues': [
                    {
                        'Value': 'EQ',
                        '@Org.OData.Core.V1.Description': 'TODO description for EQ'
                    },
                    {
                        'Value': 'BT',
                        '@Org.OData.Core.V1.Description': 'TODO description for BT'
                    },
                    {
                        'Value': 'CP',
                        '@Org.OData.Core.V1.Description': 'TODO description for CP'
                    },
                    {
                        'Value': 'LE',
                        '@Org.OData.Core.V1.Description': 'TODO description for LE'
                    },
                    {
                        'Value': 'GE',
                        '@Org.OData.Core.V1.Description': 'TODO description for GE'
                    },
                    {
                        'Value': 'NE',
                        '@Org.OData.Core.V1.Description': 'TODO description for NE'
                    },
                    {
                        'Value': 'NB',
                        '@Org.OData.Core.V1.Description': 'TODO description for NB'
                    },
                    {
                        'Value': 'NP',
                        '@Org.OData.Core.V1.Description': 'TODO description for NP'
                    },
                    {
                        'Value': 'GT',
                        '@Org.OData.Core.V1.Description': 'TODO description for GT'
                    },
                    {
                        'Value': 'LT',
                        '@Org.OData.Core.V1.Description': 'TODO description for LT'
                    }
                ]
            },

            'low': {
                '@Org.OData.Core.V1.Description': 'TODO description for range type low'
            },
            'high': {
                '@Org.OData.Core.V1.Description': 'TODO description for range type high'
            }
        },
        'HierarchyBindingType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Type of hierarchy binding (TODO)',
            'type': {
                '@Org.OData.Core.V1.Description': 'Description hierarchy binding type type (TODO)',
                '@Org.OData.Validation.V1.AllowedValues': [
                    {
                        'Value': 'PARAMETER',
                        '@Org.OData.Core.V1.Description': 'TODO range PARAMETER'
                    },
                    {
                        'Value': 'CONSTANT',
                        '@Org.OData.Core.V1.Description': 'TODO range CONSTANT'
                    },
                    {
                        'Value': 'SYSTEM_FIELD',
                        '@Org.OData.Core.V1.Description': 'TODO range SYSTEM_FIELD'
                    }
                ]
            },
            'value': {
                '@Org.OData.Core.V1.Description': 'TODO description for hierarchy binding type value'
            },
            'variableSequence': {
                '$Type': 'Edm.Int16',
                '$Nullable': true,
                '@Org.OData.Core.V1.Description': 'TODO description for hierarchy binding type variable sequence'
            }
        }
    }
};
