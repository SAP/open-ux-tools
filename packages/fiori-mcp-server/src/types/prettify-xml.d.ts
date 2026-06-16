/**
 * Type shim for `prettify-xml`, which ships no declarations.
 */
declare module 'prettify-xml' {
    interface PrettifyXmlOptions {
        indent?: number;
        newline?: string;
    }

    /**
     * Pretty-prints an XML string.
     *
     * @param xml - Raw XML content.
     * @param options - Formatting options.
     * @returns The indented XML.
     */
    function prettifyXml(xml: string, options?: PrettifyXmlOptions): string;

    export default prettifyXml;
}
