namespace sap.capire.bookshop;
using { Currency, managed, cuid } from '@sap/cds/common';

entity Books : managed {
  key ID : Integer;
  title  : localized String(111);
  Title  : localized String(111); // to test names differing only in upper/lower case
  TITLE  : localized String(111); // to test names differing only in upper/lower case
  descr  : localized String(1111);
  author : Association to Authors;
  stock  : Integer;
  price  : Decimal(9,2);
  currency : Currency;
}

entity Authors : managed {
  key author_ID : Integer;
  name   : String(111);
  dateOfBirth  : Date;
  dateOfDeath  : Date;
  placeOfBirth : String;
  placeOfDeath : String;
  books  : Association to many Books on books.author = $self;
}

@cds.persistence.exists
entity Orders : cuid, managed {
  OrderNo  : String @(title:'Order Number', assert.format: 'orderFormat'); 
  Items    : Composition of many OrderItems on Items.parent = $self;
  total    : Decimal(9,2) @readonly;
  currency : Currency @assert: {notNull: false, format: 'currencyFormat'};
  pricing_Terms: Pricing_Terms;
}
entity OrderItems : cuid {
  parent    : Association to Orders;
  book      : Association to Books;
  amount    : Integer;
  netAmount : Decimal(9,2);
}

entity PriceList as select from Books {
  ID,
  title,
  price,
  author.name as author
};

type Pricing_Terms {
  my_currency             : Currency;
  my_grossAmountIndicator : Boolean;
}

aspect identified : cuid {
    identifier : String(111) not null;
}

annotate identified with {
    ID         @Common : {
        Text            : identifier,
        TextArrangement : #TextOnly
    };
    identifier @(Common.FieldControl : #Mandatory);
}
