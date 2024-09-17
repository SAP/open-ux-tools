namespace sap.ui.lcnc;

using {
  managed,
  Country,
  Currency,
  cuid
} from '@sap/cds/common';

entity Capex : managed {
  key ID                  : UUID @(Core.Computed : true);
      requestid           : String;
      title               : String;
      firstname           : String;
      lastname            : String;
      email               : String;
      userid              : String;
      comments            : String;
      totalcost           : String;
      type                : Association to CapexType;
      capex               : String;
      opex                : String;
      currency            : Currency;
      roi                 : String;
      irr                 : String;
      country             : Country;
      business_unit       : Association to BusinessUnits;
      description         : String;
      energy_efficiency   : String;
      co2_efficiency      : String;
      energy_cost_savings : String;
      water_savings       : String;
      other_savings       : Association to many OtherSavings on other_savings.capex = $self;
      items               : Composition of many OtherSavings.Items on items.capex = $self;
}

entity OtherSavings {
  key id: Integer;
  capex: Association to Capex;
  description: String;
  items       : Association to many OtherSavings.Items on items.savings_id = $self;
}

entity OtherSavings.Items {
  key pos: Integer;
  savings_id: Association to OtherSavings;
  capex: Association to Capex;
  itemId: String;
  count: Decimal;
}

entity CapexType : managed {
  key type            : String;
      typedescription : String;
}

entity BusinessUnits : managed {
  key business_unit : String;
      name        : String;
      email       : String;
      address     : String @UI.Hidden;
      add         : Association to many Capex on add.business_unit = $self;
      code        : UUID;
      phone       : String;
      mobile      : String;
      country      : String;
}

type Identifier : String(100)@(title : '{i18n>Identifier}');

//=============================================================================
// IDs
//=============================================================================
@cds.autoexpose
aspect identified @(assert.unique.identifier : [identifier]) : cuid {
  identifier : Identifier not null;
}

annotate identified with @(
  Common.SemanticKey : [identifier],
  UI.Identification  : [{Value : identifier}]
) {
  ID         @Common : {
    Text            : identifier,
    TextArrangement : #TextOnly
  };
  identifier @(Common.FieldControl : #Mandatory);
}

annotate cuid with {
  ID @(
    title : '{i18n>ID}',
    UI.HiddenFilter,
    Core.Computed
  );
}

// entity
entity Consultants : identified {
  name     : String  @title        : '{i18n>Suppliers.name}';
  address  : String; // Generate Default Lable with value 'address'
  street   : String  @title        : '{i18n>Suppliers.street}';
  building : String  @title        : '{i18n>Suppliers.building}';
  postCode : String  @title        : '{i18n>Suppliers.postCode}';
  city     : String  @Common.Label : '{i18n>Suppliers.phone}';
  country  : Country @title        : '{i18n>Suppliers.country}';
  phone    : String  @Common.Label : '{i18n>Suppliers.phone}';
}
