import type { ODataServiceInfo } from '@sap-ux/axios-extension';
import type { EnvironmentCheckResult } from './types';
import { toolsExtensionListVSCode } from './types';

/**
 * Count the number of services from the result of a catalog call.
 *
 * @param catalogResult - V2 or V4 result of catalog call
 * @returns - number of services
 */
export function countNumberOfServices(catalogResult?: ODataServiceInfo[]): number {
    let numberServices = 0;
    if (Array.isArray(catalogResult)) {
        numberServices = catalogResult.length;
    }
    return numberServices;
}

/**
 * Format string to write number of services, e.g. 1 service or 123 services.
 *
 * @param count - number of service
 * @returns - string with number of services
 */
export function getServiceCountText(count: number) {
    return count === 1 ? `${count} service` : `${count} services`;
}

/**
 * Returns replacer function that can be used with JSON.stringify to detect
 * and replace circular structures.
 *
 * @example JSON.stringify(object, getCircularReplacer());
 * @returns - replacer that replaces circular structures
 */
export function getCircularReplacer(): (key: string, value: any) => any {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '|CIRCULAR STRUCTURE|';
            }
            seen.add(value);
        }
        return value;
    };
}

/**
 * Formats the environment check results into a string for copying.
 *
 * @param envcheckResults environment check results to be parsed
 * @returns stringified results
 */
export function formatResultsForClipboard(envcheckResults: EnvironmentCheckResult): string {
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
