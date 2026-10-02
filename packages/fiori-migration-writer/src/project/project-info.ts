import type { ImportProjectInfo, Message } from '../types.js';
import { ProjectAccess } from '../utils/Project.js';

/**
 * Loads project information either from provided data or by fetching from project root.
 *
 * @param projectRoot - Root directory of the project
 * @param importProjectInfo - Optional project info (complete or partial overrides)
 * @returns Project info and any messages
 */
export async function loadOrFetchProjectInfo(
    projectRoot: string,
    importProjectInfo?: ImportProjectInfo
): Promise<{ projectInfo: ImportProjectInfo; messages: Message[] }> {
    let messages: Message[] = [];
    let projectInfo: ImportProjectInfo;

    // Check if importProjectInfo is complete (has critical fields)
    const isCompleteProjectInfo =
        importProjectInfo &&
        importProjectInfo.type !== undefined &&
        importProjectInfo.moduleName !== undefined;

    if (isCompleteProjectInfo) {
        // Use provided complete project info (tests, CLI with full data)
        projectInfo = importProjectInfo!;
    } else {
        // Fetch project info and merge with partial overrides
        const { messages: projectInfoMsgs, projectInfo: accessProjectInfo } =
            await ProjectAccess.getProjectInfo(projectRoot);
        messages = messages.concat(projectInfoMsgs);

        // Merge CLI overrides with fetched project info
        projectInfo = importProjectInfo
            ? { ...accessProjectInfo, ...importProjectInfo }
            : accessProjectInfo;
    }

    return { projectInfo, messages };
}
