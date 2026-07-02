declare module 'jsdoc-api' {
    interface ExplainOptions {
        files?: string | string[];
        source?: string;
        cache?: boolean;
        configure?: string;
    }

    function explain(options: ExplainOptions): Promise<object[]>;

    export default { explain };
}
