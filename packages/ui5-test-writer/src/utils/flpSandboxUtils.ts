/**
 * Utility for reading the FLP sandbox HTML file and extracting the
 * application hash (intent) from the sap-ushell-config applications object.
 */

import { join } from 'node:path';
import type { MemFsEditor } from 'mem-fs-editor';

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
 * @param webappPath - path to the webapp directory
 * @param fs - mem-fs-editor instance used to read the file
 * @returns the application key (e.g. `fincashbankmanage-tile`), or undefined
 */
export function readHashFromFlpSandbox(
    htmlRelativePath: string,
    webappPath: string,
    fs: MemFsEditor
): string | undefined {
    try {
        const filePath = join(webappPath, htmlRelativePath);
        const content = fs.read(filePath);
        const match = APPLICATIONS_KEY_REGEX.exec(content);
        return match?.[1];
    } catch {
        return undefined;
    }
}

/**
 * Resolves the JourneyRunner launchUrl html target from the app's FLP sandbox.
 *
 * @param testOutDirPath - path to the test output directory (`.../webapp/test`)
 * @param webappPath - path to the webapp directory
 * @param fs - mem-fs-editor instance (works against both disk and in-memory files)
 * @returns the html target, or undefined if flpSandbox.html is missing or has no app key
 */
export function resolveFlpSandboxHtmlTarget(
    testOutDirPath: string,
    webappPath: string,
    fs: MemFsEditor
): string | undefined {
    if (!fs.exists(join(testOutDirPath, 'flpSandbox.html'))) {
        return undefined;
    }
    const appKey = readHashFromFlpSandbox(join('test', 'flpSandbox.html'), webappPath, fs);
    return appKey ? `test/flpSandbox.html#${appKey}` : undefined;
}
