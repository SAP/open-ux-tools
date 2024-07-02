using scp.cloud from '../db/schema';

service IncidentService {
//@odata.draft.enabled
@readonly
entity SafetyIncidents @(cds.redirection.target:false) as projection on cloud.SafetyIncidents;

entity IncidentFlow as projection on cloud.IncidentFlow;

entity IncidentPhotos @(cds.redirection.target:true) as projection on cloud.IncidentPhotos;

entity IncidentsByCategory @(cds.redirection.target:false) as select from cloud.SafetyIncidents {count(ID) as categories:Integer,key category} Group By category;

@readonly entity Individual as projection on cloud.Individual;
@readonly entity Category as projection on cloud.Category;
@readonly entity Priority as projection on cloud.Priority;
}
