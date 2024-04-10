import type { AllAppResults } from '@sap-ux/project-access';
import type { ListChoiceOptions } from 'inquirer';
import { basename } from 'path';

/**
 * Creates the project choice options.
 *
 * @param apps array of applications found in the workspace folders.
 * @returns list of projects
 */
export const getProjectChoices = async (apps?: AllAppResults[]): Promise<ListChoiceOptions[]> => {
    const projectChoices: ListChoiceOptions[] = [];

    if (apps) {
        for (const app of apps) {
            const name = basename(app.appRoot);
            projectChoices.push({ name, value: { folderName: name, path: app.appRoot } });
        }
    }

    return projectChoices;
};
