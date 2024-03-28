import { findCapProjects, getCapCustomPaths } from '@sap-ux/project-access';
import { basename } from 'path';
import { t } from '../../../i18n';
import type { CapProjectChoice, WorkspaceFolder } from '../../../types';

const enterCapPathChoiceValue = 'enterCapPath';

/**
 * Search for CAP projects in the specified paths.
 *
 * @param paths - The paths used to search for CAP projects
 * @returns The CAP project paths and the number of folders with the same name
 */
async function getCapWorkspaceFolders(
    paths: string[]
): Promise<{ capProjectPaths: WorkspaceFolder[]; folderCounts: Map<string, number> }> {
    const capProjectRoots = await findCapProjects({ wsFolders: paths });
    const workspaceFolders: WorkspaceFolder[] = [];
    // Keep track of duplicate folder names to append the path to the name when displaying the choices
    const folderNameCount = new Map<string, number>();

    for (const root of capProjectRoots) {
        const folderName = basename(root);
        workspaceFolders.push({ folderName, path: root });
        folderNameCount.set(folderName, (folderNameCount.get(basename(root)) || 0) + 1);
    }
    return {
        capProjectPaths: workspaceFolders.sort((a, b) => a.folderName.localeCompare(b.folderName)),
        folderCounts: folderNameCount
    };
}

/**
 * Search for CAP projects in the specified paths and create prompt choices from the results.
 *
 * @param paths - The paths used to search for CAP projects
 * @returns The CAP project prompt choices
 */
export async function getCapWorkspaceChoices(paths: string[]): Promise<CapProjectChoice[]> {
    const { capProjectPaths, folderCounts } = await getCapWorkspaceFolders(paths);

    const capChoices: CapProjectChoice[] = [];

    for await (const capProjectPath of capProjectPaths) {
        const customCapPaths = await getCapCustomPaths(capProjectPath.path);
        const folderCount = folderCounts.get(capProjectPath.folderName) || 1;

        capChoices.push({
            name: `${capProjectPath.folderName}${folderCount > 1 ? ' (' + capProjectPath.path + ')' : ''}`,
            value: Object.assign(capProjectPath, customCapPaths)
        });
    }

    return [
        ...capChoices,
        {
            name: t('prompts.capProject.enterCapPathChoiceName'),
            value: enterCapPathChoiceValue
        }
    ];
}
