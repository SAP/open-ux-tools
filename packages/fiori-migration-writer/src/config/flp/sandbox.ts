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
 * Handles both flpSandbox.html and flpSandboxMockServer.html in parallel
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
    const flpSandboxPath = join(projectRoot, webappPath, 'test', 'flpSandbox.html');
    const flpSandboxMockPath = join(projectRoot, webappPath, 'test', 'flpSandboxMockServer.html');

    // Process both files in parallel for better performance
    const [sandboxResult, mockResult] = await Promise.all([
        processSandboxFile(flpSandboxPath, getFlpIntentFromHtml, existingFlpIntent),
        processMockSandboxFile(flpSandboxMockPath, getFlpIntentFromHtml)
    ]);

    return {
        flpSandboxLibs: sandboxResult.libs,
        flpSandboxFlpIntent: sandboxResult.intent || existingFlpIntent,
        flpSandboxMockFlpIntent: mockResult.intent,
        hasRootIntent: {
            flpSandboxRootIntent: sandboxResult.hasRootIntent,
            flpSandboxMockRootIntent: mockResult.hasRootIntent
        },
        targetMockHtmlFile: mockResult.targetFile
    };
}

/**
 * Process main FLP sandbox file
 *
 * @param filePath - Path to flpSandbox.html
 * @param getFlpIntentFromHtml - Function to extract intent from HTML
 * @param existingFlpIntent - Existing FLP intent
 * @returns Sandbox processing result
 */
async function processSandboxFile(
    filePath: string,
    getFlpIntentFromHtml: (path: string) => Promise<string | undefined>,
    existingFlpIntent?: string
): Promise<{ libs: string; intent?: string; hasRootIntent: boolean }> {
    try {
        if (!(await fileExists(filePath))) {
            return { libs: '', hasRootIntent: false };
        }

        const content = await readFile(filePath);
        const libs = extractDataSapUiLibs(content);
        const hasRootIntent = content.indexOf('rootIntent') !== -1;
        const intent = await getFlpIntentFromHtml(filePath);

        return {
            libs,
            intent: intent && intent.length > 0 ? intent : existingFlpIntent,
            hasRootIntent
        };
    } catch {
        // Expected: flpSandbox.html may not exist in all projects (optional FLP configuration)
        return { libs: '', hasRootIntent: false };
    }
}

/**
 * Process mock FLP sandbox file
 *
 * @param filePath - Path to flpSandboxMockServer.html
 * @param getFlpIntentFromHtml - Function to extract intent from HTML
 * @returns Mock sandbox processing result
 */
async function processMockSandboxFile(
    filePath: string,
    getFlpIntentFromHtml: (path: string) => Promise<string | undefined>
): Promise<{ intent?: string; hasRootIntent: boolean; targetFile?: string }> {
    try {
        const [intent, exists] = await Promise.all([getFlpIntentFromHtml(filePath), fileExists(filePath)]);

        if (!exists) {
            return { hasRootIntent: false };
        }

        const content = await readFile(filePath);
        const hasRootIntent = content.indexOf('rootIntent') !== -1;

        return {
            intent,
            hasRootIntent,
            targetFile: 'test/flpSandboxMockServer.html'
        };
    } catch {
        return { hasRootIntent: false };
    }
}

/**
 * Extract data-sap-ui-libs attribute value from HTML content
 *
 * @param htmlContent - HTML file content
 * @returns Library string or empty string
 */
function extractDataSapUiLibs(htmlContent: string): string {
    const key = 'data-sap-ui-libs="';
    const keyPos = htmlContent.indexOf(key);
    if (keyPos === -1) {
        return '';
    }

    const startPos = keyPos + key.length;
    const endPos = htmlContent.indexOf('"', startPos);
    return htmlContent.substring(startPos, endPos);
}
