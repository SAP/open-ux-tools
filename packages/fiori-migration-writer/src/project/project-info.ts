import type { ImportProjectInfo, Message } from '../types.js';
import { ProjectAccess } from '../utils/Project.js';

/**
 * Loads project information either from provided data or by fetching from project root.
 *
 * @param projectRoot - Root directory of the project
 * @param importProjectInfo - Optional pre-loaded project info
 * @returns Project info and any messages generated during loading
 */
export async function loadOrFetchProjectInfo(
    projectRoot: string,
    importProjectInfo?: ImportProjectInfo
): Promise<{ projectInfo: ImportProjectInfo; messages: Message[] }> {
    let messages: Message[] = [];
    let projectInfo: ImportProjectInfo;

    if (!importProjectInfo) {
        // Fetch project info if not provided
        const { messages: projectInfoMsgs, projectInfo: accessProjectInfo } =
            await ProjectAccess.getProjectInfo(projectRoot);
        messages = messages.concat(projectInfoMsgs);
        projectInfo = accessProjectInfo;
    } else {
        // Use provided project info
        projectInfo = importProjectInfo;
    }

    return { projectInfo, messages };
}
