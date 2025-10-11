/**
 * Captures the data structure in the XML response of calling ADT discovery service
 */

/**
 * Root of ADT discovery schema data.
 */
export interface AdtSchemaData {
    service: {
        workspace: AdtWorkspace[];
    };
}

export type AdtCategoryTerm = string;
export type AdtWorkspaceTitle = string;
export type AdtCategoryId = string;

/**
 * AdtWorkspace groups ADT services based on their
 * functionalities.
 */
export interface AdtWorkspace {
    title: AdtWorkspaceTitle;
    collection: AdtCollection | AdtCollection[];
}

/**
 * Data structure of an ADT service schema.
 */
export interface AdtCollection {
    workspaceTitle?: AdtWorkspaceTitle;
    /**
     * Service URL that can be different depending on the ABAP version.
     */
    href: string;
    title: string;
    /**
     * The accept element in the discovery defines which content
     * type is supported for sending a POST request with a http body.
     * It is NOT the http request header that specifies which content
     * type the client can handle in the response body. It is not used
     * in building the request header.
     */
    accept?: AdtAcceptContentType;
    category: AdtCategory;
    templateLinks: any;
    [key: string]: any;
}

export type AdtAcceptContentType = string[] | string;

/**
 * Uniquely identifies a ADT service. Provide an AdtCategory
 * as key to look for the service schema of the corresponding ADT service.
 */
export interface AdtCategory {
    term: AdtCategoryTerm;
    scheme: string;
}

/**
 * Transport request data available in response.
 */
export interface TransportRequest {
    transportNumber: string;
    user: string;
    description: string;
    client: string;
    targetSystem: string;
}

export enum TenantType {
    SAP = 'SAP',
    Customer = 'CUSTOMER'
}

export type OperationsType = 'C' | 'P';

/**
 * ATO Settings properties
 *
 * @typedef AtoSettings
 * @property {string} developmentPackage Local package name i.e YY1_TEST_PACKAGE
 * @property {string} developmentPrefix Describes a custom prefix that is used for your packages and transports i.e.YY1_ | ZZ1_
 * @property {OperationsType} operationsType Hosting type i.e. Cloud | onPremise
 * @property {boolean} isExtensibilityDevelopmentSystem Whether target system is a extensible development tenant, true | false
 * @property {TenantType} tenantType Type of tenant exposed i.e. SAP | CUSTOMER
 * @property {boolean} isTransportRequestRequired Whether Transport Request (TR) is required during deployment, true | false
 * @property {boolean} isConfigured Whether ATO is enabled on target system, true | false
 */
export interface AtoSettings {
    developmentPackage?: string;
    developmentPrefix?: string;
    /**
     * Operations type cloud or on premise.
     */
    operationsType?: OperationsType;
    /**
     * True if it is an S/4HANA Cloud Public Edition client for key user extensibility.
     */
    isExtensibilityDevelopmentSystem?: boolean;
    tenantType?: TenantType;
    isTransportRequestRequired?: boolean;
    isConfigured?: boolean;
}

// Success | Error
export type AdtTransportStatus = 'S' | 'E';

// In XML response of ADT TransportChecks service,
// the <DLVUNIT/> element contain text that indicate it is local package.
// No transport number required for deploying to local pacakge.
export const LocalPackageText = ['LOCAL_PACKAGE', 'LOCAL', 'ZLOCAL'];

export interface ArchiveFileNode {
    /**
     * file or folder name only
     */
    basename: string;
    /**
     * Path to the file or folder. Ready to be passed to the `path`
     * argument of FileStoreService.getAppArchiveContent() method.
     *
     * @see FileStoreService.getAppArchiveContent
     */
    path: string;
    /**
     * 'file' | 'folder'
     */
    type: ArchiveFileNodeType;
}

export type ArchiveFileNodeType = 'file' | 'folder';

export type ArchiveFileContentType<T> = T extends 'file' ? string : T extends 'folder' ? ArchiveFileNode[] : never;

export type BusinessObject = {
    name: string;
    uri: string;
    description?: string;
};

export type AbapCDSView = {
    name: string;
    uri: string;
    description?: string;
};

export type PublishResponse = { SEVERITY: string; SHORT_TEXT: string; LONG_TEXT: string };

// messages com.sap.adt.StatusMessage
export type ValidationMessage = {
    severity?: string;
    text?: string;
};

// details of a generated OData service, needed to determine service URI
export type ODataServiceTechnicalDetails = {
    serviceName: string;
    serviceVersion: string;
    serviceDefinitionName: string;
};

export type ValidationResponse = { severity: string; short_text: string; long_text: string };

/**
 * Type for '/sap/bc/adt/core/http/systeminformation' response type 'application/vnd.sap.adt.core.http.systeminformation.v1+json'
 */
export type SystemInfo = {
    systemID: string;
    userName: string;
    userFullName: string;
    client: string;
    language: string;
};
