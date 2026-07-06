declare module 'jsdoc-api' {
    interface ExplainOptions {
        files?: string | string[];
        source?: string;
        cache?: boolean;
        configure?: string;
    }

    const jsdoc: { explain(options: ExplainOptions): Promise<unknown[]> };
    export default jsdoc;
}
