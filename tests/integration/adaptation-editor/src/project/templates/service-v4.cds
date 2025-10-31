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
            },
            {
                $Type: 'UI.ReferenceFacet',
                Label: 'Table Section',
                Target: 'toFirstAssociatedEntity/@UI.LineItem#tableSection'
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
    @UI.LineItem : [ { Value: StringProperty }, { Value: DateProperty},  {
            $Type : 'UI.DataFieldForAction',
            Action : 'Service.approveRootEntity',
            Label : 'Approve',
        },  {
            $Type : 'UI.DataFieldForAction',
            Action : 'Service.callBack',
            Label : 'Callback',
        }]
    @Capabilities.FilterRestrictions : {
        FilterExpressionRestrictions : [
            {
                Property : 'DateProperty',
                AllowedExpressions : 'SingleValue'
            },
        ],
    }
  entity RootEntity {
    key ID              : Integer       @Common.Label: 'Identifier UUID';
        StringProperty  : String        @Common.Label: 'String Property';
        IntegerProperty : Integer       @Common.Label: 'Integer Property';
        NumberProperty  : Decimal(4, 2) @Common.Label: 'Number Property';
        BooleanProperty : Boolean       @Common.Label: 'Boolean Property';
        Currency        : String        @Common.Label: 'Currency';
        TextProperty    : String        @Common.Label: 'Text Property';
        @Common.ValueListWithFixedValues: true
        DateProperty    : Date          @Common.Label: 'Date Property';
        toFirstAssociatedEntity: Association to many FirstAssociatedEntity on toFirstAssociatedEntity.root = $self;
  };
  @UI.LineItem #tableSection: [ { Value: StringProperty }, { Value: DateProperty}, {
            $Type : 'UI.DataFieldForAction',
            Action : 'Service.approveRootEntity',
            Label : 'Approve',
        },  {
            $Type : 'UI.DataFieldForAction',
            Action : 'Service.callBack',
            Label : 'Callback',
        }]
  entity FirstAssociatedEntity {
    key ID              : Integer       @Common.Label: 'Identifier';
        StringProperty  : String        @Common.Label: 'String Property';
        IntegerProperty : Integer       @Common.Label: 'Integer Property';
        NumberProperty  : Decimal(4, 2) @Common.Label: 'Number Property';
        BooleanProperty : Boolean       @Common.Label: 'Boolean Property';
        DateProperty    : Date          @Common.Label: 'Date Property';
        root : Association to RootEntity;
  }
  action approveRootEntity (ID : Integer) returns String;
  action callBack (ID : Integer) returns String;

}
