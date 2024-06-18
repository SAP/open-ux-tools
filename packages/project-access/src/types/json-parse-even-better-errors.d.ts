declare module 'json-parse-even-better-errors' {
    function parseJsonError(raw: string, reviver?: unknown, context?: unknown): any;
    export = parseJsonError;
}
