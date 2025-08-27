import type { Location } from './common';

// UI Node Types (OP)
export const UI_NODE_TYPE_HEADER_INFO = 'headerInfo';
export const UI_NODE_TYPE_PAGE_ACTIONS = 'pageActions';
export const UI_NODE_TYPE_FORM = 'form';
export const UI_NODE_TYPE_HEADER_SECTIONS = 'headerSections';
export const UI_NODE_TYPE_SECTION = 'section';
export const UI_NODE_TYPE_FORM_FIELD = 'formField';
export const UI_NODE_TYPE_CONNECTED_FIELDS = 'connectedFields';
export const UI_NODE_TYPE_ACTION = 'action';
export const UI_NODE_TYPE_ACTION_GROUP = 'actionGroup';
export const UI_NODE_TYPE_GENERIC_ACTIONS = 'genericActions';
export const UI_NODE_TYPE_GENERIC_ACTION = 'genericAction';
export const UI_NODE_TYPE_CHART = 'chart';
export const UI_NODE_TYPE_CONTACT = 'contact';
export const UI_NODE_TYPE_DATA_POINT = 'dataPoint';
export const UI_NODE_TYPE_ANALYTICAL_CHART = 'analyticalChart';
export const UI_NODE_TYPE_NAVIGATION = 'navigation';

// UI Node Types (LR)
export const UI_NODE_TYPE_VIEWS = 'views'; // for multi view LR: parent node containing views listed in manifest json (views/paths) - could be of type 'list' or 'analyticalChart'
export const UI_NODE_TYPE_LIST = 'list';
export const UI_NODE_TYPE_COLUMN = 'column';
export const UI_NODE_TYPE_FILTER_FIELDS = 'filterFields';
export const UI_NODE_TYPE_FILTER_FIELD = 'filterField';
export const UI_NODE_TYPE_VISUAL_FILTERS = 'visualFilters';
export const UI_NODE_TYPE_VISUAL_FILTER = 'visualFilter';

export interface TooComplexData extends UINodeCore {
    tooComplex?: boolean;
    tooComplexLocations?: Location[];
}

export type UINodeId = number[];

export interface UINodeCore {
    nodeType: string;
    nodeId: UINodeId;
    annotationPath: string; // absolute path to the annotation which is basis for the UI Node (as in specification module)
    macroNodeId?: string; // id of macro node which is basis for this UI node
    allowedParentNodes?: Record<string, boolean>; // allowed parents when moving node; set of stringified UINodeIds
    allowedSubnodeTypes?: string[]; // allowed node types for creation of new subnodes, format: '<nodeType>[/<subType>]', e.g. 'formField', 'section/UI.Identification'
    suppressedSubnodeTypes?: { subNodeType: string; tooltip: string }[];
}

export interface UINodeValue extends UINodeCore {
    nodeType: string;
    readonly?: boolean; // true: no subnodes can be added/moved/deleted (e.g. for `list` if UI.LineItem annotation is readonly )
    readonlyTooltip?: string; // tooltip to explain why UINodeValue is readonly
    location: Location; // location responsible for existence of this UI Node (e.g. for a section: entry in UI.Facets)
    subnodes: UINode[]; // some subnodes may be represented by TooComplexData only (to make indexes stable)
    info?: string; // specific infos for node e.g: message for navigation node Cross-app navigation is to be enabled in Fiori launchpad and target app
    sectionType?: string;
}

export type UINode = UINodeValue | TooComplexData;

export interface UIDialogsContext {
    analyticalChartSupport?: {
        creationEnabled: boolean; // true: if LR without analytical chart, but all prerequisites for adding it are fulfilled, false otherwise
        creationTooltip: string; // tooltip to be displayed for "create analytical chart" button
        deletionEnabled?: boolean; // true: existing analytical chart can be deleted
        deletionTooltip?: string; // tooltip to be displayed for "delete analytical chart" button
        addToMultiViewEnabled?: boolean; // true: if LR without analytical chart or multi view LR, but prerequisites for adding Analytical Chart are fulfilled for at least one entity
        addToMultiViewTooltip?: string; // tooltip to be displayed for "add analytical chart to multi view report"
    };
    suppressTableViewDeletionNodeId?: UINodeId; // multi view LR: nodeId of last table view on base entity set (should not be deleted)
}
