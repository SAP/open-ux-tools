import type { ParsedApp, ParsedService } from './parser';

/**
 * Get parsed service by name from parsed application.
 *
 * @param parsedApp - Parsed application model
 * @param serviceName - Name of the service
 * @returns Parsed service model or undefined if not found
 */
export function getParsedServiceByName(parsedApp: ParsedApp, serviceName?: string): ParsedService | undefined {
    const name = serviceName ?? parsedApp.manifest.mainServiceName;
    return parsedApp.services[name];
}
