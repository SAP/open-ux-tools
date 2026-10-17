import prettifyXml from 'prettify-xml';

import { logger } from './logger.js';

/**
 * Pretty-prints an XML string using `prettify-xml`.
 *
 * @param xml Raw XML content.
 * @returns Indented XML; returns the input unchanged if formatting fails.
 */
export function formatXml(xml: string): string {
    try {
        return prettifyXml(xml, { indent: 4 });
    } catch (error) {
        logger.warn(`Failed to format XML: ${(error as Error).message}`);
        return xml;
    }
}
