import type { EnvironmentCheckResult } from '../types';
import { toolsExtensionListVSCode } from '../types';

/**
 * Formats the environment check results into a string for copying.
 *
 * @param envcheckResults environment check results to be parsed
 * @returns stringified results
 */
export function convertResultsToString(envcheckResults: EnvironmentCheckResult): string {
    const environment = envcheckResults.environment;
    const platform = `Platform : ${environment?.platform}\n`;
    const devEnv = `Development environment : ${environment?.developmentEnvironment}\n`;
    let clipboardContent = `${platform}${devEnv}`;
    if (environment?.toolsExtensions) {
        for (const toolExt of Object.keys(environment.toolsExtensions)) {
            const toolExtName = toolsExtensionListVSCode.get(toolExt);
            clipboardContent = clipboardContent.concat(
                `${toolExtName} : ${
                    environment?.toolsExtensions[toolExt as keyof typeof environment.toolsExtensions]
                }\n`
            );
        }
    }
    return clipboardContent;
}
