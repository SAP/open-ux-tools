using scp.cloud from '../db/schema';

service IncidentService  @(_requires:'authenticated-user') {
    @UI.TextArrangement #Test_EmbBeforeEntity: #TextLast
    entity Incidents @(UI.TextArrangement #Test_EmbInEntity: #TextLast)               
        as projection on cloud.Incidents actions {
            @Common.IsActionCritical #Test_EmbBeforeEmbAction : true 
            action create @(Common.IsActionCritical #Test_EmbInEmbAction : true) (
                @UI.ParameterDefaultValue #Test_EmbBeforeEmbParam : true
                par1 : Integer,
                par2 @(UI.ParameterDefaultValue #Test_EmbInEmbParam : true): Integer,
                par3 : Integer @UI.ParameterDefaultValue #Test_EmbAfterEmbParam : true
            )
        };

    entity IncidentFlow            as projection on cloud.IncidentFlow {
        id,
        @(Common.FieldControl #Test_EmbBeforeElement : #Hidden) processStep,
        stepStatus @(Common.FieldControl #Test_EmbAfterElement : #Hidden),
        incident
    };

    @UI.TextArrangement #Test_EmbBeforeEntity: #TextLast
    entity IncidentProcessTimeline @(UI.TextArrangement #Test_EmbInEntity: #TextLast) as projection on cloud.IncidentProcessTimeline;


    @Common.IsActionCritical #Test_EmbBeforeAction : true 
    action removeIncident @(Common.IsActionCritical #Test_EmbInAction : true) (
        @UI.ParameterDefaultValue #Test_EmbBeforeParam : true
                par1 : Integer,
                par2 @(UI.ParameterDefaultValue #Test_EmbInParam : true): Integer,
                par3 : Integer @UI.ParameterDefaultValue #Test_EmbAfterParam : true
        );

    entity ProcessingThreshold as projection on cloud.ProcessingThreshold;

    entity Individual              as projection on cloud.Individual;

    entity Category                as projection on cloud.Category;

    entity Priority                as projection on cloud.Priority;
    
}