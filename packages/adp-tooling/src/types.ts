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

export type IWriterData<T extends GeneratorType> = IWriter<GeneratorData<T>>;
export interface IWriter<T extends BaseData> {
    write(data: T): Promise<void>;
}

export const enum GeneratorType {
    ADD_ANNOTATIONS_TO_ODATA = 'Add Annotations to OData',
    ADD_COMPONENT_USAGES = 'Add Component Usages',
    ADD_NEW_MODEL = 'Add New Model',
    CHANGE_DATA_SOURCE = 'Change Data Source',
    CHANGE_INBOUND = 'Change Inbound'
}

export const enum GeneratorName {
    ADD_ANNOTATIONS_TO_ODATA = 'add-annotation-files-generator',
    ADD_COMPONENT_USAGES = 'add-sapui5-component-usage-generator',
    ADD_NEW_MODEL = 'add-odata-service-and-model-generator',
    CHANGE_DATA_SOURCE = 'replace-odata-service-generator',
    CHANGE_INBOUND = 'change-inbound-generator'
}

export const enum ChangeTypes {
    ADD_COMPONENT_USAGES = 'appdescr_ui5_addComponentUsages',
    ADD_NEW_MODEL = 'appdescr_ui5_addNewModel',
    ADD_ANOTATIONS_TO_DATA = 'appdescr_app_addAnnotationsToOData',
    CHANGE_DATA_SOURCE = 'appdescr_app_changeDataSource',
    ADD_COMPONENT_USAGE_LIBRARY_REFERENCE = 'appdescr_ui5_addLibraries',
    CHANGE_INBOUND = 'appdescr_app_changeInbound'
}

export type GeneratorData<T extends GeneratorType> = T extends GeneratorType.ADD_ANNOTATIONS_TO_ODATA
    ? AnnotationsData
    : T extends GeneratorType.ADD_COMPONENT_USAGES
    ? ComponentUsagesData
    : T extends GeneratorType.ADD_NEW_MODEL
    ? NewModelData
    : T extends GeneratorType.CHANGE_DATA_SOURCE
    ? DataSourceData
    : T extends GeneratorType.CHANGE_INBOUND
    ? InboundData
    : never;

export interface BaseData {
    projectData: AdpProjectData;
    timestamp: number;
}

export interface AnnotationsData extends BaseData {
    annotationFileName?: string;
    isInternalUsage: boolean;
    answers: AnnotationChangeAnswers;
}
export interface ComponentUsagesData extends BaseData {
    answers: ComponentUsagesAnswers;
}
export interface NewModelData extends BaseData {
    answers: NewModelAnswers;
}
export interface DataSourceData extends BaseData {
    answers: DataSourceAnswers;
    dataSourcesDictionary: { [key: string]: string };
}
export interface InboundData extends BaseData {
    answers: InboundAnswers;
}

export enum AnnotationFileSelectType {
    ExistingFile = 0,
    NewEmptyFile = 1
}

export interface InboundContent {
    inboundId: string;
    entityPropertyChange: { propertyPath: string; operation: string; propertyValue: unknown }[];
}

export type PopertyValueType = 'boolean' | 'number' | 'string' | 'binding' | 'object';

export interface AnnotationChangeAnswers {
    targetODataSource: string;
    targetAnnotationFileSelectOption: AnnotationFileSelectType;
    targetAnnotationFilePath: string;
}

export interface ComponentUsagesAnswers {
    targetComponentUsageID: string;
    targetComponentName: string;
    targetComponentData: string;
    targetComponentSettings: string;
    targetIsLazy: string;
    targetLibraryReferenceIsLazy?: string;
    targetShouldAddComponentLibrary: boolean;
    targetComponentLibraryReference: string;
}

export interface NewModelAnswers {
    targetODataServiceName: string;
    targetODataServiceURI: string;
    targetODataServiceModelName: string;
    targetODataServiceModelSettings: string;
    targetODataVersion: string;
    addAnnotationMode: boolean;
    targerODataAnnotationDataSourceName: string;
    targetODataAnnotationDataSourceURI?: string;
    targetODataAnnotationSettings?: string;
}

export interface DataSourceAnswers {
    targetODataSource: string;
    oDataSourceURI: string;
    maxAge?: number;
    oDataAnnotationSourceURI: string;
}

export interface InboundAnswers {
    inboundId: string;
    title: PopertyValueType;
    subTitle: PopertyValueType;
    icon: PopertyValueType;
    isInSafeMode?: boolean;
}

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
