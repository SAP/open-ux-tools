/**
 * Helper functions for generating VS Code launch configuration during migration
 */

import { basename, join, sep as pathSep } from 'node:path';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { Editor } from 'mem-fs-editor';
import { FioriElementsVersion } from '../project-spec-types.js';
import type { DebugOptions, FioriOptions } from '@sap-ux/launch-config';
import { createLaunchConfig } from '@sap-ux/launch-config';
import { ODataVersion } from '../types.js';
import type { ImportProjectInfo, Message } from '../types.js';

/**
 * Generate and write VS Code launch configuration for the migrated project
 *
 * @param fs - mem-fs editor
 * @param projectInfo - Project information
 * @param vscode - VS Code context
 * @param appIntent - FLP app intent string (e.g., "#SemanticObject-Action")
 * @param appMockIntent - Mock intent string for FLP sandbox
 * @param flpSandboxAvailable - Whether FLP sandbox is available
 * @param _messages - Array to collect warning/error messages (currently unused)
 */
export async function generateLaunchConfiguration(
    fs: Editor,
    projectInfo: ImportProjectInfo,
    vscode: any,
    appIntent: string | undefined,
    appMockIntent: string | undefined,
    flpSandboxAvailable: boolean,
    _messages: Message[]
): Promise<void> {
    const projectName = projectInfo.rootPath.split(pathSep).pop() as string;
    const targetFolder = join(projectInfo.rootPath, '..');
    const projectPath = join(targetFolder, projectName);

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
        name: basename(projectPath),
        projectRoot: projectPath,
        debugOptions
    };

    // Generate launch config using @sap-ux/launch-config, writing into the shared editor.
    // The migration commits the editor once at the end, so no separate commit here.
    await createLaunchConfig(projectPath, fioriOptions, fs);
}
