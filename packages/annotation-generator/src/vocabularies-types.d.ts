declare module '@sap-ux/vocabularies-types/vocabularies/Common' {
    export const enum CommonAnnotationTerms {
        Experimental = 'com.sap.vocabularies.Common.v1.Experimental',
        ServiceVersion = 'com.sap.vocabularies.Common.v1.ServiceVersion',
        ServiceSchemaVersion = 'com.sap.vocabularies.Common.v1.ServiceSchemaVersion',
        Label = 'com.sap.vocabularies.Common.v1.Label',
        Heading = 'com.sap.vocabularies.Common.v1.Heading',
        QuickInfo = 'com.sap.vocabularies.Common.v1.QuickInfo',
        DocumentationRef = 'com.sap.vocabularies.Common.v1.DocumentationRef',
        Text = 'com.sap.vocabularies.Common.v1.Text',
        TextFor = 'com.sap.vocabularies.Common.v1.TextFor',
        ExternalID = 'com.sap.vocabularies.Common.v1.ExternalID',
        ValueList = 'com.sap.vocabularies.Common.v1.ValueList',
        ValueListRelevantQualifiers = 'com.sap.vocabularies.Common.v1.ValueListRelevantQualifiers',
        ValueListWithFixedValues = 'com.sap.vocabularies.Common.v1.ValueListWithFixedValues',
        ValueListMapping = 'com.sap.vocabularies.Common.v1.ValueListMapping',
        FieldControl = 'com.sap.vocabularies.Common.v1.FieldControl'
    }
    export const enum CommonAnnotationTypes {
        ValueListType = 'com.sap.vocabularies.Common.v1.ValueListType',
        ValueListMappingType = 'com.sap.vocabularies.Common.v1.ValueListMappingType',
        ValueListParameterIn = 'com.sap.vocabularies.Common.v1.ValueListParameterIn',
        ValueListParameterInOut = 'com.sap.vocabularies.Common.v1.ValueListParameterInOut',
        ValueListParameterOut = 'com.sap.vocabularies.Common.v1.ValueListParameterOut',
        ValueListParameterDisplayOnly = 'com.sap.vocabularies.Common.v1.ValueListParameterDisplayOnly',
        ValueListParameterFilterOnly = 'com.sap.vocabularies.Common.v1.ValueListParameterFilterOnly',
        ValueListParameterConstant = 'com.sap.vocabularies.Common.v1.ValueListParameterConstant'
    }
}
declare module '@sap-ux/vocabularies-types/vocabularies/Edm_Types' {
    export type PropertyAnnotations = any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
declare module '@sap-ux/vocabularies-types/vocabularies/UI' {
    export type Hidden = any; // eslint-disable-line @typescript-eslint/no-explicit-any
    export const enum UIAnnotationTerms {
        HeaderInfo = 'com.sap.vocabularies.UI.v1.HeaderInfo',
        Identification = 'com.sap.vocabularies.UI.v1.Identification',
        LineItem = 'com.sap.vocabularies.UI.v1.LineItem',
        SelectionFields = 'com.sap.vocabularies.UI.v1.SelectionFields',
        FieldGroup = 'com.sap.vocabularies.UI.v1.FieldGroup',
        Facets = 'com.sap.vocabularies.UI.v1.Facets',
        Hidden = 'com.sap.vocabularies.UI.v1.Hidden',
        HiddenFilter = 'com.sap.vocabularies.UI.v1.HiddenFilter',
        DataField = 'com.sap.vocabularies.UI.v1.DataField'
    }
    export const enum UIAnnotationTypes {
        HeaderInfoType = 'com.sap.vocabularies.UI.v1.HeaderInfoType',
        DataField = 'com.sap.vocabularies.UI.v1.DataField',
        DataFieldForAnnotation = 'com.sap.vocabularies.UI.v1.DataFieldForAnnotation',
        DataFieldForAction = 'com.sap.vocabularies.UI.v1.DataFieldForAction',
        DataFieldWithUrl = 'com.sap.vocabularies.UI.v1.DataFieldWithUrl',
        ReferenceFacet = 'com.sap.vocabularies.UI.v1.ReferenceFacet',
        CollectionFacet = 'com.sap.vocabularies.UI.v1.CollectionFacet',
        FieldGroupType = 'com.sap.vocabularies.UI.v1.FieldGroupType'
    }
}
