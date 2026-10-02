import type { ImportProjectInfo, Message } from '../types.js';
import { ProjectAccess } from '../utils/Project.js';

/**
 * Loads project information either from provided data or by fetching from project root.
 *
 * @param projectRoot - Root directory of the project
 * @param importProjectInfo - Optional partial project info with overrides (e.g., connection settings)
 * @returns Project info (fetched metadata merged with overrides) and any messages
 */
export async function loadOrFetchProjectInfo(
    projectRoot: string,
    importProjectInfo?: ImportProjectInfo
): Promise<{ projectInfo: ImportProjectInfo; messages: Message[] }> {
    let messages: Message[] = [];
    let projectInfo: ImportProjectInfo;

    // Always fetch project info to get complete metadata
    const { messages: projectInfoMsgs, projectInfo: accessProjectInfo } =
        await ProjectAccess.getProjectInfo(projectRoot);
    messages = messages.concat(projectInfoMsgs);

    // Merge CLI overrides with fetched project info
    projectInfo = importProjectInfo
        ? { ...accessProjectInfo, ...importProjectInfo }
        : accessProjectInfo;

    return { projectInfo, messages };
}
