/**
 * Error thrown during YAML document processing.
 */
export class YAMLError extends Error {
    public readonly code: string;

    /**
     * Constructor taking a message and any object.
     *
     * @param message human readable error message
     * @param code error code
     */
    constructor(message: string, code: string) {
        super(message);
        this.code = code;
        this.name = this.constructor.name;
    }
}
