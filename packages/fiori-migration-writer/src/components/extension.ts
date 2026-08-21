import { join } from 'node:path';
import { updateJSON, fileExists, deleteFile } from '../utils/index.js';
import { FileName } from '../project-spec-types.js';
import type { ImportProjectInfo } from '../types.js';

/**
 * Updates the .extconfig.json file for extension projects
 * Handles WebIDE Personal Edition migration and destination updates
 *
 * @param rootPath - Root path of the project
 * @param projectInfo - Project information containing extension settings
 */
export async function updateExtConfigJson(rootPath: string, projectInfo: ImportProjectInfo): Promise<void> {
    let extensionProjectSettingsJSON;
    let deleteProjectJson = false;
    try {
        // Migration of WebIDE Personal Edition created projects
        let extensionProjectSettingsStr = JSON.stringify(projectInfo.extensionProjectSettings);
        const webDepStr = '/webidedispatcher/destinations/';
        deleteProjectJson = extensionProjectSettingsStr.indexOf(webDepStr) > -1;
        extensionProjectSettingsStr = extensionProjectSettingsStr.replaceAll(webDepStr, '/destinations/');
        extensionProjectSettingsJSON = JSON.parse(extensionProjectSettingsStr);
    } catch {
        // fallback to original content
        extensionProjectSettingsJSON = projectInfo.extensionProjectSettings;
    }
    // apply Destination in extensionProjectSettings
    if (
        extensionProjectSettingsJSON?.system &&
        projectInfo.destination &&
        extensionProjectSettingsJSON?.system?.name !== projectInfo.destination
    ) {
        const originalDest = extensionProjectSettingsJSON.system.name;
        extensionProjectSettingsJSON.system.name = projectInfo.destination;

        extensionProjectSettingsJSON.system.sapClient = projectInfo.sapClient ?? '';
        extensionProjectSettingsJSON.system.description = `${projectInfo.destination} connection`;
        if (extensionProjectSettingsJSON.discoveryStatus) {
            extensionProjectSettingsJSON.discoveryStatus.description = `${projectInfo.destination} connection`;
        }
        // Remove optional systemId property
        if (extensionProjectSettingsJSON.system.systemId) {
            delete extensionProjectSettingsJSON.system.systemId;
        }

        try {
            // Update destination in other strings
            let extensionProjectSettingsStr = JSON.stringify(extensionProjectSettingsJSON);
            extensionProjectSettingsStr = extensionProjectSettingsStr.replaceAll(
                `/destinations/${originalDest}`,
                `/destinations/${projectInfo.destination}`
            );
            extensionProjectSettingsJSON = JSON.parse(extensionProjectSettingsStr);
        } catch {
            // fallback to original content
            extensionProjectSettingsJSON = projectInfo.extensionProjectSettings;
        }
    }
    // write .extconfig.json for extension project
    await updateJSON(join(rootPath, FileName.ExtConfigJson), extensionProjectSettingsJSON);
    const projectJsonPath = join(rootPath, '.project.json');
    if (deleteProjectJson && (await fileExists(projectJsonPath))) {
        await deleteFile(projectJsonPath);
    }
}
