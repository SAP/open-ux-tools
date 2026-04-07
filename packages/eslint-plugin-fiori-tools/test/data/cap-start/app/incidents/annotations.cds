using IncidentService as service from '../../srv/incidentservice';
using from '../../srv/common';

annotate service.Incidents with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Value: title,
    },
    {
        $Type: 'UI.DataField',
        Value: category_code,
        Label: 'CatCode',
    },
    {
        $Type : 'UI.DataField',
        Value : createdAt,
    },
    {
        $Type : 'UI.DataField',
        Value : description,
    },
    {
        $Type : 'UI.DataField',
        Value : priority_code,
    },
    {
        $Type : 'UI.DataFieldWithNavigationPath',
        Target: processingThreshold,
        Value : processingThreshold.processingDays,
        Label : 'NavPathColumn',
    },
    {
        $Type: 'UI.DataFieldWithUrl',
        Url  : 'https://example.com',
        Value: description,
        Label: 'withURL',
    }
]);

annotate service.Incidents with @(
    UI.Facets         : [{
        $Type : 'UI.ReferenceFacet',
        Target: 'incidentFlow/@UI.LineItem#table_section',
        Label : 'table_section',
        ID    : 'table_section',
    }, ],
);

annotate service.IncidentFlow with @(UI.LineItem #table_section: [
    {
        $Type : 'UI.DataField',
        Value : criticality,
        Label : 'criticality',
    },
    {
        $Type : 'UI.DataField',
        Value : id,
        Label : 'id',
    },
    {
        $Type : 'UI.DataField',
        Value : stepStatus,
    },
]);