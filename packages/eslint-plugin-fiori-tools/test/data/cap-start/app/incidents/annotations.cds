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
        $Type : 'UI.DataField',
        Value : createdBy,
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
