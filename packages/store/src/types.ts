export interface ServiceOptions {
    /** optional `baseDirectory`. Can be an absolute or a relative path.
     * Relative paths will be assumed to start in the user's home directory */
    baseDirectory?: string;
    /**
     * If set to `true`, the data provider will attempt to recover entries from the secure store if the filesystem is empty.
     * Currently only supports backend systems,
     */
    recoverFromSecureStore?: boolean;
    [key: string]: unknown;
}
