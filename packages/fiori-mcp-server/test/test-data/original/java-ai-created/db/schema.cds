using { sap.common.CodeList } from '@sap/cds/common';

namespace manageTravels;

entity TravelsStatusCodeList : CodeList {
  @Common.Text : { $value: name, ![@UI.TextArrangement]: #TextOnly }
  key code : String(50);
}

entity Travels {
  key ID: UUID;
  tripName: String(50) @assert.unique @mandatory;
  employee: String(50);
  status: Association to TravelsStatusCodeList;
  startDate: Date;
  price: Decimal;
  Expenses: Association to many Expenses on Expenses.travels = $self;
}

entity Expenses {
  key ID: UUID;
  name: String(50);
  forBusiness: Boolean;
  travels: Association to Travels;
}
