import type { UI5FlexLayer, ManifestNamespace, Manifest } from '@sap-ux/project-access';
import type { DestinationAbapTarget, UrlAbapTarget } from '@sap-ux/system-access';
import type { Adp, BspApp } from '@sap-ux/ui5-config';
import type { AxiosRequestConfig, OperationsType } from '@sap-ux/axios-extension';
import type { Editor } from 'mem-fs-editor';
import type { Destination } from '@sap-ux/btp-utils';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type AdmZip from 'adm-zip';

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
    texts?: string | { i18n?: string };
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
    layer?: FlexLayer;
    fioriId?: string;
    ach?: string;
    title?: string;
    /** Optional: Application variant change content. */
    content?: Content[];
    /** Optional: Description about i18n.properties. */
    i18nDescription?: string;
    /** Optional: I18n resource models derived from the manifest. */
    i18nModels?: ResourceModel[];
    /** Optional: Application type derived from the manifest. */
    appType?: ApplicationType;
    /** The manifest of the application */
    manifest?: Manifest;
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
        /**
         * Optional: if set to true then the generated project will support typescript
         */
        enableTypeScript?: boolean;
        /**
         * Optional: path to the template files to be used for generation
         */
        templatePathOverwrite?: string;
    };
}

/**
 * Interface representing the answers collected from the configuration prompts of Adaptation Project generator.
 */
export interface ConfigAnswers {
    system: string;
    username: string;
    password: string;
    application: SourceApplication;
    fioriId?: string;
    ach?: string;
    shouldCreateExtProject?: boolean;
}

export interface AttributesAnswers {
    projectName: string;
    title: string;
    namespace: string;
    targetFolder: string;
    ui5Version: string;
    enableTypeScript: boolean;
    addDeployConfig?: boolean;
    addFlpConfig?: boolean;
}

export interface SourceApplication {
    id: string;
    title: string;
    ach: string;
    registrationIds: string[];
    fileType: string;
    bspUrl: string;
    bspName: string;
}

export interface FlexUISupportedSystem {
    isUIFlex: boolean;
    isOnPremise: boolean;
}

export interface UI5Version {
    latest: VersionDetail;
    [key: string]: VersionDetail;
}

export interface VersionDetail {
    version: string;
    support: string;
    lts: boolean;
}

export interface TypesConfig {
    typesPackage: string;
    typesVersion: string;
}

export interface ResourceModel {
    key: string;
    path: string;
    content?: string;
}

export interface SapModel {
    type?: string;
    uri?: string;
    settings?: {
        bundleName?: string;
    };
}

export interface Endpoint extends Partial<Destination> {
    Name: string;
    Url?: string;
    Client?: string;
    Credentials?: { username?: string; password?: string };
    UserDisplayName?: string;
    Scp?: boolean;
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
    /** Defined instance of the semantic object (e.g. by specifying the employee ID). */
    additionalParameters?: string;
    /** Title associated with the inbound navigation. */
    title: string;
    /** Optional: Subtitle associated with the inbound navigation. */
    subTitle?: string;
    /** Icon associated with the inbound navigation. */
    icon?: string;
}

export interface InternalInboundNavigation extends NewInboundNavigation {
    /** Identifier for the inbound navigation. */
    inboundId: string;
}

export type FlpConfig = ChangeInboundNavigation | NewInboundNavigation;

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

export interface CommonAdditionalChangeInfoProperties {
    templateName?: string;
    targetAggregation?: string;
    controlType?: string;
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
        templateName?: string;
    };
    selector: {
        id: string;
        idIsLocal: boolean;
    };
    dependentSelector: Record<string, unknown>;
    jsOnly: boolean;
}
export interface AppDescriptorV4Change<T = unknown> extends CommonChangeProperties {
    changeType: 'appdescr_fe_changePageConfiguration';
    content: {
        entityPropertyChange: {
            propertyPath: string;
            operation: string;
            propertyValue: string | boolean | number | T;
        };
    };
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

export interface AnnotationFileChange extends CommonChangeProperties {
    changeType: 'appdescr_app_addAnnotationsToOData';
    creation: string;
    content: {
        dataSourceId: string;
        annotations: string[];
        annotationsInsertPosition: 'END';
        dataSource: {
            [fileName: string]: {
                uri: string;
                type: 'ODataAnnotation';
            };
        };
    };
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

export interface Value {
    value: string;
    format: string;
}

export interface Parameter {
    [key: string]: ParameterOptions;
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
    shouldHavеFilteredValue(param: string): ParamCheck;
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

export enum ApplicationType {
    FIORI_ELEMENTS = 'FioriElements',
    FIORI_ELEMENTS_OVP = 'FioriElementsOVP',
    FREE_STYLE = 'FreeStyle',
    NONE = ''
}

export const enum TemplateFileName {
    Fragment = 'fragment.xml',
    Controller = 'controller.ejs',
    TSController = 'ts-controller.ejs',
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
 * A mapping of ChangeType values to their respective change names.
 */
export const ChangeTypeMap: Record<ChangeType, string> = {
    [ChangeType.ADD_NEW_MODEL]: 'addNewModel',
    [ChangeType.ADD_ANNOTATIONS_TO_ODATA]: 'addAnnotationsToOData',
    [ChangeType.CHANGE_DATA_SOURCE]: 'changeDataSource',
    [ChangeType.ADD_COMPONENT_USAGES]: 'addComponentUsages',
    [ChangeType.ADD_LIBRARY_REFERENCE]: 'addLibraries',
    [ChangeType.CHANGE_INBOUND]: 'changeInbound'
} as const;

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
    variant: DescriptorVariant;
    /** Flag for differentiating the annotation creation call from CLI and from CPE */
    isCommand: boolean;
    annotation: {
        /** Optional name of the annotation file. */
        fileName?: string;
        /** Data source associated with the annotation. */
        dataSource: string;
        /** Optional path to the annotation file. */
        filePath?: string;
        namespaces?: { namespace: string; alias: string }[];
        serviceUrl?: string;
    };
}

export const enum AnnotationFileSelectType {
    ExistingFile = 1,
    NewEmptyFile = 2
}

export interface ComponentUsagesDataBase {
    variant: DescriptorVariant;
    component: {
        /** Indicates whether the component is loaded lazily. */
        isLazy: string;
        /** Unique ID for the component usage. */
        usageId: string;
        /** Name of the component. */
        name: string;
        /** Serialized data specific to the component. */
        data: string;
        /** Settings related to the component. */
        settings: string;
    };
}

export interface ComponentUsagesDataWithLibrary extends ComponentUsagesDataBase {
    library: {
        /** Reference to the component's library. */
        reference: string;
        /** Optional flag indicating if the library reference is lazy. */
        referenceIsLazy: string;
    };
}

export type ComponentUsagesData = ComponentUsagesDataBase | ComponentUsagesDataWithLibrary;

export type AddComponentUsageAnswersWithoutLibrary = {
    /** Indicates whether a library reference should be added */
    shouldAddLibrary: false;
};

export type addComponentUsageAnswersWithLibrary = {
    /** Indicates whether a library reference should be added */
    shouldAddLibrary: true;
    /** Reference to the component's library. */
    library: string;
    /** Indicates whether the library reference is loaded lazily. */
    libraryIsLazy: string;
};

export type AddComponentUsageAnswersBase = {
    /** Indicates whether the component is loaded lazily. */
    isLazy: string;
    /** Unique ID for the component usage. */
    usageId: string;
    /** Name of the component. */
    name: string;
    /** Serialized data specific to the component. */
    data: string;
    /** Settings related to the component. */
    settings: string;
};

export type AddComponentUsageAnswers = AddComponentUsageAnswersBase &
    (AddComponentUsageAnswersWithoutLibrary | addComponentUsageAnswersWithLibrary);

export interface NewModelDataBase {
    variant: DescriptorVariant;
    service: {
        /** Name of the OData service. */
        name: string;
        /** URI of the OData service. */
        uri: string;
        /** Name of the OData service model. */
        modelName: string;
        /** Version of OData used. */
        version: string;
        /** Settings for the OData service model. */
        modelSettings?: string;
    };
}

export interface NewModelDataWithAnnotations extends NewModelDataBase {
    annotation: {
        /** Name of the OData annotation data source. */
        dataSourceName: string;
        /** Optional URI of the OData annotation data source. */
        dataSourceURI?: string;
        /** Optional settings for the OData annotation. */
        settings?: string;
    };
}

export type NewModelData = NewModelDataBase | NewModelDataWithAnnotations;

export interface NewModelAnswersBase {
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
}

export interface NewModelAnswersWithAnnotations extends NewModelAnswersBase {
    addAnnotationMode: true;
    /** Name of the OData annotation data source. */
    dataSourceName: string;
    /** Optional URI of the OData annotation data source. */
    dataSourceURI?: string;
    /** Optional settings for the OData annotation. */
    annotationSettings?: string;
}

export interface NewModelAnswersWithoutAnnotations extends NewModelAnswersBase {
    addAnnotationMode: false;
}

export type NewModelAnswers = NewModelAnswersBase &
    (NewModelAnswersWithAnnotations | NewModelAnswersWithoutAnnotations);

export interface DataSourceData {
    variant: DescriptorVariant;
    dataSources: Record<string, ManifestNamespace.DataSource>;
    service: {
        /** Data source identifier. */
        id: string;
        /** URI of the data source. */
        uri: string;
        /** Optional maximum age for the data source cache. */
        maxAge?: number;
        /** URI for the OData annotation source. */
        annotationUri?: string;
    };
}

export type RequireAtLeastOne<T> = {
    [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

export interface InboundChangeAnswersBase {
    /** Title associated with the inbound navigation data. */
    title: string;
    /** Subtitle associated with the inbound navigation data. */
    subtitle: string;
    /** Icon associated with the inbound navigation data. */
    icon: string;
}

export type InboundChangeAnswers = RequireAtLeastOne<InboundChangeAnswersBase>;

export interface InboundData {
    /** Identifier for the inbound navigation data. */
    inboundId: string;
    variant: DescriptorVariant;
    flp: RequireAtLeastOne<{
        /** Title associated with the inbound navigation data. */
        title: string;
        /** Subtitle associated with the inbound navigation data. */
        subtitle: string;
        /** Icon associated with the inbound navigation data. */
        icon: string;
    }>;
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

export type CloudCustomTaskConfigTarget =
    | DestinationAbapTarget
    | (Pick<UrlAbapTarget, 'url' | 'client' | 'scp' | 'authenticationType'> & { ignoreCertErrors?: boolean });

export interface CloudCustomTaskConfig {
    type: string;
    appName: string | undefined;
    languages: Language[];
    target: AbapTarget;
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
    /** Optional: Icon associated with the inbound navigation data. */
    icon?: string;
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

/**
 * Route structure from xs-app.json
 */
export interface XsAppRoute {
    source: string;
    endpoint?: string;
    [key: string]: unknown;
}

export interface XsApp {
    welcomeFile?: string;
    authenticationMethod?: string;
    routes: XsAppRoute[];
}

export interface Uaa {
    clientid: string;
    clientsecret: string;
    url: string;
}

export interface CfAppParams {
    appName: string;
    appVersion: string;
    appHostId: string;
}

export interface AppParamsExtended extends CfAppParams {
    spaceGuid: string;
}

export interface CfCredentials {
    [key: string]: any;
    uaa: Uaa;
    uri: string;
    endpoints: any;
}

export interface ServiceKeys {
    credentials: CfCredentials[];
    serviceInstance: ServiceInstance;
}

export interface HTML5Content {
    entries: AdmZip.IZipEntry[];
    serviceInstanceGuid: string;
    manifest: Manifest;
}

export interface ServiceInstance {
    name: string;
    guid: string;
}

export interface GetServiceInstanceParams {
    spaceGuids?: string[];
    planNames?: string[];
    names: string[];
}

export interface BusinessServiceResource {
    name: string;
    label: string;
}

/**
 * Cloud Foundry ADP UI5 YAML Types
 */
export interface UI5YamlCustomTaskConfiguration {
    appHostId: string;
    appName: string;
    appVersion: string;
    moduleName: string;
    org: string;
    space: string;
    html5RepoRuntime: string;
    sapCloudService: string;
}

export interface UI5YamlCustomTask {
    name: string;
    beforeTask?: string;
    configuration: UI5YamlCustomTaskConfiguration;
}

export interface UI5YamlBuilder {
    customTasks: UI5YamlCustomTask[];
}

export interface UI5YamlMetadata {
    name: string;
}

export interface CfUI5Yaml {
    specVersion: string;
    type: string;
    metadata: UI5YamlMetadata;
    builder: UI5YamlBuilder;
}

/**
 * Cloud Foundry ADP MTA YAML Types
 */
export interface MtaDestination {
    Name: string;
    ServiceInstanceName: string;
    ServiceKeyName: string;
    Authentication?: string;
    'sap.cloud.service'?: string;
}

export interface MtaContentInstance {
    destinations: MtaDestination[];
    existing_destinations_policy?: string;
}

export interface MtaContent {
    instance: MtaContentInstance;
}

export interface MtaServiceKey {
    name: string;
}

export interface MtaParameters {
    'service-key'?: MtaServiceKey;
    'content-target'?: boolean;
    content?: MtaContent;
    'no-source'?: boolean;
    'build-result'?: string;
    requires?: MtaBuildRequire[];
    builder?: string;
    commands?: string[];
    'supported-platforms'?: string[];
    'disk-quota'?: string;
    memory?: string;
    service?: string;
    'service-plan'?: string;
    'service-name'?: string;
    path?: string;
    config?: Record<string, unknown>;
}

export interface MtaBuildRequire {
    artifacts?: string[];
    name: string;
    'target-path'?: string;
}

export interface MtaRequire {
    name: string;
    parameters?: MtaParameters;
}

export interface MtaModule {
    name: string;
    type: string;
    path?: string;
    requires?: MtaRequire[];
    'build-parameters'?: MtaParameters;
    parameters?: MtaParameters;
}

export interface MtaResource {
    name: string;
    type: string;
    parameters: MtaParameters;
}

export interface MtaYaml {
    '_schema-version': string;
    'ID': string;
    'version': string;
    builder?: {
        customTasks?: {
            configuration?: {
                appHostId: string;
            };
        }[];
    };
    resources?: MtaResource[];
    modules?: MtaModule[];
}

// Legacy types for backward compatibility
export interface Resource {
    name: string;
    type: string;
    parameters: MtaParameters;
}

export interface ODataTargetSource {
    dataSourceName: string;
    uri: string;
}

export interface CfAdpConfig extends AdpConfig {
    cfSpace: string;
    cfOrganization: string;
    cfApiUrl: string;
}

/**
 * Configuration for CF ADP project generation.
 */
export interface CfAdpWriterConfig {
    app: {
        id: string;
        title: string;
        layer: FlexLayer;
        namespace: string;
        manifest: Manifest;
        appType?: ApplicationType;
        i18nModels?: ResourceModel[];
        i18nDescription?: string;
    };
    baseApp: {
        appId: string;
        appName: string;
        appVersion: string;
        appHostId: string;
        serviceName: string;
        title: string;
    };
    cf: {
        url: string;
        org: Organization;
        space: Space;
        html5RepoRuntimeGuid: string;
        approuter: AppRouterType;
        businessService: string;
        businessSolutionName?: string;
    };
    project: {
        name: string;
        path: string;
        folder: string;
    };
    ui5: {
        version: string;
    };
    options?: {
        addStandaloneApprouter?: boolean;
        /**
         * Optional: path to the template files to be used for generation
         */
        templatePathOverwrite?: string;
        addSecurity?: boolean;
    };
}

/**
 * Interface for creating CF configuration from batch objects.
 */
export interface CreateCfConfigParams {
    attributeAnswers: AttributesAnswers;
    cfServicesAnswers: CfServicesAnswers;
    cfConfig: CfConfig;
    layer: FlexLayer;
    manifest: Manifest;
    html5RepoRuntimeGuid: string;
    projectPath: string;
    addStandaloneApprouter?: boolean;
    publicVersions: UI5Version;
}

export const AppRouterType = {
    MANAGED: 'Managed HTML5 Application Runtime',
    STANDALONE: 'Standalone HTML5 Application Runtime'
} as const;

export type AppRouterType = (typeof AppRouterType)[keyof typeof AppRouterType];

/** Old ADP config file types */
export interface AdpConfig {
    sourceSystem?: string;
    componentname: string;
    appvariant: string;
    layer: string;
    isOVPApp: boolean;
    isFioriElement: boolean;
    environment: string;
    ui5Version: string;
}

export interface Organization {
    GUID: string;
    Name: string;
}

export interface Space {
    GUID: string;
    Name: string;
}

export interface CfConfig {
    org: Organization;
    space: Space;
    token: string;
    url: string;
}

export interface ConfigGeneric {
    [key: string]: any;
}

export interface Config {
    AccessToken: string;
    AuthorizationEndpoint: string;
    OrganizationFields: Organization;
    Target: string;
    SpaceFields: Space;
}

export interface HttpResponse {
    statusText: string;
    status: number;
    data: string;
}

export interface CFApp {
    appId: string;
    appName: string;
    appVersion: string;
    serviceName: string;
    title: string;
    appHostId: string;
    messages?: string[];
    serviceInstanceGuid?: string;
}

/**
 * CF services (application sources) prompts
 */
export enum cfServicesPromptNames {
    approuter = 'approuter',
    businessService = 'businessService',
    businessSolutionName = 'businessSolutionName',
    baseApp = 'baseApp'
}

export type CfServicesAnswers = {
    [cfServicesPromptNames.approuter]?: AppRouterType;
    [cfServicesPromptNames.businessService]?: string;
    [cfServicesPromptNames.businessSolutionName]?: string;
    // Base app object returned by discovery (shape provided by FDC service)
    [cfServicesPromptNames.baseApp]?: CFApp;
};

export type CFServicesQuestion = YUIQuestion<CfServicesAnswers>;

export interface ApprouterPromptOptions {
    hide?: boolean;
}

export interface BusinessServicePromptOptions {
    hide?: boolean;
}

export interface BusinessSolutionNamePromptOptions {
    hide?: boolean;
}

export interface BaseAppPromptOptions {
    hide?: boolean;
}

export type CfServicesPromptOptions = Partial<{
    [cfServicesPromptNames.approuter]: ApprouterPromptOptions;
    [cfServicesPromptNames.businessService]: BusinessServicePromptOptions;
    [cfServicesPromptNames.businessSolutionName]: BusinessSolutionNamePromptOptions;
    [cfServicesPromptNames.baseApp]: BaseAppPromptOptions;
}>;

export interface RequestArguments {
    url: string;
    options: AxiosRequestConfig;
}

/**
 * CF API Response
 */
export interface CfAPIResponse<T> {
    pagination: CfPagination;
    resources: T[];
}

export interface CfPagination {
    total_results: number;
    total_pages: number;
    first: CfPaginationLink;
    last: CfPaginationLink;
    next: CfPaginationLink | null;
    previous: CfPaginationLink | null;
}

export interface CfPaginationLink {
    href: string;
}

export interface CfServiceInstance {
    guid: string;
    created_at: string;
    updated_at: string;
    name: string;
    tags: string[];
    last_operation: CfLastOperation;
    type: string;
    maintenance_info: Record<string, unknown>;
    upgrade_available: boolean;
    dashboard_url: string | null;
    relationships: CfServiceInstanceRelationships;
    metadata: CfMetadata;
    links: CfServiceInstanceLinks;
}

export interface CfLastOperation {
    type: string;
    state: string;
    description: string;
    updated_at: string;
    created_at: string;
}

export interface CfServiceInstanceRelationships {
    space: CfRelationshipData;
    service_plan: CfRelationshipData;
}

export interface CfRelationshipData {
    data: {
        guid: string;
    };
}

export interface CfMetadata {
    labels: Record<string, unknown>;
    annotations: Record<string, unknown>;
}

export interface CfServiceInstanceLinks {
    self: CfLink;
    space: CfLink;
    service_credential_bindings: CfLink;
    service_route_bindings: CfLink;
    service_plan: CfLink;
    parameters: CfLink;
    shared_spaces: CfLink;
}

export interface CfLink {
    href: string;
}

export interface CfServiceOffering {
    name: string;
    tags?: string[];
    broker_catalog?: {
        metadata?: {
            sapservice?: {
                odataversion?: string;
                [key: string]: unknown;
            };
            [key: string]: unknown;
        };
        [key: string]: unknown;
    };
    [key: string]: unknown;
}
