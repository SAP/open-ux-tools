using { sap.capire.bookshop as my } from '../db/schema';

service AdminService @(_requires:'authenticated-user') {
  entity Books as projection on my.Books actions { 
    action addRating (
      stars: Integer
    );
    action copy () returns Books;
  };
  entity Authors as projection on my.Authors;
  entity Orders as select from my.Orders actions { action copyOrder() returns Orders; }
  
  function getOrderStatus (
    orderID: Integer
  ) returns Integer;

  action unBoundTestAction();
  action unBoundActionWithParam(param1 : Integer);
  function unBoundFunction() returns String;
  entity testBookView   as select from Books;
}
