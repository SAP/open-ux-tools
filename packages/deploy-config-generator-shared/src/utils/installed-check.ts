import { findInstalledPackages } from '@sap-ux/nodejs-utils';
import type { WorkspaceConfiguration } from 'vscode';

/**
 * Checks if S/4 generator extension is installed.
 * Note that it may not be loaded by Fiori Generator even if its installed in the case
 * there are other extensions installed also.
 *
 * @param vscWorkspaceConfig
 * @returns true if the S/4 generator extension is installed
 */
export async function isS4Installed(vscWorkspaceConfig?: WorkspaceConfiguration): Promise<boolean> {
    const s4ExtGenName = '@sapux/s4-fiori-gen-ext';
    const foundGenExt = await findInstalledPackages(s4ExtGenName, {
        keyword: 'fiori-generator-extension',
        vscWorkspaceConfig
    });
    return foundGenExt.length > 0;
}
