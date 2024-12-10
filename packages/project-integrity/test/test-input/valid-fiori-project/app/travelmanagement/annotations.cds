using { travelManagementSrv } from '../../srv/service.cds';

annotate travelManagementSrv.Travel with @UI.DataPoint #status: {
  Value: status,
  Title: 'Status',
};
annotate travelManagementSrv.Travel with @UI.DataPoint #tripStartDate: {
  Value: tripStartDate,
  Title: 'Trip Start Date',
};
annotate travelManagementSrv.Travel with @UI.DataPoint #tripEndDate: {
  Value: tripEndDate,
  Title: 'Trip End Date',
};
annotate travelManagementSrv.Travel with @UI.HeaderFacets: [
 { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#status', ID: 'Status' },
 { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#tripStartDate', ID: 'TripStartDate' },
 { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#tripEndDate', ID: 'TripEndDate' }
];
annotate travelManagementSrv.Travel with @UI.HeaderInfo: {
  TypeName: 'Travel',
  TypeNamePlural: 'Travels'
};
annotate travelManagementSrv.Travel with {
  tripName @Common.Label: 'Trip Name';
  employee @Common.Label: 'Employee';
  status @Common.Label: 'Status';
  tripStartDate @Common.Label: 'Trip Start Date';
  tripEndDate @Common.Label: 'Trip End Date';
  priceUSD @Common.Label: 'Price USD';
  bookings @Common.Label: 'Bookings'
};
annotate travelManagementSrv.Travel with @UI.SelectionFields : [
 status,
 tripStartDate,
 tripEndDate
];
annotate travelManagementSrv.Travel with @UI.LineItem: [
    { $Type: 'UI.DataField', Value: tripName },
    { $Type: 'UI.DataField', Value: employee },
    { $Type: 'UI.DataField', Value: status },
    { $Type: 'UI.DataField', Value: tripStartDate },
    { $Type: 'UI.DataField', Value: tripEndDate },
    { $Type: 'UI.DataField', Value: priceUSD }
];
annotate travelManagementSrv.Travel with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: tripName },
    { $Type: 'UI.DataField', Value: employee },
    { $Type: 'UI.DataField', Value: status },
    { $Type: 'UI.DataField', Value: tripStartDate },
    { $Type: 'UI.DataField', Value: tripEndDate },
    { $Type: 'UI.DataField', Value: priceUSD }
]};
annotate travelManagementSrv.Bookings with @UI.LineItem #Travel_bookings: [
    { $Type: 'UI.DataField', Value: employee },
    { $Type: 'UI.DataField', Value: airlines },
    { $Type: 'UI.DataField', Value: bookingDate },
    { $Type: 'UI.DataField', Value: flightDate },
    { $Type: 'UI.DataField', Value: priceUSD }
];
annotate travelManagementSrv.Travel with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' },
  { $Type: 'UI.ReferenceFacet', ID: 'bookings', Label: 'Bookings', Target: 'bookings/@UI.LineItem#Travel_bookings' }
];
annotate travelManagementSrv.Bookings with {
  travel @Common.ValueList: {
    CollectionPath: 'Travel',
    Parameters    : [
      {
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: travel_ID,
        ValueListProperty: 'ID'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'tripName'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'employee'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'status'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'tripStartDate'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'tripEndDate'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'priceUSD'
      },
    ],
  }
};
annotate travelManagementSrv.Bookings with @UI.DataPoint #bookingDate: {
  Value: bookingDate,
  Title: 'Booking Date',
};
annotate travelManagementSrv.Bookings with @UI.DataPoint #flightDate: {
  Value: flightDate,
  Title: 'Flight Date',
};
annotate travelManagementSrv.Bookings with @UI.HeaderFacets: [
 { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#bookingDate', ID: 'BookingDate' },
 { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#flightDate', ID: 'FlightDate' }
];
annotate travelManagementSrv.Bookings with @UI.HeaderInfo: {
  TypeName: 'Booking',
  TypeNamePlural: 'Bookings'
};
annotate travelManagementSrv.Bookings with {
  employee @Common.Label: 'Employee';
  airlines @Common.Label: 'Airlines';
  bookingDate @Common.Label: 'Booking Date';
  flightDate @Common.Label: 'Flight Date';
  priceUSD @Common.Label: 'Price USD';
  travel @Common.Label: 'Travel'
};
annotate travelManagementSrv.Bookings with @UI.SelectionFields: [
  travel_ID
];
annotate travelManagementSrv.Bookings with @UI.LineItem: [
    { $Type: 'UI.DataField', Value: employee },
    { $Type: 'UI.DataField', Value: airlines },
    { $Type: 'UI.DataField', Value: bookingDate },
    { $Type: 'UI.DataField', Value: flightDate },
    { $Type: 'UI.DataField', Value: priceUSD },
    { $Type: 'UI.DataField', Label: 'Travel', Value: travel_ID }
];
annotate travelManagementSrv.Bookings with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: employee },
    { $Type: 'UI.DataField', Value: airlines },
    { $Type: 'UI.DataField', Value: bookingDate },
    { $Type: 'UI.DataField', Value: flightDate },
    { $Type: 'UI.DataField', Value: priceUSD },
    { $Type: 'UI.DataField', Label: 'Travel', Value: travel_ID }
]};
annotate travelManagementSrv.Bookings with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];