namespace MockGen.Sample;

service CatalogService {
    entity Products {
        key ID            : Integer;
            ProductName   : String(80) not null;
            SupplierEmail : String(120);
            Price         : Decimal(12, 2) not null;
            CurrencyCode  : String(3);
            IsActive      : Boolean not null;
    }
}
