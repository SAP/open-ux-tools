/**
 * Project settings when initializing project integrity.
 */
export interface ProjectSettings {
    /**
     * Path to the file where integrity data, like hash values, are stored
     */
    integrityFilePath: string;

    /**
     * List of files to create a hash value for
     */
    fileList: string[];

    /**
     * List of content (key->string) to create a hash value for
     */
    additionalStringContent?: Content;
}

/**
 * Integrity data for a project, stored as JSON in integrity file.
 */
export interface Integrity {
    fileIntegrity: FileIntegrity[];
    contentIntegrity: ContentIntegrity[];
}

/**
 * Integrity data for a file.
 */
export interface FileIntegrity {
    filePath: string;
    hash: string;
    content?: string;
}

/**
 * Integrity data for a content (key->string).
 */
export interface ContentIntegrity {
    contentKey: string;
    hash: string;
    content?: string;
}

/**
 * Content (key->string) to store in integrity data.
 */
export interface Content {
    [contentKey: string]: string;
}

/**
 * Result of a project integrity check.
 */
export interface CheckIntegrityResult {
    files: {
        differentFiles: {
            filePath: string;
            oldContent?: string;
            newContent?: string;
        }[];
        equalFiles: string[];
    };
    additionalStringContent: {
        differentContent: {
            key: string;
            oldContent?: string;
            newContent?: string;
        }[];
        equalContent: string[];
    };
}
