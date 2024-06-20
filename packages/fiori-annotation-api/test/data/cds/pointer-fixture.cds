using IncidentService as service from '../../srv/incidentservice';

// TODO remove all the content
/**
 * Get neighboring token index (ignoring comment tokens) @param
 * tokens @param index - current token index @param offset
 * @returns
 */

 
annotate IncidentService.Incidents with @UI: {
    LineItem        :  {
        ![@Analytics.DrillURL] : 'test',
        $value:  [
            // testing
            {Value: assignedIndividual_id},
            {Value: createdAt, },
            // hello
            {
                ![@Common.Heading] : 'Heading', 
                Value: 'something else', 
            }
    
        ]
    },

    FieldGroup #test: {Data: [{
        Value            : category.code,

        Criticality      : #Critical,
        IconUrl          : 'sap://icon-test',
        ![@UI.Importance]: #High,
    }, ], },
};

annotate IncidentService.Incidents with @UI.Chart;

annotate IncidentService.Incidents with @UI.LineItem #test: [{
    Value                 : modifiedAt,
    Label                 : 'ok',
    ![@UI.Hidden],
    ![@Common.Application]: {
        $Type               : 'Common.ApplicationType',
        Component           : 'accepted',
        ServiceId           : 'Actions',
        ![@Common.Timestamp]: timestamp'2020-01-01 12:23:23',
    },
}];

annotate IncidentService.IncidentFlow with @Aggregation: {ApplySupported: {$value: {AggregatableProperties: [{Property}, ], }}, };

annotate IncidentService.IncidentFlow {
    createdAt
    @UI.Placeholder: 'testing';
    createdBy
    @Analytics     : {RolledUpPropertyCount: 12, };
    criticality @Measures.Unit: description
};

annotate IncidentService.Incidents with { category @Common.ValueList: {
    CollectionPath : 'Category',
    Parameters : [{
      $Type : 'Common.ValueListParameterInOut',
      LocalDataProperty : category_code,
      ValueListProperty : 'code',
    }, {
      $Type : 'Common.ValueListParameterInOut',
      ValueListProperty : 'code1', 
      LocalDataProperty : description  // comment 1
    }, {
      $Type : 'Common.ValueListParameterOut',
      ValueListProperty : 'code2',
      LocalDataProperty : title  // comment 2
    }],
}};

// 8
annotate IncidentService.Incidents with @(
    UI.HeaderInfo.TypeNamePlural : 'TypeNamePlural was here on app',
    UI : {
        HeaderInfo.Title : {
            Value : title,
        },
        HeaderInfo : {
            Description.Value : 'sample',
        }
        LineItem #xyz: []
    },
);
