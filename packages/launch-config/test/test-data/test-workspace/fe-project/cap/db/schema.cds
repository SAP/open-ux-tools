namespace scp.cloud;

using {
  managed,
  sap.common
} from '@sap/cds/common';

type Url : String;

entity SafetyIncidents : managed {
  key ID : UUID;
  title                  : String(50)                    @title : 'Title';
  category               : Association to Category       @title : 'Category';
  priority               : Association to Priority       @title : 'Priority';
  incidentStatus         : Association to IncidentStatus @title : 'Incident Status';
  description            : String(1000)                  @title : 'Description';
  incidentResolutionDate : Date                          @title : 'ResolutionDate';
  assignedIndividual     : Association to Individual;
  incidentFlow         : Association to many IncidentFlow on incidentFlow.safetyIncident = $self;
  incidentProcessTimeline : Association to many IncidentProcessTimeline on incidentProcessTimeline.safetyIncident = $self;
}

entity IncidentFlow : managed {
  key id : UUID;
  processStep: String(30) @title : 'Process Step';
  stepStatus: String(10) @title  : 'Process Step Status';
  criticality: Integer;
  stepStartDate: Date @title : 'Starting at';
  stepEndDate: Date @title : 'Ending at';
  safetyIncident : Association to SafetyIncidents;
}

entity IncidentProcessTimeline : managed {
  key id : UUID;
  text : String;
  type : String;
  startTime: DateTime;
  endTime: DateTime;
  safetyIncident : Association to SafetyIncidents;  
}

entity Individual : managed{
  Key ID : UUID;
  businessPartnerID : String;
  addressID : String @UI.Hidden ;
  lastName     : String    @title : 'Created By';
  safetyIncidents : Association to many SafetyIncidents on safetyIncidents.assignedIndividual = $self;
}

entity IncidentsCodeList : common.CodeList {
  key code : String(20);
}

entity Category : IncidentsCodeList {}
entity Priority : IncidentsCodeList {}
entity IncidentStatus : IncidentsCodeList {}