using scp.cloud from '../db/schema';

service IncidentService {

    entity Incidents               as projection on cloud.Incidents;

    entity IncidentFlow            as projection on cloud.IncidentFlow;

    entity IncidentProcessTimeline as projection on cloud.IncidentProcessTimeline;

    entity ProcessingThreshold as projection on cloud.ProcessingThreshold;

    entity Individual              as projection on cloud.Individual;

    entity Category                as projection on cloud.Category;

    entity Priority                as projection on cloud.Priority;
    
}
