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
  incidentPhotos         : Association to many IncidentPhotos on incidentPhotos.safetyIncident = $self;
  incidentFlow         : Association to many IncidentFlow on incidentFlow.safetyIncident = $self;
}

entity IncidentFlow : managed {
  key id : UUID;
  processStep: String(30) @title : 'Process Step';
  stepStatus: String(10) @title  : 'Process Step Status';
  criticality: Integer;
  safetyIncident : Association to SafetyIncidents;
}

entity Individual : managed{
  Key ID : UUID;
  firstName    : String    @title : 'First Name';
  lastName     : String    @title : 'Last Name';
  emailAddress : String    @title : 'Email Address';
  safetyIncidents : Association to many SafetyIncidents on safetyIncidents.assignedIndividual = $self;
}

entity IncidentPhotos : managed {
  key id : UUID;
  @Core.isMediaType : true imageType : String;
  @Core.MediaType: ImageType image : LargeBinary;
  safetyIncident : Association to SafetyIncidents;
}

entity IncidentsCodeList : common.CodeList {
  key code : String(20);
}

entity Category : IncidentsCodeList {}
entity Priority : IncidentsCodeList {}
entity IncidentStatus : IncidentsCodeList {}

annotate SafetyIncidents with @(UI : {
    Identification : [{Value : title}]
}){
    incidentStatus_code @Common : {
        Text            : incidentStatus.name,
        TextArrangement : #TextOnly
    }
};

annotate Category with {
  code @Common : {
        Text            : name,
        TextArrangement : #TextOnly
    } @title: 'Category';
};

annotate Priority with {
  code @Common : {
        Text            : name,
        TextArrangement : #TextOnly
    } @title: 'Priority'
};

annotate IncidentStatus with {
  code @Common : {
        Text            : name,
        TextArrangement : #TextOnly
    } @title: 'Incident Status'
};

annotate Individual with @(Communication.Contact : {
    fn   : lastName,
    kind : #org,
    tel  : [{
        uri  : '911',
        type : #preferred
    }]
});

annotate SafetyIncidents with @(Analytics.AggregatedProperties : [{
    Name                 : 'IncidentsPerCategory',
    AggregationMethod    : 'countdistinct',
    AggregatableProperty : category_code
}],
);