namespace travelManagement;

entity Travel {
  key ID: UUID;
  tripName: String(50);
  employee: String(50);
  status: String(20);
  tripStartDate: Date;
  tripEndDate: Date;
  priceUSD: Decimal;
  bookings: Association to many Bookings on bookings.travel = $self;
}

entity Bookings {
  key ID: UUID;
  employee: String(50);
  airlines: String(50);
  bookingDate: Date;
  flightDate: Date;
  priceUSD: Decimal;
  travel: Association to Travel;
}
