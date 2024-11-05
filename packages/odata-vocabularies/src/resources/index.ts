import type { CSDL } from '@sap-ux/vocabularies/CSDL';

import Aggregation from './Org.OData.Aggregation.V1';
import Auth from './Org.OData.Authorization.V1';
import Capabilities from './Org.OData.Capabilities.V1';
import Core from './Org.OData.Core.V1';
import Measures from './Org.OData.Measures.V1';
import Repeatability from './Org.OData.Repeatability.V1';
import Temporal from './Org.OData.Temporal.V1';
import Validation from './Org.OData.Validation.V1';
import ODataJSON from './Org.OData.JSON.V1';
import Analytics from './com.sap.vocabularies.Analytics.v1';
import CDS from './com.sap.vocabularies.CDS.v1';
import CodeList from './com.sap.vocabularies.CodeList.v1';
import Common from './com.sap.vocabularies.Common.v1';
import Communication from './com.sap.vocabularies.Communication.v1';
import DataIntegration from './com.sap.vocabularies.DataIntegration.v1';
import DirectEdit from './com.sap.vocabularies.DirectEdit.v1';
import Graph from './com.sap.vocabularies.Graph.v1';
import Hierarchy from './com.sap.vocabularies.Hierarchy.v1';
import ODM from './com.sap.vocabularies.ODM.v1';
import PDF from './com.sap.vocabularies.PDF.v1';
import PersonalData from './com.sap.vocabularies.PersonalData.v1';
import Session from './com.sap.vocabularies.Session.v1';
import UI from './com.sap.vocabularies.UI.v1';
import HTML5 from './com.sap.vocabularies.HTML5.v1';
import ObjectModel from './com.sap.cds.vocabularies.ObjectModel';
import AnalyticsDetails from './com.sap.cds.vocabularies.AnalyticsDetails';
import AsyncAPI from './com.sap.vocabularies.AsyncAPI.v1';

export type CdsVocabularyNamespace =
    | 'com.sap.cds.vocabularies.ObjectModel'
    | 'com.sap.cds.vocabularies.AnalyticsDetails';

export type SapVocabularyNamespace =
    | 'com.sap.vocabularies.Analytics.v1'
    | 'com.sap.vocabularies.CDS.v1'
    | 'com.sap.vocabularies.CodeList.v1'
    | 'com.sap.vocabularies.Common.v1'
    | 'com.sap.vocabularies.Communication.v1'
    | 'com.sap.vocabularies.DataIntegration.v1'
    | 'com.sap.vocabularies.DirectEdit.v1'
    | 'com.sap.vocabularies.Graph.v1'
    | 'com.sap.vocabularies.Hierarchy.v1'
    | 'com.sap.vocabularies.ODM.v1'
    | 'com.sap.vocabularies.PDF.v1'
    | 'com.sap.vocabularies.PersonalData.v1'
    | 'com.sap.vocabularies.Session.v1'
    | 'com.sap.vocabularies.UI.v1'
    | 'com.sap.vocabularies.HTML5.v1'
    | 'com.sap.vocabularies.AsyncAPI.v1';

export type SapVocabularyAlias =
    | 'Analytics'
    | 'CDS'
    | 'CodeList'
    | 'Common'
    | 'Communication'
    | 'DataIntegration'
    | 'DirectEdit'
    | 'Graph'
    | 'Hierarchy'
    | 'ODM'
    | 'PDF'
    | 'PersonalData'
    | 'Session'
    | 'UI'
    | 'HTML5'
    | 'AsyncAPI';

export type OasisVocabularyNamespace =
    | 'Org.OData.Aggregation.V1'
    | 'Org.OData.Authorization.V1'
    | 'Org.OData.Capabilities.V1'
    | 'Org.OData.Core.V1'
    | 'Org.OData.Measures.V1'
    | 'Org.OData.Repeatability.V1'
    | 'Org.OData.Temporal.V1'
    | 'Org.OData.Validation.V1'
    | 'Org.OData.JSON.V1';

export type OasisVocabularyAlias =
    | 'Aggregation'
    | 'Auth'
    | 'Capabilities'
    | 'Core'
    | 'Measures'
    | 'Repeatability'
    | 'Temporal'
    | 'Validation'
    | 'JSON';

export type CdsVocabularyAlias = 'ObjectModel' | 'AnalyticsDetails';

export type VocabularyNamespace = SapVocabularyNamespace | OasisVocabularyNamespace | CdsVocabularyNamespace;
export type VocabularyAlias = SapVocabularyAlias | OasisVocabularyAlias | CdsVocabularyAlias;

export const NAMESPACE_TO_ALIAS: Map<VocabularyNamespace, VocabularyAlias> = new Map([
    ['Org.OData.Aggregation.V1', 'Aggregation'],
    ['Org.OData.Authorization.V1', 'Auth'],
    ['Org.OData.Capabilities.V1', 'Capabilities'],
    ['Org.OData.Core.V1', 'Core'],
    ['Org.OData.Measures.V1', 'Measures'],
    ['Org.OData.Repeatability.V1', 'Repeatability'],
    ['Org.OData.Temporal.V1', 'Temporal'],
    ['Org.OData.Validation.V1', 'Validation'],
    ['Org.OData.JSON.V1', 'JSON'],
    ['com.sap.vocabularies.Analytics.v1', 'Analytics'],
    ['com.sap.vocabularies.CDS.v1', 'CDS'],
    ['com.sap.vocabularies.CodeList.v1', 'CodeList'],
    ['com.sap.vocabularies.Common.v1', 'Common'],
    ['com.sap.vocabularies.Communication.v1', 'Communication'],
    ['com.sap.vocabularies.DataIntegration.v1', 'DataIntegration'],
    ['com.sap.vocabularies.DirectEdit.v1', 'DirectEdit'],
    ['com.sap.vocabularies.Graph.v1', 'Graph'],
    ['com.sap.vocabularies.AsyncAPI.v1', 'AsyncAPI'],
    ['com.sap.vocabularies.Hierarchy.v1', 'Hierarchy'],
    ['com.sap.vocabularies.ODM.v1', 'ODM'],
    ['com.sap.vocabularies.PDF.v1', 'PDF'],
    ['com.sap.vocabularies.PersonalData.v1', 'PersonalData'],
    ['com.sap.vocabularies.Session.v1', 'Session'],
    ['com.sap.vocabularies.UI.v1', 'UI'],
    ['com.sap.vocabularies.HTML5.v1', 'HTML5'],
    ['com.sap.cds.vocabularies.ObjectModel', 'ObjectModel'],
    ['com.sap.cds.vocabularies.AnalyticsDetails', 'AnalyticsDetails']
]);

export const ALIAS_TO_NAMESPACE: Map<VocabularyAlias, VocabularyNamespace> = new Map([
    ['Aggregation', 'Org.OData.Aggregation.V1'],
    ['Auth', 'Org.OData.Authorization.V1'],
    ['Capabilities', 'Org.OData.Capabilities.V1'],
    ['Core', 'Org.OData.Core.V1'],
    ['Measures', 'Org.OData.Measures.V1'],
    ['Repeatability', 'Org.OData.Repeatability.V1'],
    ['Temporal', 'Org.OData.Temporal.V1'],
    ['Validation', 'Org.OData.Validation.V1'],
    ['JSON', 'Org.OData.JSON.V1'],
    ['Analytics', 'com.sap.vocabularies.Analytics.v1'],
    ['CDS', 'com.sap.vocabularies.CDS.v1'],
    ['CodeList', 'com.sap.vocabularies.CodeList.v1'],
    ['Common', 'com.sap.vocabularies.Common.v1'],
    ['Communication', 'com.sap.vocabularies.Communication.v1'],
    ['DataIntegration', 'com.sap.vocabularies.DataIntegration.v1'],
    ['DirectEdit', 'com.sap.vocabularies.DirectEdit.v1'],
    ['Graph', 'com.sap.vocabularies.Graph.v1'],
    ['AsyncAPI', 'com.sap.vocabularies.AsyncAPI.v1'],
    ['Hierarchy', 'com.sap.vocabularies.Hierarchy.v1'],
    ['ODM', 'com.sap.vocabularies.ODM.v1'],
    ['PDF', 'com.sap.vocabularies.PDF.v1'],
    ['PersonalData', 'com.sap.vocabularies.PersonalData.v1'],
    ['Session', 'com.sap.vocabularies.Session.v1'],
    ['UI', 'com.sap.vocabularies.UI.v1'],
    ['HTML5', 'com.sap.vocabularies.HTML5.v1'],
    ['ObjectModel', 'com.sap.cds.vocabularies.ObjectModel'],
    ['AnalyticsDetails', 'com.sap.cds.vocabularies.AnalyticsDetails']
]);

const vocabularies: Record<string, CSDL> = {
    'Org.OData.Aggregation.V1': Aggregation,
    'Org.OData.Authorization.V1': Auth,
    'Org.OData.Capabilities.V1': Capabilities,
    'Org.OData.Core.V1': Core,
    'Org.OData.Measures.V1': Measures,
    'Org.OData.Repeatability.V1': Repeatability,
    'Org.OData.Temporal.V1': Temporal,
    'Org.OData.Validation.V1': Validation,
    'Org.OData.JSON.V1': ODataJSON,
    'com.sap.vocabularies.Analytics.v1': Analytics,
    'com.sap.vocabularies.CDS.v1': CDS,
    'com.sap.vocabularies.CodeList.v1': CodeList,
    'com.sap.vocabularies.Common.v1': Common,
    'com.sap.vocabularies.Communication.v1': Communication,
    'com.sap.vocabularies.DataIntegration.v1': DataIntegration,
    'com.sap.vocabularies.DirectEdit.v1': DirectEdit,
    'com.sap.vocabularies.Graph.v1': Graph,
    'com.sap.vocabularies.AsyncAPI.v1': AsyncAPI,
    'com.sap.vocabularies.Hierarchy.v1': Hierarchy,
    'com.sap.vocabularies.ODM.v1': ODM,
    'com.sap.vocabularies.PDF.v1': PDF,
    'com.sap.vocabularies.PersonalData.v1': PersonalData,
    'com.sap.vocabularies.Session.v1': Session,
    'com.sap.vocabularies.UI.v1': UI,
    'com.sap.vocabularies.HTML5.v1': HTML5,
    'com.sap.cds.vocabularies.ObjectModel': ObjectModel,
    'com.sap.cds.vocabularies.AnalyticsDetails': AnalyticsDetails
};

export default vocabularies;
