/**
 * Helper functions for processing FLP sandbox HTML files
 */
import { join } from 'node:path';
import { fileExists, readFile } from '../../utils/index.js';

/**
 * Result of FLP sandbox processing
 */
export interface FlpSandboxProcessingResult {
    flpSandboxLibs: string;
    flpSandboxFlpIntent: string | undefined;
    flpSandboxMockFlpIntent: string | undefined;
    hasRootIntent: {
        flpSandboxRootIntent: boolean;
        flpSandboxMockRootIntent: boolean;
    };
    targetMockHtmlFile?: string;
}

/**
 * Process FLP sandbox HTML files to extract libraries, intents, and root intent flags
 * Handles both flpSandbox.html and flpSandboxMockServer.html
 *
 * @param projectRoot - Root path of the project
 * @param webappPath - Webapp path within the project
 * @param getFlpIntentFromHtml - Function to extract intent from HTML file
 * @param existingFlpIntent - Existing FLP intent (optional)
 * @returns FLP sandbox processing result
 */
export async function processFlpSandboxFiles(
    projectRoot: string,
    webappPath: string,
    getFlpIntentFromHtml: (path: string) => Promise<string | undefined>,
    existingFlpIntent?: string
): Promise<FlpSandboxProcessingResult> {
    let flpSandboxLibs = '';
    let flpSandboxFlpIntent = existingFlpIntent;
    let flpSandboxMockFlpIntent: string | undefined;
    const hasRootIntent = { flpSandboxRootIntent: false, flpSandboxMockRootIntent: false };
    let targetMockHtmlFile: string | undefined;

    // Process flpSandbox.html
    try {
        const flpSandboxPath = join(projectRoot, webappPath, 'test', 'flpSandbox.html');
        if (await fileExists(flpSandboxPath)) {
            const flpSandboxContent: any = await readFile(flpSandboxPath);
            const key = 'data-sap-ui-libs="';
            if (flpSandboxContent?.indexOf(key) !== -1) {
                const posOfkey = flpSandboxContent.indexOf(key);
                const lenOfKey = key.length;
                const posStartOfValue = posOfkey + lenOfKey;
                const posEndOfValue = flpSandboxContent.indexOf('"', posStartOfValue);
                flpSandboxLibs = flpSandboxContent.substring(posStartOfValue, posEndOfValue);
            }

            if (flpSandboxContent?.indexOf('rootIntent') !== -1) {
                hasRootIntent.flpSandboxRootIntent = true;
            }
        }
        const flpSandboxFlpIntentTmp = await getFlpIntentFromHtml(flpSandboxPath);
        if (flpSandboxFlpIntentTmp && flpSandboxFlpIntentTmp?.length > 0) {
            flpSandboxFlpIntent = flpSandboxFlpIntentTmp;
        }
    } catch {
        // Expected: flpSandbox.html may not exist in all projects (optional FLP configuration).
        // Safe to continue with default FLP intent values.
    }

    // Process flpSandboxMockServer.html
    const flpSandboxMockPath = join(projectRoot, webappPath, 'test', 'flpSandboxMockServer.html');

    flpSandboxMockFlpIntent = await getFlpIntentFromHtml(flpSandboxMockPath);
    if (await fileExists(flpSandboxMockPath)) {
        targetMockHtmlFile = 'test/flpSandboxMockServer.html';
        const flpSandboxMockContent: string = await readFile(flpSandboxMockPath);

        if (flpSandboxMockContent && flpSandboxMockContent.indexOf('rootIntent') !== -1) {
            hasRootIntent.flpSandboxMockRootIntent = true;
        }
    }

    return {
        flpSandboxLibs,
        flpSandboxFlpIntent,
        flpSandboxMockFlpIntent,
        hasRootIntent,
        targetMockHtmlFile
    };
}
