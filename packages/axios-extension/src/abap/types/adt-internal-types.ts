/**
 * This type is used internally for the list of PacakgeInfo
 * returned from ADT rest api. It should not be exposed for
 * public use via axios-extension.
 */
export interface PackageInfo {
    uri: string; // Relative URL path for querying this specific package: e.g. /sap/bc/adt/packages/<packageNameSmallCase>
    type: string; // Object type
    name: string; // Package name
}

/**
 * This type is used internally for the list of `ArchiveFileNode`
 * returned from ADT rest api. Each `ArchiveFileNode` provides
 * metadata information of a file/folder in the archived Fiori app. 
 * It should not be exposed for public use via axios-extension.
 */
export interface AdtFileNode {
    base: string;
    author: string;
    category: { term: 'folder' | 'file' };
    content: {
        type: string; // content-type
        src: string; // url path to query the content of this ArchiveFileNode
    };
    contributor: string;
    id: string; // file path with uri encoding
    link: {
        href: string; // query url
        // If ref type is appindex, href is the url points to the parent folder.
        // If ref type is self, href is the url points to the current ArchiveFileNode.
        // If ref type is execute, href is the full dev mode url path.
        ref: 'appindex' | 'self' | 'execute'; 
        type?: string; // content type
    }[];
    summary: { type: 'text' };
    title: string; // readable file path without uri encoding
}
