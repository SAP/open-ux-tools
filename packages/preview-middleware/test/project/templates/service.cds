service Service {
    @UI: {
        HeaderInfo: {
            TypeName: 'Root Entity',
            TypeNamePlural: 'Root Entities',
            Title: { Value: StringProperty }
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
        },
        SelectionFields: [StringProperty, DateProperty]
    }
    @UI.LineItem : [ { Value: StringProperty }, { Value: DateProperty}]
    @Capabilities.FilterRestrictions : {
        FilterExpressionRestrictions : [
            {
                Property : 'DateProperty',
                AllowedExpressions : 'SingleValue'
            },
        ],
    }
  entity RootEntity {
    key ID              : Integer       @Common.Label: 'Identifier';
        StringProperty  : String        @Common.Label: 'String Property';
        IntegerProperty : Integer       @Common.Label: 'Integer Property';
        NumberProperty  : Decimal(4, 2) @Common.Label: 'Number Property';
        BooleanProperty : Boolean       @Common.Label: 'Boolean Property';
        Currency        : String        @Common.Label: 'Currency';
        TextProperty    : String        @Common.Label: 'Text Property';
        @Common.ValueListWithFixedValues: true
        DateProperty    : Date          @Common.Label: 'Date Property';
  }
}
