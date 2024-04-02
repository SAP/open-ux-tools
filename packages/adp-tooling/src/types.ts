import type { UI5FlexLayer } from '@sap-ux/project-access';
import type { DestinationAbapTarget, UrlAbapTarget } from '@sap-ux/system-access';
import type { Adp } from '@sap-ux/ui5-config';
import type { Editor } from 'mem-fs-editor';

export interface DescriptorVariant {
    layer: UI5FlexLayer;
    reference: string;
    id: string;
    namespace: string;
    content: object[];
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

export interface AdpWriterConfig {
    app: {
        id: string;
        reference: string;
        layer?: UI5FlexLayer;
        title?: string;
    };
    target: AbapTarget;
    ui5?: {
        minVersion?: string;
    };
    package?: {
        name?: string;
        description?: string;
    };
    /**
     * Optional: configuration for deployment to ABAP
     */
    deploy?: Adp;
    options?: {
        /**
         * Optional: if set to true then the generated project will be recognized by the SAP Fiori tools
         */
        fioriTools?: boolean;
    };
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

interface CommonChangeProperties {
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

export const enum FolderTypes {
    CHANGES = 'changes',
    FRAGMENTS = 'fragments',
    CODING = 'coding',
    MANIFEST = 'manifest',
    ANNOTATIONS = 'annotations',
    WEBAPP = 'webapp'
}

export const enum TemplateFileName {
    Fragment = 'fragment.xml',
    Controller = 'controller.ejs'
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
    projectData: AdpProjectData;
    timestamp: number;
    /** Indicates whether the annotation is for internal use only. */
    isInternalUsage: boolean;
    annotation: {
        /** Optional name of the annotation file. */
        fileName?: string;
        /** Data source associated with the annotation. */
        dataSource: string;
        /** Path to the annotation file. */
        filePath: string;
    };
}

export interface ComponentUsagesData {
    projectData: AdpProjectData;
    timestamp: number;
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
    library: {
        /** Reference to the component's library. */
        reference: string;
        /** Optional flag indicating if the library reference is lazy. */
        referenceIsLazy?: string;
    };
}

export interface NewModelData {
    projectData: AdpProjectData;
    timestamp: number;
    annotation: {
        /** Name of the OData annotation data source. */
        dataSourceName: string;
        /** Optional URI of the OData annotation data source. */
        dataSourceURI?: string;
        /** Optional settings for the OData annotation. */
        settings?: string;
    };
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
        modelSettings: string;
    };
    /** Indicates whether annotation mode is added. */
    addAnnotationMode: boolean;
}

export interface DataSourceData {
    projectData: AdpProjectData;
    timestamp: number;
    service: {
        /** Data source identifier. */
        name: string;
        /** URI of the data source. */
        uri: string;
        /** Optional maximum age for the data source cache. */
        maxAge?: number;
        /** URI for the OData annotation source. */
        annotationUri: string;
    };
    /** Dictionary mapping data source keys to their values. */
    dataSourcesDictionary: { [key: string]: string };
}

export interface InboundData {
    projectData: AdpProjectData;
    timestamp: number;
    /** Identifier for the inbound navigation data. */
    inboundId: string;
    flp: {
        /** Title associated with the inbound navigation data. */
        title: PropertyValueType;
        /** Subtitle associated with the inbound navigation data. */
        subTitle: PropertyValueType;
        /** Icon associated with the inbound navigation data. */
        icon: PropertyValueType;
    };
    /** Optional flag indicating if the project is in safe mode. */
    isInSafeMode?: boolean;
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
    layer: string;
    environment: string;
    safeMode: boolean;
    sourceSystem: string;
    applicationIdx: string;
    reference: string;
    id: string;
}
