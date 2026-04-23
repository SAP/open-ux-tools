declare module 'content-type' {
    interface ParsedMediaType {
        type: string;
        parameters: Record<string, string>;
    }
    function parse(input: string): ParsedMediaType;
    function format(obj: { type: string; parameters?: Record<string, string> }): string;
}

declare module '@sap/approuter' {
    /** Approuter instance returned by createApprouter() */
    interface ApprouterInstance {
        /** Start the approuter with the given options */
        start(opts: { port: number; xsappConfig: unknown; workingDir: string; extensions?: unknown[] }): void;
    }
    function createApprouter(): ApprouterInstance;
    export default createApprouter;
}
