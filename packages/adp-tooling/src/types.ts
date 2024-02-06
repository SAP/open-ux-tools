import type { UI5FlexLayer } from '@sap-ux/project-access';
import type { DestinationAbapTarget, UrlAbapTarget } from '@sap-ux/system-access';
import type { Adp } from '@sap-ux/ui5-config';

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

export const enum GeneratorType {
    ADD_ANNOTATIONS_TO_ODATA = 'Add Annotations to OData',
    ADD_COMPONENT_USAGES = 'Add Component Usages',
    ADD_NEW_MODEL = 'Add New Model',
    CHANGE_DATA_SOURCE = 'Change Data Source',
    CHANGE_INBOUND = 'Change Inbound'
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
    change: object;
    fileName: string;
}

export interface AnnotationsData extends BaseData {
    timestamp: number;
    annotationFileName: string;
    annotationChange: AnnotationChangeAnswers;
}
export type ComponentUsagesData = BaseData;
export type NewModelData = BaseData;
export type DataSourceData = BaseData;
export interface InboundData extends BaseData {
    isChangeWithInbound: boolean;
    existingChangeFilePath: string;
}

export enum AnnotationFileSelectType {
    ExistingFile = 0,
    NewEmptyFile = 1
}

export interface AnnotationChangeAnswers {
    targetODataSource: string;
    targetAnnotationFileSelectOption: AnnotationFileSelectType;
    targetAnnotationFilePath: string;
}
