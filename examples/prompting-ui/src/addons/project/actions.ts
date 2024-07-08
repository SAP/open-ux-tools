import { join } from 'path';
import { existsSync } from 'fs';
import { GET_PROJECT_PATH, UPDATE_PROJECT_PATH, UPDATE_PROJECT_PATH_RESULT, SET_PROJECT_PATH } from './types';
import type { ProjectActions } from './types';
import { getProjectPath, setProjectPath, testAppPath } from './project';
import { validateProject } from '../../backend';

/**
 * Method handles backend actions for project switch addon.
 *
 * @param action - Project addon action
 * @returns Response action to update UI.
 */
export async function handleAction(action: ProjectActions): Promise<ProjectActions | undefined> {
    let responseAction: ProjectActions | undefined;
    switch (action.type) {
        case GET_PROJECT_PATH: {
            responseAction = {
                type: SET_PROJECT_PATH,
                path: getProjectPath()
            };
            break;
        }
        case UPDATE_PROJECT_PATH: {
            const newProjectPath = action.path ? join(action.path) : testAppPath;
            let message: string | undefined;
            if (action.path && !existsSync(newProjectPath)) {
                message = 'Provided path does not exist';
            }
            if (!message) {
                // Trigger validation to validate project path
                message = await validateProject(newProjectPath);
                // If no error update path
                if (!message) {
                    setProjectPath(newProjectPath);
                }
            }

            responseAction = {
                type: UPDATE_PROJECT_PATH_RESULT,
                saved: !message,
                message,
                path: !message ? getProjectPath() : undefined
            };
            break;
        }
    }
    return responseAction;
}
