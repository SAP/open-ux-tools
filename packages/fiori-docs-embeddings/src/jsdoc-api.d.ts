declare module 'jsdoc-api' {
    interface ExplainOptions {
        files?: string | string[];
        source?: string;
        cache?: boolean;
        configure?: string;
    }

    function explain(options: ExplainOptions): Promise<unknown[]>;

    const jsdoc: { explain: typeof explain };
    export default jsdoc;
}
