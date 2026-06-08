using scp.cloud from '../db/schema';

service AnalyticsService {
  @readonly
  entity Incidents as projection on cloud.Incidents;
}