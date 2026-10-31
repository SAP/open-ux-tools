import xmlFormatter from 'xml-formatter';

/**
 * Pretty-prints an XML string using `xml-formatter`.
 *
 * `throwOnFailure: false` makes the formatter return its best effort on input it
 * cannot parse rather than throwing, so a caller always gets a string back.
 *
 * @param xml Raw XML content.
 * @returns Indented XML; the input is returned best-effort if it cannot be parsed.
 */
export function formatXml(xml: string): string {
    return xmlFormatter(xml, {
        indentation: '    ',
        lineSeparator: '\n',
        collapseContent: true,
        throwOnFailure: false
    });
}
