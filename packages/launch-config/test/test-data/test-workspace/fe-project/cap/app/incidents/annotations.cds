using IncidentService as service from '../../srv/incidentservice.cds';

annotate service.SafetyIncidents with @(UI : {
    SelectionFields: [incidentStatus_code, category_code, priority_code],
    LineItem : [
        {Value : incidentStatus_code},
        {Value : priority_code},
        {Value : category_code},
        {Value : title}
    ],
    //object page header annotations
    HeaderInfo : { 
        TypeName : 'Incident', 
        TypeNamePlural : 'Incidents', 
        TypeImageUrl : 'sap-icon://alert', 
        Title : {Value : title},
        Description : {Value : description}
    }, 
    HeaderFacets : [{ 
        $Type : 'UI.ReferenceFacet', 
        Target : '@UI.FieldGroup#HeaderGeneralInformation' 
    }], 
    FieldGroup #HeaderGeneralInformation : {Data : [ 
        {Value : priority_code}, 
        {Value : incidentStatus_code}, 
        {Value : category_code}, 
        {$Type : 'UI.DataFieldForAnnotation', 
        Target : 'assignedIndividual/@Communication.Contact', 
        Label : 'Assigned Contact' } 
    ]},
    FieldGroup #IncidentDescription : {Data : [
        {Value : description}
    ]},
    FieldGroup #IncidentDetails : {Data : [
        {Value : title},
        {Value : priority_code},
        {Value : category_code},
        {Value : incidentStatus_code},
    ]}, 
    Facets: [ {
        $Type : 'UI.ReferenceFacet',
        Label : 'Incident Process Flow',
        ID : 'ProcessFlowFacet',
        Target : 'incidentFlow/@UI.LineItem'
    }]
    });
    annotate service.IncidentFlow with @(UI : {
    LineItem : [ 
        {Value : processStep},
        {Value : stepStartDate},
        {Value : stepEndDate},
        {
        $Type  : 'UI.DataField',
        Value : safetyIncident.assignedIndividual.lastName,
        Label  : 'Created By'
        }
    ]
});