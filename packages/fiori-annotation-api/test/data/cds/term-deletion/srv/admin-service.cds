using {sap.capire.bookshop as my} from '../db/schema';

@Core.ConventionalIDs #Test_BeforeService: true
service AdminService @(_requires : 'authenticated-user', Core.ConventionalIDs #Test_AfterServiceName: true) {
  @UI.TextArrangement #Test_BeforeEntityFirst : #TextLast
  @UI: {TextArrangement #Test_BeforeEntityGroupSinglton : #TextLast}
  @UI: {
    TextArrangement #Test_BeforeEntityGroupMiddle1 : #TextLast,
    TextArrangement #Test_BeforeEntityGroupMiddle2 : #TextLast
  }
  @UI.TextArrangement #Test_BeforeEntityLast  : #TextLast
  @UI.TextArrangement #Test_SandwichEntity1   : #TextLast
  entity Books @(
    UI.TextArrangement #Test_SandwichEntity2: #TextLast,
    UI.TextArrangement #Test_OnEntityBegin: #TextLast,
    UI: {
        TextArrangement #Test_InVocGroupBegin: #TextLast,
        Identification: [{Value:title}],
        TextArrangement #Test_InVocGroupMiddle: #TextLast,
        TextArrangement #Test_InVocGroupMiddle2: #TextLast,
        SelectionFields: [ ID, author_ID, price, currency_code ],
        LineItem: [
            {Value: ID},
            {Value: title},
            {Value: author.name, Label:'{i18n>Author}'},
            {Value: stock},
            {Value: price},
            {Value: currency.symbol, Label:' '},
        ],
        TextArrangement #Test_InVocGroupEnd: #TextLast,
    },
    UI: {
        TextArrangement #Test_OnEntityMiddle: #TextLast,
        TextArrangement #Test_OnEntityMiddle2: #TextLast,
    },
    UI.TextArrangement #Test_OnEntityLast2: #TextLast,
    UI.TextArrangement #Test_OnEntityLast: #TextLast
) as projection on my.Books {
  *,
  @(Common.FieldControl #Test_BeforeElement : #Hidden)
  @Common.FieldControl #Test_SandwichElement1 : #Hidden 
  author
    @(
      Common.FieldControl #Test_SandwichElement2 : #Hidden, 
      Common.ValueList : {
        $Type:'Common.ValueListType',
        CollectionPath : author.name,
      },
      Common: {FieldControl #Test_AfterElement : #Hidden}
    ),
  title @(Common.FieldControl #Test_Element2Lonely : #Hidden) 
} actions {
    // bound actions/functions
    @Common.IsActionCritical #Test_OnActionBoundEmbBefore : false
    action addRating  @(Common.IsActionCritical #Test_OnActionBoundEmbInner: false) (
      // @(UI.ParameterDefaultValue #paramEmbBefore: true) stars: Integer
      // stars @(UI.ParameterDefaultValue #paramEmbInner: true) : Integer
      stars: Integer @(UI.ParameterDefaultValue #Test_OnParamEmbAfter: true)
    );
    
    @Common.IsActionCritical #Test_OnFunctionBoundEmbBefore : false
    function getViewsCount @(Common.IsActionCritical #Test_OnFunctionBoundEmbInner : false) (
    ) returns Integer;
};

  @UI.TextArrangement #Test_Entity2Lonely: #TextLast
  entity Authors as projection on my.Authors;
  
  
  @UI.TextArrangement #Test_Entity2Native: #TextLast
  @title: 'foo'
  entity Orders  as select from my.Orders;

  // unbound actions/functions
  @Common.IsActionCritical #Test_OnActionEmbBefore : false
  action cancelOrder @(Common.IsActionCritical #Test_OnActionEmbInner : false) ( 
    @UI.ParameterDefaultValue #Test_OnParamEmbBefore: false
    orderID :Integer,
    //orderID @(#paramEmbInner) : Integer, 
    reason: String 
    @UI.ParameterDefaultValue #Test_OnParamEmbAfter: false
  );

  @Common.IsActionCritical #Test_OnFunctionEmbBefore : false
  function getOrderStatus @(Common.IsActionCritical #Test_OnFunctionEmbInner : false) (
    orderID @(UI.ParameterDefaultValue #Test_OnParamEmbInner: false): Integer ,
  ) returns Integer

}
