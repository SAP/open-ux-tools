import type { UI5FlexLayer, ManifestNamespace } from '@sap-ux/project-access';
import type { DestinationAbapTarget, UrlAbapTarget } from '@sap-ux/system-access';
import type { Adp, BspApp } from '@sap-ux/ui5-config';
import type { AdaptationProjectType, OperationsType } from '@sap-ux/axios-extension';
import type { Editor } from 'mem-fs-editor';
import type { ResourceModel } from './writer/creation';

export interface DescriptorVariant {
    layer: UI5FlexLayer;
    reference: string;
    id: string;
    namespace: string;
    content: DescriptorVariantContent[];
}

export interface DescriptorVariantContent {
    changeType: string;
    content: Record<string, unknown>;
    texts?: string;
}

export interface ToolsSupport {
    id: string;
    version: string;
    toolsId: string;
}

/**
 * Reduce the options exposed as target configuration.
 */
type AbapTarget = DestinationAbapTarget | Pick<UrlAbapTarget, 'url' | 'client' | 'scp'>;

export interface AdpPreviewConfig {
    target: AbapTarget;

    /**
     * If set to true then certification validation errors are ignored.
     */
    ignoreCertErrors?: boolean;
}

export interface OnpremApp {
    /** Application variant id. */
    id: string;
    /** Reference associated with the ID of the base application. */
    reference: string;
    layer: FlexLayer;
    title?: string;
    fioriId?: string;
    ach?: string;
    /** Optional: Application variant change content. */
    content?: Content[];
    appType: ApplicationType;
    /** Optional: Description about i18n.properties. */
    i18nDescription?: string;
    i18nModels?: ResourceModel[];
}

export interface CloudApp extends OnpremApp {
    /** bspName associated with the ABAP Cloud repository name of the base application. */
    bspName: string;
    /** Cloud app active languages. */
    languages: Language[];
}

export type App = OnpremApp | CloudApp;

export type DeployConfig = Adp | BspApp;

export interface AdpWriterConfig {
    app: App;
    target: AbapTarget;
    ui5?: {
        minVersion?: string;
        version?: string;
        frameworkUrl?: string;
        shouldSetMinVersion?: boolean;
    };
    package?: {
        name?: string;
        description?: string;
    };
    flp?: FlpConfig;
    customConfig?: CustomConfig;
    /**
     * Optional: configuration for deployment to ABAP
     */
    deploy?: DeployConfig;
    options?: {
        /**
         * Optional: if set to true then the generated project will be recognized by the SAP Fiori tools
         */
        fioriTools?: boolean;
    };
}

export interface ChangeInboundNavigation {
    /** Identifier for the inbound navigation. */
    inboundId: string;
    /** Title associated with the inbound navigation. */
    title?: string;
    /** Subtitle associated with the inbound navigation. */
    subTitle?: string;
}

export interface NewInboundNavigation {
    /** Represent business entities that reflect a specific scenario. */
    semanticObject: string;
    /** Operations which can be performed on a semantic object. */
    action: string;
    //** Defined instance of the semantic object (e.g. by specifying the employee ID). */
    additionalParameters?: object;
    /** Title associated with the inbound navigation. */
    title: string;
    /** Optional: Subtitle associated with the inbound navigation. */
    subTitle?: string;
}

export interface InternalInboundNavigation extends NewInboundNavigation {
    /** Identifier for the inbound navigation. */
    inboundId: string;
    /** Flag indicating if the new inbound navigation should be added. */
    addInboundId: boolean;
}

export type FlpConfig = ChangeInboundNavigation | NewInboundNavigation | undefined;

export interface Language {
    sap: string;
    i18n: string;
}

export interface ManifestAppdescr {
    fileName: string;
    layer: string;
    fileType: string;
    reference: string;
    id: string;
    namespace: string;
    version: string;
    content: Content[];
}

export interface Content {
    changeType: string;
    content: object;
    texts?: object;
}

export interface CommonChangeProperties {
    changeType: string;
    reference: string;
    namespace: string;
    projectId: string;
    moduleName: string;
    support: {
        generator: string;
        sapui5Version: string;
        command?: string;
    };
    originalLanguage: string;
    layer: string;
    fileType: string;
    fileName: string;
    texts: Record<string, unknown>;
}

export interface ManifestChangeProperties {
    fileName: string;
    fileType: string;
    namespace: string;
    layer: string;
    packageName: string;
    reference: string;
    support: { generator: string };
    changeType: string;
    creation: string;
    content: object;
}

export interface AddXMLChange extends CommonChangeProperties {
    changeType: 'addXML';
    creation: string;
    packageName: string;
    content: {
        targetAggregation: string;
        index: number;
        fragmentPath: string;
    };
    selector: {
        id: string;
        idIsLocal: boolean;
    };
    dependentSelector: Record<string, unknown>;
    jsOnly: boolean;
}

export interface CodeExtChange extends CommonChangeProperties {
    changeType: 'codeExt';
    content: {
        codeRef: string;
    };
    selector: {
        controllerName: string;
    };
}

export const enum TemplateFileName {
    Fragment = 'fragment.xml',
    Controller = 'controller.ejs',
    Annotation = 'annotation.xml'
}

export const enum FlexLayer {
    CUSTOMER_BASE = 'CUSTOMER_BASE',
    VENDOR = 'VENDOR'
}

export const enum NamespacePrefix {
    CUSTOMER = 'customer.',
    EMPTY = ''
}

export const enum HttpStatusCodes {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    METHOD_NOT_ALLOWED = 405,
    CONFLICT = 409,
    INTERNAL_SERVER_ERROR = 500,
    NOT_IMPLEMETED = 501,
    SERVICE_UNAVAILABLE = 503
}

export type OperationType = 'read' | 'write' | 'delete';

/**
 * Represents a constructor type that creates an instance of IWriter.
 *
 * @param fs - An instance of Editor used for file system operations.
 * @param projectPath - The root path of the project.
 * @returns An instance of IWriter for handling specific data writing operations.
 */
export type Writer = new (fs: Editor, projectPath: string) => IWriter<any>;

/**
 * Generic interface for handling data associated with specific writer operations.
 * Allows for the typing of data passed to IWriter implementations based on the change type.
 *
 * @template T - The subtype of ChangeType that specifies the kind of change and associated data.
 */
export type IWriterData<T extends ChangeType> = IWriter<GeneratorData<T>>;

/**
 * Defines a generic interface for writer classes, specialized by the type of data they handle.
 *
 * @template T - The specific type of data the writer will handle, determined by the associated ChangeType.
 */
export interface IWriter<T> {
    /**
     * Writes the provided data to the project.
     *
     * @param data - The data needed for the writer function, specific to the type of change being made.
     */
    write(data: T): Promise<void>;
}

/**
 * Enumerates the types of changes that can be made, each representing a specific kind of modification.
 */
export const enum ChangeType {
    ADD_NEW_MODEL = 'appdescr_ui5_addNewModel',
    ADD_ANNOTATIONS_TO_ODATA = 'appdescr_app_addAnnotationsToOData',
    CHANGE_DATA_SOURCE = 'appdescr_app_changeDataSource',
    ADD_COMPONENT_USAGES = 'appdescr_ui5_addComponentUsages',
    ADD_LIBRARY_REFERENCE = 'appdescr_ui5_addLibraries',
    CHANGE_INBOUND = 'appdescr_app_changeInbound'
}

/**
 * Maps a ChangeType to the corresponding data structure needed for that type of change.
 * This conditional type ensures type safety by linking each change type with its relevant data model.
 *
 * @template T - A subtype of ChangeType indicating the specific type of change.
 */
export type GeneratorData<T extends ChangeType> = T extends ChangeType.ADD_ANNOTATIONS_TO_ODATA
    ? AnnotationsData
    : T extends ChangeType.ADD_COMPONENT_USAGES
    ? ComponentUsagesData
    : T extends ChangeType.ADD_LIBRARY_REFERENCE
    ? ComponentUsagesData
    : T extends ChangeType.ADD_NEW_MODEL
    ? NewModelData
    : T extends ChangeType.CHANGE_DATA_SOURCE
    ? DataSourceData
    : T extends ChangeType.CHANGE_INBOUND
    ? InboundData
    : never;

export interface AnnotationsData {
    fileName?: string;
    variant: DescriptorVariant;
    answers: AddAnnotationsAnswers;
}

export const enum AnnotationFileSelectType {
    ExistingFile = 1,
    NewEmptyFile = 2
}

export interface ComponentUsagesData {
    variant: DescriptorVariant;
    answers: AddComponentUsageAnswers;
}

export interface AddComponentUsageAnswers {
    /** Indicates whether the component is loaded lazily. */
    isLazy: string;
    /** Unique ID for the component usage. */
    id: string;
    /** Name of the component. */
    name: string;
    /** Serialized data specific to the component. */
    data: string;
    /** Settings related to the component. */
    settings: string;
    /** Indicates whether a library reference should be added */
    shouldAddLibrary: boolean;
    /** Reference to the component's library. */
    library?: string;
    /** Indicates whether the library reference is loaded lazily. */
    libraryIsLazy?: string;
}

export interface NewModelData {
    variant: DescriptorVariant;
    answers: NewModelAnswers;
}

export interface NewModelAnswers {
    addAnnotationMode: boolean;
    /** Name of the OData service. */
    name: string;
    /** URI of the OData service. */
    uri: string;
    /** Name of the OData service model. */
    modelName: string;
    /** Version of OData used. */
    version: string;
    /** Settings for the OData service model. */
    modelSettings: string;
    /** Name of the OData annotation data source. */
    dataSourceName: string;
    /** Optional URI of the OData annotation data source. */
    dataSourceURI?: string;
    /** Optional settings for the OData annotation. */
    annotationSettings?: string;
}

export interface DataSourceData {
    variant: DescriptorVariant;
    dataSources: Record<string, ManifestNamespace.DataSource>;
    answers: ChangeDataSourceAnswers;
}

export interface InboundChangeAnswers {
    /** Title associated with the inbound navigation data. */
    title: string;
    /** Subtitle associated with the inbound navigation data. */
    subtitle: string;
    /** Icon associated with the inbound navigation data. */
    icon: string;
}

export interface InboundData {
    /** Identifier for the inbound navigation data. */
    inboundId: string;
    variant: DescriptorVariant;
    answers: InboundChangeAnswers;
}

export interface InboundContent {
    inboundId: string;
    entityPropertyChange: { propertyPath: string; operation: string; propertyValue: unknown }[];
}

export type DataSourceItem = {
    uri?: string;
    type: string;
    settings: {
        [key: string]: unknown;
    };
};

export type PropertyValueType = 'boolean' | 'number' | 'string' | 'binding' | 'object';

export interface AdpProjectData {
    path: string;
    title: string;
    namespace: string;
    ui5Version: string;
    name: string;
    layer: UI5FlexLayer;
    environment: string;
    sourceSystem: string;
    applicationIdx: string;
    reference: string;
    id: string;
}

export interface ChangeDataSourceAnswers {
    /** Data Source identifier  */
    id: string;
    /** Data Source URI */
    uri: string;
    /** Data Source Max Age */
    maxAge?: number;
    /** Data Source Annotation URI */
    annotationUri?: string;
}

export interface AddAnnotationsAnswers {
    /** Data Source identifier  */
    id: string;
    /** Selected option for Annotation File */
    fileSelectOption: number;
    /** Annotation File path */
    filePath?: string;
}

export type DataSource = ManifestNamespace.DataSource & { dataSourceName: string; annotations: string[] };

export interface CustomConfig {
    adp: {
        environment: OperationsType;
        support: ToolsSupport;
    };
}

export interface InboundChangeContentAddInboundId {
    inbound: {
        [inboundId: string]: AddInboundModel;
    };
}
export interface AddInboundModel {
    /** Represent business entities that reflect a specific scenario. */
    semanticObject: string;
    /** Operations which can be performed on a semantic object. */
    action: string;
    /** Title associated with the inbound navigation data. */
    title: string;
    /** Optional: Subtitle associated with the inbound navigation data. */
    subTitle?: string;
    signature: AddInboundSignitureModel;
}
export interface AddInboundSignitureModel {
    parameters: InboundParameters;
    //** Defined instance of the semantic object (e.g. by specifying the employee ID). */
    additionalParameters: string;
}
export interface InboundParameters {
    'sap-appvar-id'?: object;
    'sap-priority'?: object;
}

export interface InboundChange {
    inbound: {
        [key: string]: {
            /** Represent business entities that reflect a specific scenario. */
            semanticObject: string;
            /** Operations which can be performed on a semantic object. */
            action: string;
            /** Icon associated with the inbound navigation data. */
            icon: string;
            /** Title associated with the inbound navigation data. */
            title: string;
            /** Subtitle associated with the inbound navigation data. */
            subTitle: string;
            signature: {
                parameters: object | string;
                //** Defined instance of the semantic object (e.g. by specifying the employee ID). */
                additionalParameters: 'allowed';
            };
        };
    };
}

export interface IPrompt {
    name: string;
    description: string;
}
/**
 *
 */
export declare class Prompts {
    private readonly items;
    private callback;
    /**
     *
     */
    constructor(items?: IPrompt[]);
    /**
     *
     */
    splice(start: number, deleteCount: number, items?: IPrompt[]): void;
    /**
     *
     */
    setCallback(callback: any): void;
    size(): number;
}

export interface TargetEnvAnswers {
    targetEnv: OperationsType;
}

export interface BasicInfoAnswers {
    projectName: string;
    applicationTitle: string;
    namespace: string;
}

export interface ConfigurationInfoAnswers {
    system: string;
    client: string;
    username: string;
    password: string;
    projectType: AdaptationProjectType;
    application: Application;
    ui5Version: string;
    latestUI5version: string;
    versionInfo: string;
    confirmPrompt: boolean;
    fioriId: string;
    ach: string;
}

export interface FlexUISupportedSystem {
    isUIFlex: boolean;
    isOnPremise: boolean;
}

export interface SystemDetails {
    url: string;
    client: string;
    username?: string;
    password?: string;
    authenticationType?: string;
}

export interface Application {
    id: string;
    title: string;
    ach: string;
    registrationIds: string[];
    fileType: string;
    bspUrl: string;
    bspName: string;
}

export interface Choice {
    name: string;
    value: Application;
}

export interface UI5Version {
    latest: VersionDetail;
    [key: string]: VersionDetail;
}

export interface SapModel {
    type?: string;
    uri?: string;
    settings?: {
        bundleName?: string;
    };
}

export interface VersionDetail {
    version: string;
    support: string;
    lts: boolean;
}

export interface ChoiceOption<T = string> {
    name: string;
    value: T;
}

export interface ParamCheck {
    shouldApply: boolean;
    value: string | undefined;
}

export interface ParameterOptions {
    required: boolean;
    filter?: Value;
    defaultValue?: Value;
    renameTo?: string;
}
export interface Parameter {
    [key: string]: ParameterOptions;
}

export interface Value {
    value: string;
    format: string;
}

export interface FlpConfigAnswers {
    inboundId?: string;
    title: string;
    subTitle?: string;
    action?: string;
    semanticObject?: string;
    parameters?: string;
}

export enum InputChoice {
    ENTER_MANUALLY = 'Enter manually',
    CHOOSE_FROM_EXISTING = 'Choose from existing'
}

export enum ApplicationType {
    FIORI_ELEMENTS = 'FioriElements',
    FIORI_ELEMENTS_OVP = 'FioriElementsOVP',
    FREE_STYLE = 'FreeStyle',
    NONE = ''
}

export interface DeployConfigAnswers {
    abapRepository: string;
    deployConfigDescription?: string;
    packageInputChoice: InputChoice;
    packageManual?: string;
    packageAutocomplete?: string;
    transportInputChoice: InputChoice;
    transportManual?: string;
    transportFromList?: string;
}

export type ParameterRules = {
    /**
     * Function that checks whether param has empty value, e.g parameter defined in the following format has empty value: param1=
     *
     * @param {string} param - param string
     * @returns {ParamCheck} object which indicates if this rule should be applied and the parameter value
     */
    isEmptyParam(param: string): ParamCheck;
    /**
     * Function that define whether param is mandatory, param which is placed inside () is not mandatory
     *
     * @param {string} param - param string
     * @returns {boolean} whether param string is mandatory or not
     */
    isMandatoryParam(param: string): boolean;
    /**
     * Function that checks whehter param has filter value, e.g parameter value placed inside <> indicates for filter value: param1=<value>
     *
     * @param {string} param - param string
     * @returns {ParamCheck} object which indicates if this rule should be applied and the parameter value
     */
    shouldHavеFiltertValue(param: string): ParamCheck;
    /**
     * Function that checks whether parameter has rename to value, e.g param1=>value
     *
     * @param {string} param - param string
     * @returns {ParamCheck} object which indicates if this rule should be applied and the parameter value
     */
    shouldRenameTo(param: string): ParamCheck;
    /**
     * Function thath checks whether parameter value should have reference as format value, e.g param1=%%value%%
     *
     * @param {string} param - param string
     * @returns {ParamCheck} object which indicates if this rule should be applied and the parameter value
     */
    isReference(param: string): ParamCheck;
};

interface DestinationConfig {
    name: string;
    basUsage: string | undefined;
    host: string | undefined;
    sapClient: string | undefined;
}

export interface ExtProjectConfig {
    username: string;
    password: string;
    destination: DestinationConfig;
    applicationNS: string;
    applicationName: string;
    userUI5Ver: string;
    BSPUrl: string;
    namespace: string;
}
