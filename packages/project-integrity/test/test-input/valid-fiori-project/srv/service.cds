using { travelManagement } from '../db/schema.cds';

service travelManagementSrv {
  @odata.draft.enabled
  entity Travel as projection on travelManagement.Travel;
  entity Bookings as projection on travelManagement.Bookings;
}