import type { ArtifactType } from '@sap/ux-specification/dist/types/src';
import { v2 } from '@sap/ux-specification/dist/types/src';
import type { JSONSchema4 } from 'json-schema';
import type { ObjectAggregation } from '../ObjectAggregation';
import type { I18nBundle } from '@sap-ux/i18n';
import type { AllowedMoveRange, Location } from './common';
import type { UIDialogsContext, UINode } from './annotations';

export * from './annotations';
export * from './common';

export const DATA_FIELD_ACTION = 'DataFieldForAction';
export const DATA_FIELD_FOR_INTENT_BASED_NAVIGATION = 'DataFieldForIntentBasedNavigation';
export const DATA_FIELD_FOR_ACTION_GROUP = 'DataFieldForActionGroup';

export const ANNOTATION_TYPES_SEPARATOR = '::';
export const CUSTOM_VIEW_PREFIX = 'customView(';

export interface PageData {
    [key: string]: unknown;
}

export enum AggregationCreationForm {
    AnalyticalChart = 'AnalyticalChart',
    AnalyticalChartView = 'AnalyticalChartView',
    ChartSection = 'ChartSection',
    CustomAction = 'CustomAction',
    CustomSection = 'CustomSection',
    CustomColumn = 'CustomColumn',
    CustomColumnV4 = 'CustomColumnV4',
    CustomViewV4 = 'CustomViewV4',
    DataPointSection = 'DataPointSection',
    Generic = 'Generic',
    MacrosChart = 'MacrosChart',
    MacrosFilterBar = 'MacrosFilterBar',
    MacrosTable = 'MacrosTable',
    NativeAction = 'NativeAction',
    NativeNavigation = 'NativeNavigation',
    NativeBasicColumn = 'Basic',
    NativeChartColumn = 'Chart',
    NativeContactColumn = 'Contact',
    NativeContactField = 'NativeContactField',
    NativeConnectedFields = 'NativeConnectedFields',
    NativeField = 'NativeField',
    NativeFilterFields = 'NativeFilterFields',
    NativeVisualFilters = 'NativeVisualFilters',
    NativeGroupSection = 'NativeGroupSection',
    NativeIdentification = 'NativeIdentification',
    NativeRatingColumn = 'Rating',
    NativeProgressColumn = 'Progress',
    NativeSection = 'NativeSection',
    NativeTableSection = 'NativeTableSection',
    ProgressSection = 'ProgressSection',
    RatingSection = 'RatingSection',
    TableView = 'TableView',
    CustomSubSection = 'CustomSubSection',
    CustomHeaderSection = 'CustomHeaderSection',
    CustomFilterField = 'CustomFilterField'
}

export const CUSTOM_AGGREGATION_FORMS = [
    AggregationCreationForm.Generic,
    AggregationCreationForm.CustomSection,
    AggregationCreationForm.CustomColumn
];

export const enum TableColumnExtensionType {
    ResponsiveTableColumnsExtension = 'ResponsiveTableColumnsExtension',
    AnalyticalTableColumnsExtension = 'AnalyticalTableColumnsExtension',
    TreeTableColumnsExtension = 'TreeTableColumnsExtension',
    GridTableColumnsExtension = 'GridTableColumnsExtension'
}

export const TABLE_TYPE_EXTENSION_MAP: Map<v2.TableTypeV2, TableColumnExtensionType> = new Map([
    [v2.TableTypeV2.ResponsiveTable, TableColumnExtensionType.ResponsiveTableColumnsExtension],
    [v2.TableTypeV2.GridTable, TableColumnExtensionType.GridTableColumnsExtension],
    [v2.TableTypeV2.AnalyticalTable, TableColumnExtensionType.AnalyticalTableColumnsExtension],
    [v2.TableTypeV2.TreeTable, TableColumnExtensionType.TreeTableColumnsExtension]
]);

export const ANNOTATION_CREATION_FORM = 'annotation';
export const SCHEMA_CREATION_FORM = 'schema';
export const EXTERNAL_CREATION_FORM = 'external';
export const FacetTitlePrefix = 'Facet ID: ';
export type CreationFormKind =
    | typeof ANNOTATION_CREATION_FORM
    | typeof SCHEMA_CREATION_FORM
    | typeof EXTERNAL_CREATION_FORM;

export interface CreationFormOptions {
    name: AggregationCreationForm;
    kind: CreationFormKind;
    /**
     * i18n key for the title
     */
    title: string;
    tooltip?: string;
    disabled: boolean;
    /**
     * Title when form disabled
     */
    disabledTitle?: string;
    visualizationIcon?: string;
    aggregationName?: string;
    buttonText?: string;
    buttonId?: string;
}

// Inverted map of TABLE_TYPE_EXTENSION_MAP
export const EXTENSION_TABLE_TYPE_MAP = new Map(
    [...TABLE_TYPE_EXTENSION_MAP.entries()].map(([key, value]) => [value, key])
);

export enum PropertiesType {
    Flat,
    AnyOf
}

export enum SortingOptions {
    Enabled = 'Enabled',
    Excluded = 'Excluded',
    Readonly = 'Readonly'
}

export enum AggregationType {
    Object = 'Object',
    Array = 'Array'
}

export enum AggregationActions {
    Delete = 'Delete',
    OpenSource = 'OpenSource',
    Edit = 'Edit'
}

export interface AggregationSubAction {
    id: string;
    text: string;
}

export interface SupportedAggregationAction {
    type: AggregationActions;
    disabled?: boolean;
    title?: string;
    subActions?: AggregationSubAction[];
}

export type SupportedAggregationActions = Array<SupportedAggregationAction | AggregationActions>;

export enum AggregationSortBy {
    ViewNode = 'ViewNode'
}

export enum PendingChange {
    Creation = 'Creation',
    MoveDnD = 'MoveDnD',
    MoveButton = 'MoveButton'
}

interface ModelParserDefinitions {
    [key: string]: JSONSchema4;
}

export interface ParserContext {
    filePath?: string;
}

type ModelParserMethod<T> = (
    aggregation: T,
    currentNode: JSONSchema4,
    currentAnnotationNode: UINode | undefined,
    name: string | undefined,
    path: PropertyPath,
    parserContext: ParserContext
) => void;

export interface ModelParserParams<T> {
    parse: ModelParserMethod<T>;
    definitions: ModelParserDefinitions;
    annotations?: PageAnnotations;
}

export interface AllowedDropAggregation {
    aggregation: ObjectAggregation;
    range?: AllowedMoveRange[];
}

// From '@sap/ux-application-modeler-types'

export type PropertyPath = Array<string | number>;

export enum ValidationState {
    Valid,
    Invalid,
    Skipped,
    ReadOnly
}

// Move to annotations???
export interface PageAnnotations {
    nodes: UINode[];
    dynamicNodes: { [nodeId: string]: UINode };
    dialogsContext?: UIDialogsContext;
    errorMessage?: string;
}

// Types for move payloads
export const NODE_MOVE_ANNOTATION = 'annotation';
export const NODE_MOVE_CONFIG = 'schema';
export interface SchemaNodesMove {
    type: typeof NODE_MOVE_CONFIG;
    path: PropertyPath;
    oldIndex: number;
    newIndex: number;
    key?: string;
    // Additional data for sorting. In case of custom sections - it is position and relatedFacet.
    data?: any;
    // Controls processUpdateTask of WatchersHandler
    waitForSchemaUpdate?: boolean;
    // Is target macro element
    isMacro?: boolean;
}

export enum PropertyMessageType {
    /**
     * Reports an error.
     */
    Error = 'error',
    /**
     * Reports a warning.
     */
    Warning = 'warning',
    /**
     * Reports an information.
     */
    Info = 'info'
}

export interface PropertyMessage {
    type?: PropertyMessageType;
    text: string;
    dialogText?: string;
    location?: Location;
    deletable?: boolean;
    preventMessagePropagation?: boolean;
}

export interface SettingOption {
    schema: JSONSchema4;
    value?: unknown;
    pattern?: string;
    description?: string;
    state?: ValidationState;
    isAtomic?: boolean;
    // Language dependency. String represents annotation comment
    i18nClassification?: string;
    name: string;
    freeText?: boolean;
    artifactType?: ArtifactType;
    required?: boolean;
    minimum?: number;
    messages?: PropertyMessage[];
    locations?: Location[];
    disabled?: boolean;
    displayName?: string;
}

export interface CustomNodeAnnotationTarget {
    control: string;
    customSectionKey?: string;
    navProperty?: string;
    qualifier?: string;
}

export const SAP_ANNOTATION_NAMESPACE = '@com.sap.vocabularies.UI.v1';

export const TRANSLATION_BUNDLE_APP = 'app';
export const TRANSLATION_BUNDLE_ANNOTATION = 'annotation';
export const TRANSLATION_BUNDLE_SERVICE = 'service';
export const TRANSLATION_BUNDLE_UI5 = 'ui5';

export interface TranslationBundles {
    [TRANSLATION_BUNDLE_APP]: I18nBundle;
    [TRANSLATION_BUNDLE_ANNOTATION]: I18nBundle;
    [TRANSLATION_BUNDLE_UI5]: I18nBundle;
    [TRANSLATION_BUNDLE_SERVICE]: I18nBundle;
}

export type TranslationBundleKeys =
    | typeof TRANSLATION_BUNDLE_APP
    | typeof TRANSLATION_BUNDLE_ANNOTATION
    | typeof TRANSLATION_BUNDLE_SERVICE
    | typeof TRANSLATION_BUNDLE_UI5;

export enum AggregationNodeType {
    customAction = 'customAction',
    customColumn = 'customColumn',
    customSection = 'customSection',
    customFilterField = 'customFilterField',
    rootNode = 'rootNode',
    views = 'views'
}
