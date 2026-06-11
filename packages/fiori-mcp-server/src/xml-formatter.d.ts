declare module 'xml-formatter' {
    interface XMLFormatterOptions {
        indentation?: string;
        lineSeparator?: string;
        collapseContent?: boolean;
        ignoredPaths?: string[];
        forceSelfClosingEmptyTag?: boolean;
    }
    function formatXml(xml: string, options?: XMLFormatterOptions): string;
    export default formatXml;
}
