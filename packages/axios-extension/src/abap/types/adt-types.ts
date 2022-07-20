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
