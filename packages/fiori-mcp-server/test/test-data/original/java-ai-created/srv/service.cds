using { manageTravels } from '../db/schema.cds';

service manageTravelsSrv {
  @Aggregation.ApplySupported  : {
    $Type : 'Aggregation.ApplySupportedType',
    AggregatableProperties : [
        { $Type : 'Aggregation.AggregatablePropertyType', Property : price },
    ],
    GroupableProperties : [
        tripName,
        employee,
        status_code,
        startDate,
    ]
  }
  @odata.draft.enabled
  entity Travels as projection on manageTravels.Travels;
  entity Expenses as projection on manageTravels.Expenses;
}