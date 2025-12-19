import type { ParsedApp, ParsedService } from './parser';

/**
 * Normalizes a URL by replacing backslashes with forward slashes and removing leading slashes.
 *
 * @param url - The URL to normalize.
 * @returns The normalized URL.
 */
export function uniformUrl(url: string): string {
    return url
        .replace(/\\/g, '/')
        .replace(/\/\//g, '/')
        .replace(/(?:^\/)/g, '');
}

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
