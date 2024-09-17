using IncidentService as service from '../../../../srv/incidentservice';

annotate service.SafetyIncidents with @(
    UI.Chart                                   : {
        ChartType          : #Column,
        Dimensions         : [category_code],
        DimensionAttributes: [{
            Dimension: category_code,
            Role     : #Series
        }],

        Measures           : [IncidentsPerCategory],
        MeasureAttributes  : [{
            Measure: IncidentsPerCategory,
            Role   : #Axis1
        }]
    },

    Aggregation.ApplySupported                 : {
        GroupableProperties     : [ID, ],
        AggregatableProperties  : [
            {Property: incidentStatus_code},
            {Property: priority_code}
        ],
        CustomAggregationMethods: ['Custom.concat']
    },

    Analytics.AggregatedProperty #agg_min_limit: {
        $Type               : 'Analytics.AggregatedPropertyType',
        Name                : 'minLimit',
        AggregationMethod   : 'min',
        AggregatableProperty: incidentStatus_code,
        ![@Common.Label]    : 'Minimum Processing Limit'
    },
    Analytics.AggregatedProperty #agg_max      : {
        $Type               : 'Analytics.AggregatedPropertyType',
        Name                : 'agg_max',
        AggregatableProperty: priority_code,
        AggregationMethod   : 'max',
        ![@Common.Label]    : 'Maximum Processing Days',
    },
);
