using IncidentService as service from './incidentservice';

//text arrangement
annotate service.SafetyIncidents with {
    incidentStatus @Common : {
        Text            : incidentStatus.name,
        TextArrangement : #TextOnly
    };
    category       @Common : {
        Text            : category.name,
        TextArrangement : #TextOnly
    };
    priority       @Common : {
        Text            : priority.name,
        TextArrangement : #TextOnly
    };
};

annotate service.Category with {
    code @Common : {
        Text            : name,
        TextArrangement : #TextOnly
    }    @title :  'Category'
};

annotate service.Priority with {
    code @Common : {
        Text            : name,
        TextArrangement : #TextOnly
    }    @title :  'Priority'
};

annotate service.IncidentStatus with {
    code @Common : {
        Text            : name,
        TextArrangement : #TextOnly
    }    @title :  'Incident Status'
};

//analytical aggregate for interactive chart
annotate service.SafetyIncidents with @(Analytics.AggregatedProperties : [{
    Name                : 'IncidentsPerCategory',
    AggregationMethod    : 'countdistinct',
    AggregatableProperty : ID,
    ![@Common.Label]     : 'Incidents per category'
}]);
