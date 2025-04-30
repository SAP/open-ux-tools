service Service {
        @UI: {
        HeaderInfo: {
            TypeName: 'Root Entity',
            TypeNamePlural: 'Root Entities',
            Title: { Value: Name }
        },
        Facets: [
            {
                $Type: 'UI.ReferenceFacet',
                Label: 'General Information',
                Target: '@UI.FieldGroup#GeneralInfo'
            }
        ],
        FieldGroup#GeneralInfo: {
            Data: [
                { $Type: 'UI.DataField', Value: StringProperty },
                { $Type: 'UI.DataField', Value: IntegerProperty }
            ]
        }
    }
    @UI.LineItem : [ { Value: StringProperty }]
  entity RootEntity {
    key ID              : Integer       @Common.Label: 'Identifier';
        StringProperty  : String        @Common.Label: 'String Property';
        IntegerProperty : Integer       @Common.Label: 'Integer Property';
        NumberProperty  : Decimal(4, 2) @Common.Label: 'Number Property';
        BooleanProperty : Boolean       @Common.Label: 'Boolean Property';
        Currency        : String        @Common.Label: 'Currency';
        TextProperty    : String        @Common.Label: 'Text Property';
  }
}
