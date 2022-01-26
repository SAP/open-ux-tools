export interface ServiceOptions {
    /** optional `baseDirectory`. Can be an absolute or a relative path.
     * Relative paths will be assumed to start in the user's home directory */
    baseDirectory?: string;
    [key: string]: unknown;
}
