namespace scp.cloud;
using IncidentService as service from './incidentservice';

using {
    cuid
} from '@sap/cds/common';

annotate cuid with {
    ID @(
        title : '{i18n>ID}',
        UI.HiddenFilter,
        Core.Computed
    );
}


annotate service.Incidents with {
    ID @UI.Hidden: true;
    assignedIndividual @UI.Hidden : true;
};

annotate service.Incidents with {
    incidentStatus @Common : {
        Text            : incidentStatus.code,
        TextArrangement : #TextOnly,
        ValueListWithFixedValues
    };
  category @Common : {
        Text            : category.code,
        TextArrangement : #TextOnly,
        ValueListWithFixedValues
    };
  priority @Common : {
        Text            : priority.code,
        TextArrangement : #TextOnly,
        ValueListWithFixedValues
    };
};

annotate service.Category with {
    code @Common : {
        Text            : name,
        TextArrangement : #TextOnly
    }    @title :  '{i18n>Category}'
};

annotate service.Priority with {
    code @Common : {
        Text            : name,
        TextArrangement : #TextOnly
    }    @title :  '{i18n>Priority}'
};

annotate service.IncidentStatus with {
    code @Common : {
        Text            : name,
        TextArrangement : #TextOnly
    }    @title :  '{i18n>IncidentStatus}'
};

annotate service.Incidents with @(
    Aggregation.ApplySupported     : {
        $Type           : 'Aggregation.ApplySupportedType',
        Transformations          : [
            'aggregate',
            'topcount',
            'bottomcount',
            'identity',
            'concat',
            'groupby',
            'filter',
            'expand',
            'top',
            'skip',
            'orderby',
            'search'
        ],
        GroupableProperties : [
        category_code 
        ],
        AggregatableProperties : [
            {
                $Type : 'Aggregation.AggregatablePropertyType',
                Property : ID 
            }
        ]         
    },
    Analytics.AggregatedProperties : [{
        Name                 : 'IncidentsPerCategory',
        AggregationMethod    : 'countdistinct',
        AggregatableProperty : ID,
        ![@Common.Label]     : '{i18n>IncidentsPerCategory}'
    }]
);
