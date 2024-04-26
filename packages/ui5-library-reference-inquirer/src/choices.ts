import type { AllAppResults, ReuseLib } from '@sap-ux/project-access';
import type { ListChoiceOptions } from 'inquirer';
import type { ReuseLibChoice } from './types';
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
            projectChoices.push({ name, value: app.appRoot });
        }
    }

    return projectChoices;
};

/**
 * Creates the library choice options.
 *
 * @param libs - array of libraries found in the workspace folders.
 * @returns  list of libraries
 */
export const getLibraryChoices = async (libs?: ReuseLib[]): Promise<ReuseLibChoice[]> => {
    const libraryChoices: ReuseLibChoice[] = [];

    if (libs) {
        for (const lib of libs) {
            const libName = [lib.name, lib.type, lib.description].filter(Boolean).join(' - ');
            libraryChoices.push({ name: libName, value: lib });
        }
    }

    return libraryChoices;
};
