/**
 * Helper functions for generating VS Code launch configuration during migration
 */

import { basename } from 'node:path';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { Editor } from 'mem-fs-editor';
import { FioriElementsVersion } from '../project-spec-types.js';
import type { DebugOptions, FioriOptions } from '@sap-ux/launch-config';
import { createLaunchConfig } from '@sap-ux/launch-config';
import { ODataVersion } from '@sap-ux/axios-extension';
import type { ImportProjectInfo } from '../types.js';

/**
 * Generate and write VS Code launch configuration for the migrated project
 *
 * @param fs - mem-fs editor
 * @param projectInfo - Project information
 * @param vscode - VS Code context
 * @param appIntent - FLP app intent string (e.g., "#SemanticObject-Action")
 * @param appMockIntent - Mock intent string for FLP sandbox
 * @param flpSandboxAvailable - Whether FLP sandbox is available
 */
export async function generateLaunchConfiguration(
    fs: Editor,
    projectInfo: ImportProjectInfo,
    vscode: any,
    appIntent: string | undefined,
    appMockIntent: string | undefined,
    flpSandboxAvailable: boolean
): Promise<void> {
    // projectInfo.rootPath is already the full path to the project
    const projectPath = projectInfo.rootPath;
    const projectName = basename(projectPath);

    // Build debug options for launch config
    const debugOptions: DebugOptions = {
        vscode: vscode,
        sapClientParam: projectInfo.sapClient ? `sap-client=${projectInfo.sapClient}` : '',
        flpAppId: appIntent?.replace('#', '') || '',
        flpSandboxAvailable,
        isFioriElement:
            projectInfo.FEVersion === FioriElementsVersion.v2 || projectInfo.FEVersion === FioriElementsVersion.v4,
        migratorMockIntent:
            projectInfo.FEVersion === FioriElementsVersion.v4 ? undefined : appMockIntent?.replace('#', ''),
        isMigrator: true,
        isAppStudio: isAppStudio(),
        targetMockHtmlFile: projectInfo.targetMockHtmlFile
    };

    // Add OData version if applicable
    if ([ODataVersion.v2, ODataVersion.v4].includes(projectInfo.odataVersion)) {
        debugOptions.odataVersion = projectInfo.odataVersion === ODataVersion.v2 ? '2.0' : '4.0';
    }

    // Build Fiori options
    const fioriOptions: FioriOptions = {
        name: projectName,
        projectRoot: projectPath,
        debugOptions
    };

    // Generate launch config using @sap-ux/launch-config, writing into the shared editor.
    // The migration commits the editor once at the end, so no separate commit here.
    await createLaunchConfig(projectPath, fioriOptions, fs);
}
