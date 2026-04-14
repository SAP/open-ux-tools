/**
 * Utility for reading the FLP sandbox HTML file and extracting the
 * application hash (intent) from the sap-ushell-config applications object.
 */

import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { getWebappPath } from '@sap-ux/project-access';

/**
 * Regex to extract the first application key from the sap-ushell-config
 * `applications` block.  Matches patterns like:
 *
 *   applications: {
 *       "fincashbankmanage-tile": {
 *
 * Captures the quoted key (e.g. `fincashbankmanage-tile`).
 */
const APPLICATIONS_KEY_REGEX = /applications\s*:\s*\{[^"]*"([^"]+)"\s*:/;

/**
 * Reads an FLP sandbox HTML file and extracts the first application key
 * from the `sap-ushell-config` `applications` object.
 *
 * @param htmlRelativePath - path to the HTML file relative to `webapp/`
 *   (e.g. `test/flpSandbox.html`)
 * @param basePath - project root (contains `webapp/`)
 * @param fs - mem-fs-editor instance used to read the file
 * @returns the application key (e.g. `fincashbankmanage-tile`), or undefined
 */
export async function readHashFromFlpSandbox(
    htmlRelativePath: string,
    basePath: string,
    fs: Editor
): Promise<string | undefined> {
    try {
        const filePath = join(basePath, await getWebappPath(basePath), htmlRelativePath);
        const content = fs.read(filePath);
        const match = APPLICATIONS_KEY_REGEX.exec(content);
        return match?.[1];
    } catch {
        return undefined;
    }
}
