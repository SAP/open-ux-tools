declare module 'prettify-xml' {
    function prettifyXml(xml: string, options?: { indent?: number; newline?: string }): string;
    export default prettifyXml;
}
