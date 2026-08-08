/**
 * Helper functions for FLP (Fiori Launchpad) sandbox and app intent generation
 */

import { fileExists } from '../../utils/index.js';
import { join } from 'node:path';
import { FioriElementsVersion } from '../../project-spec-types.js';
import type { ImportProjectInfo } from '../../types.js';
import { MigrationTypes } from '../../utils/constants.js';

/**
 * Check if FLP sandbox is available
 * FLP sandbox is available if:
 * - The file exists in the project
 * - OR it's a Fiori Elements V2/V4 project (will be generated)
 * - OR it's a SAP app
 *
 * @param rootPath
 * @param webappPath
 * @param FEVersion
 * @param isSAPApp
 */
export async function checkFlpSandboxAvailability(
    rootPath: string,
    webappPath: string,
    FEVersion: string | undefined,
    isSAPApp: boolean
): Promise<boolean> {
    const testFlpSandboxHtml = 'test/flpSandbox.html';
    const flpSandboxPath = join(rootPath, webappPath, testFlpSandboxHtml);

    return (
        (await fileExists(flpSandboxPath)) ||
        FEVersion === FioriElementsVersion.v2 ||
        FEVersion === FioriElementsVersion.v4 ||
        isSAPApp
    );
}

/**
 * Generate app intent based on project configuration and semantic object
 * App intent format depends on FE version and whether FLP sandbox is available
 *
 * @param projectInfo
 * @param semanticObject
 * @param flpSandboxAvailable
 * @param flpSandboxFlpIntent
 */
export function generateAppIntent(
    projectInfo: ImportProjectInfo,
    semanticObject: string,
    flpSandboxAvailable: boolean,
    flpSandboxFlpIntent: string | undefined
): string {
    const { FEVersion, type, flpSandboxFlpIntent: projectFlpIntent } = projectInfo;

    // Extension projects use their own FLP intent if specified
    if (type === MigrationTypes.projectExtension && projectFlpIntent) {
        return projectFlpIntent;
    }

    // V4 projects use semantic object directly
    if (FEVersion === FioriElementsVersion.v4) {
        return `#${flpSandboxFlpIntent ?? semanticObject}`;
    }

    // Other projects use semantic object with FLP sandbox availability check
    return `#${semanticObject && flpSandboxAvailable ? (flpSandboxFlpIntent ?? semanticObject) : ''}`;
}

/**
 * Generate mock app intent for FLP sandbox testing
 * Uses the most specific intent available, falling back to semantic object
 *
 * @param semanticObject
 * @param flpSandboxAvailable
 * @param flpSandboxMockFlpIntent
 * @param flpSandboxFlpIntent
 */
export function generateAppMockIntent(
    semanticObject: string,
    flpSandboxAvailable: boolean,
    flpSandboxMockFlpIntent: string | undefined,
    flpSandboxFlpIntent: string | undefined
): string {
    return `#${
        semanticObject && flpSandboxAvailable ? (flpSandboxMockFlpIntent ?? flpSandboxFlpIntent ?? semanticObject) : ''
    }`;
}

/**
 * Generate all FLP-related intents and availability flags
 * Consolidates FLP sandbox checking and intent generation
 *
 * @param projectInfo
 * @param semanticObject
 */
export async function prepareFlpConfiguration(
    projectInfo: ImportProjectInfo,
    semanticObject: string
): Promise<{
    flpSandboxAvailable: boolean;
    appIntent: string;
    appMockIntent: string;
}> {
    const {
        rootPath,
        webappPath,

        FEVersion,
        isSAPApp = false,
        flpSandboxFlpIntent,
        flpSandboxMockFlpIntent
    } = projectInfo;

    // Check FLP sandbox availability
    const flpSandboxAvailable = await checkFlpSandboxAvailability(rootPath, webappPath, FEVersion, isSAPApp);

    // Generate app intents
    const appIntent = generateAppIntent(projectInfo, semanticObject, flpSandboxAvailable, flpSandboxFlpIntent);
    const appMockIntent = generateAppMockIntent(
        semanticObject,
        flpSandboxAvailable,
        flpSandboxMockFlpIntent,
        flpSandboxFlpIntent
    );

    return {
        flpSandboxAvailable,
        appIntent,
        appMockIntent
    };
}
