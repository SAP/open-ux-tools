/**
 * Helper functions for generating VS Code launch configuration during migration
 */

import { basename, join, sep as pathSep } from 'node:path';
import { isAppStudio } from '@sap-ux/btp-utils';
import { FioriElementsVersion } from '../project-spec-types.js';
import type { DebugOptions, FioriOptions } from '@sap-ux/launch-config';
import { createLaunchConfig } from '@sap-ux/launch-config';
import { buildSapClientParam } from '../utils/common.js';
import { ODataVersion } from '../types.js';
import type { ImportProjectInfo, Message } from '../types.js';

/**
 * Generate and write VS Code launch configuration for the migrated project
 *
 * @param projectInfo - Project information
 * @param vscode - VS Code context
 * @param appIntent - FLP app intent string (e.g., "#SemanticObject-Action")
 * @param appMockIntent - Mock intent string for FLP sandbox
 * @param flpSandboxAvailable - Whether FLP sandbox is available
 * @param messages - Array to collect warning/error messages
 */
export async function generateLaunchConfiguration(
    projectInfo: ImportProjectInfo,
    vscode: any,
    appIntent: string | undefined,
    appMockIntent: string | undefined,
    flpSandboxAvailable: boolean,
    messages: Message[]
): Promise<void> {
    const projectName = projectInfo.rootPath.split(pathSep).pop() as string;
    const targetFolder = join(projectInfo.rootPath, '..');
    const projectPath = join(targetFolder, projectName);

    // Build debug options for launch config
    const debugOptions: DebugOptions = {
        vscode: vscode,
        sapClientParam: buildSapClientParam(projectInfo.sapClient),
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
        name: basename(projectPath),
        projectRoot: projectPath,
        debugOptions
    };

    // Generate launch config using @sap-ux/launch-config
    const fsEditor = await createLaunchConfig(projectPath, fioriOptions);

    // Commit the changes to filesystem
    await new Promise<void>((resolve) => {
        fsEditor.commit((err) => {
            if (err) {
                messages.push({
                    type: 'ERROR',
                    description: `Error committing changes while configuring launch json file: ${err}`
                });
            }
            resolve();
        });
    });
}
