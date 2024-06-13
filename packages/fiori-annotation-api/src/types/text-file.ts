export interface TextFile {
    /**
     * Absolute uri to the file
     */
    uri: string;
    /**
     * Some of the files in project can not be written to. For example generated files should not be modified and such files will have this flag set to true.
     * If it's not set or the value is false, then the file can be modified.
     */
    isReadOnly?: boolean;
}
