import { pathToFileURL } from 'node:url';
import type { ParsedApp, ParsedService } from './parser/index.js';
import { readFileSync } from 'node:fs';
import type { FlexChange } from './parser/types.js';

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

/**
 * Reads provided .change file uris and returns property change object array.
 *
 * @param changeFiles - Property change file uri array.
 * @returns FlexChange array.
 */
export function collectFlexChanges(changeFiles: string[]): FlexChange[] {
    const changes: FlexChange[] = [];
    for (const changeFile of changeFiles) {
        try {
            const fileContent = readFileSync(changeFile, { encoding: 'utf8', flag: 'r' });
            const jsonContent = JSON.parse(fileContent) as FlexChange;
            changes.push({
                changeType: jsonContent.changeType,
                content: jsonContent.content,
                selector: jsonContent.selector,
                changeFileUri: pathToFileURL(changeFile).toString()
            });
        } catch {
            // skip unreadable or malformed change files
            continue;
        }
    }
    return changes;
}
