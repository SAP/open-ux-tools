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

export type Writer = new (fs: Editor, projectPath: string) => IWriter<any>;
export type IWriterData<T extends ChangeType> = IWriter<GeneratorData<T>>;
export interface IWriter<T> {
    /**
     * Writer function.
     *
     * @param {T} data - Data needed for the writer function.
     */
    write(data: T): Promise<void>;
}

export const enum ChangeType {
    ADD_NEW_MODEL = 'appdescr_ui5_addNewModel',
    ADD_ANNOTATIONS_TO_ODATA = 'appdescr_app_addAnnotationsToOData',
    CHANGE_DATA_SOURCE = 'appdescr_app_changeDataSource',
    ADD_COMPONENT_USAGES = 'appdescr_ui5_addComponentUsages',
    ADD_LIBRARY_REFERENCE = 'appdescr_ui5_addLibraries',
    CHANGE_INBOUND = 'appdescr_app_changeInbound'
}

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
    annotationFileName?: string;
    isInternalUsage: boolean;
    oDataSource: string;
    annotationFilePath: string;
}
export interface ComponentUsagesData {
    projectData: AdpProjectData;
    timestamp: number;
    componentUsageID: string;
    componentName: string;
    componentData: string;
    componentSettings: string;
    isLazy: string;
    libraryReferenceIsLazy?: string;
    shouldAddComponentLibrary: boolean;
    componentLibraryReference: string;
}
export interface NewModelData {
    projectData: AdpProjectData;
    timestamp: number;
    oDataServiceName: string;
    oDataServiceURI: string;
    oDataServiceModelName: string;
    oDataServiceModelSettings: string;
    oDataVersion: string;
    addAnnotationMode: boolean;
    oDataAnnotationDataSourceName: string;
    oDataAnnotationDataSourceURI?: string;
    oDataAnnotationSettings?: string;
}
export interface DataSourceData {
    projectData: AdpProjectData;
    timestamp: number;
    oDataSource: string;
    oDataSourceURI: string;
    maxAge?: number;
    oDataAnnotationSourceURI: string;
    dataSourcesDictionary: { [key: string]: string };
}
export interface InboundData {
    projectData: AdpProjectData;
    timestamp: number;
    inboundId: string;
    title: PropertyValueType;
    subTitle: PropertyValueType;
    icon: PropertyValueType;
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
