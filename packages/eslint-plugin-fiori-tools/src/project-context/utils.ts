import { fileURLToPath, pathToFileURL } from 'node:url';
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
 * Checks and returns the app that the given file belongs to.
 * If a single app is provided, it is returned.
 * Otherwise, looks for an app, which path is a substring in the file path.
 *
 * @param apps - Object containig parsed apps
 * @param path - File path
 * @returns Parsed app if found
 */
export function getAppForPath(apps: { [appUri: string]: ParsedApp }, path: string): ParsedApp | undefined {
    const appUris = Object.keys(apps);
    if (appUris.length === 1 && path.includes(fileURLToPath(appUris[0]))) {
        return apps[appUris[0]];
    }
    if (appUris.length > 1) {
        const appUri = appUris.find((appName) => path.includes(fileURLToPath(appName)));
        if (appUri !== undefined) {
            return apps[appUri];
        }
    }
    return undefined;
}

/**
 * Checks if given object has required FlexChange properties.
 * Does not check for changeFileUri, as it is not defined in the file itself.
 *
 * @param changeObject - Object from parsed .change file
 * @returns boolean
 */
export function isFlexChange(changeObject: Partial<FlexChange>): changeObject is FlexChange {
    return (
        'changeType' in changeObject &&
        changeObject.changeType === 'propertyChange' &&
        'content' in changeObject &&
        typeof changeObject.content?.property === 'string' &&
        'newValue' in changeObject.content &&
        typeof changeObject.selector?.type === 'string' &&
        typeof changeObject.selector?.id === 'string'
    );
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
            const jsonContent = JSON.parse(fileContent);
            if (isFlexChange(jsonContent)) {
                changes.push({
                    changeType: jsonContent.changeType,
                    content: jsonContent.content,
                    selector: jsonContent.selector,
                    changeFileUri: pathToFileURL(changeFile).toString()
                });
            }
        } catch {
            // skip unreadable or malformed change files
        }
    }
    return changes;
}
