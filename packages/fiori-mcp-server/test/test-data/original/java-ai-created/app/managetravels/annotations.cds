using { manageTravelsSrv } from '../../srv/service.cds';

annotate manageTravelsSrv.Travels with @UI.DataPoint #status: {
  Value: status_code,
  Title: 'Status',
};
annotate manageTravelsSrv.Travels with @UI.HeaderFacets: [
 { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#status', ID: 'Status' }
];
annotate manageTravelsSrv.Travels with @UI.HeaderInfo: {
  TypeName: 'Travel',
  TypeNamePlural: 'Travels',
  Title: { Value: tripName }
};
annotate manageTravelsSrv.Travels with {
  ID @UI.Hidden
};
annotate manageTravelsSrv.Travels with @UI.Identification: [{ Value: tripName }];
annotate manageTravelsSrv.Travels with {
  tripName @Common.Label: 'Trip Name';
  employee @Common.Label: 'Employee';
  status @Common.Label: 'Status';
  startDate @Common.Label: 'Start Date';
  price @Common.Label: 'Price'
};
annotate manageTravelsSrv.Travels with {
  ID @Common.Text: { $value: tripName, ![@UI.TextArrangement]: #TextOnly };
  status @Common.Text : { $value: status.name, ![@UI.TextArrangement]: #TextOnly };
};
annotate manageTravelsSrv.Travels with {
  status @Common.ValueListWithFixedValues;
};
annotate manageTravelsSrv.Travels with @UI.SelectionFields : [
 tripName,
 status_code
];
annotate manageTravelsSrv.Travels with @UI.LineItem : [
    { $Type: 'UI.DataField', Value: tripName },
    { $Type: 'UI.DataField', Value: employee },
    { $Type: 'UI.DataField', Value: status_code },
    { $Type: 'UI.DataField', Value: startDate },
    { $Type: 'UI.DataField', Value: price }
];
annotate manageTravelsSrv.Travels with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: ID },
    { $Type: 'UI.DataField', Value: tripName },
    { $Type: 'UI.DataField', Value: employee },
    { $Type: 'UI.DataField', Value: status_code },
    { $Type: 'UI.DataField', Value: startDate },
    { $Type: 'UI.DataField', Value: price }
]};
annotate manageTravelsSrv.Travels with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' },
    {
        $Type : 'UI.ReferenceFacet',
        Label : 'Expenses',
        ID : 'Expenses',
        Target : 'Expenses/@UI.LineItem#Expenses',
    },
];
annotate manageTravelsSrv.Expenses with @(
    UI.LineItem #Expenses : [
        {
            $Type : 'UI.DataField',
            Value : name,
            Label : 'name',
        },
        {
            $Type : 'UI.DataField',
            Value : forBusiness,
            Label : 'forBusiness',
        },
    ]
);

