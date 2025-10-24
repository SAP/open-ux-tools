import type { FlexChangeFile, FlexChange, ParsedFlexChangeFile } from './types';
import { join, parse } from 'path';

export interface Files {
    [name: string]: object;
}

/**
 * Merge an array of serialized flex changes (delete, modify, keep)
 * @param path - path to changes folder
 * @param oldChangesStrings - array of serialized flex changes
 * @param newChangesStrings - array of serialized flex changes
 */
export function mergeChanges(path: string, oldChanges: FlexChangeFile[], newChangesStrings?: string[]): Files {
    const files: Files = {};
    const oldChangesParsed = parseChangeFilesContent(oldChanges);
    const newChanges = convertFlexChanges(newChangesStrings);

    // find new changes that differ from old changes
    if (newChanges) {
        while (newChanges.length > 0) {
            const newChange: FlexChange = newChanges.pop() as FlexChange;
            if (processFlexChanges(oldChangesParsed, newChange)) {
                continue;
            }

            if (newChange.content['newValue'] !== null) {
                // create new change
                files[join(path, `${newChange.fileName}.change`)] = newChange;
            }
        }
    }
    // add remaining old changes
    writeChangeFiles(path, oldChangesParsed, files);

    return files;
}

/**
 * Convert array of string changes to typed array of flex changes
 * @param changeStrings - array of serialized changes as strings
 */
function convertFlexChanges(changeStrings: string[] = []): FlexChange[] {
    const changes: FlexChange[] = [];
    for (const changeString of changeStrings) {
        const change = parseFlexChange(changeString);
        if (change) {
            changes.push(change);
        }
    }
    return changes;
}

/**
 * Convert array of string changes to typed array of flex changes
 * @param changeStrings - array of serialized changes as strings
 */
function parseFlexChange(change: string): FlexChange | undefined {
    try {
        return JSON.parse(change) as FlexChange;
    } catch (error) {
        // do nothing
    }
}

/**
 * Determines whether two FlexChange objects represent matching changes.
 *
 * @param change1 The first change object to compare.
 * @param change2 The second change object to compare.
 * @returns `true` if the two changes match according to the criteria above, otherwise `false`.
 */
function isMatchingChange(change1: FlexChange, change2: FlexChange): boolean {
    return (
        (change1.changeType === 'propertyChange' || change1.changeType === 'propertyBindingChange') &&
        change1.changeType === change2.changeType &&
        change1.content?.property === change2['content']?.property &&
        change1.selector?.id === change2['selector']?.id
    );
}

/**
 * Deletes multiple occurences of old flexChanges in case a new flexChange is created
 * @param oldChanges - array of serialized flex changes
 * @param newChange - newly created flexChange
 */
function deleteOldFlexChanges(oldChanges: ParsedFlexChangeFile[], newChange: FlexChange) {
    for (let index = oldChanges.length - 1; index >= 0; index--) {
        const oldChange = oldChanges[index].change;
        if (
            newChange.selector.id === oldChange.selector.id &&
            newChange.content.property === oldChange.content.property
        ) {
            oldChanges.splice(index, 1);
        }
    }
}

/**
 * Adds changeFiles to files object
 * @param path - path to changes folder
 * @param changeFiles - array of serialized flex changes
 * @param files - object containing list of flexChanges to be written
 */
function writeChangeFiles(path: string, changeFiles: ParsedFlexChangeFile[], files: Files): void {
    if (changeFiles) {
        changeFiles.forEach((element: ParsedFlexChangeFile) => {
            files[join(path, `${element.physicalFileName}`)] = element.change;
        });
    }
}

/**
 * Parses fileContent of change files
 * @param changeFiles - array of serialized flex changes
 */
function parseChangeFilesContent(changeFiles?: FlexChangeFile[]): ParsedFlexChangeFile[] {
    const parsedChangeFiles: ParsedFlexChangeFile[] = [];
    changeFiles?.forEach((element: FlexChangeFile) => {
        try {
            const change = JSON.parse(element.fileContent);
            parsedChangeFiles.push({
                ...element,
                change
            });
        } catch (error) {
            // do nothing
        }
    });
    return parsedChangeFiles;
}

/**
 * Removes oldFlexChanges if a new flexChange is created and preserves fileName if flexChange exists
 * @param oldChanges - array of serialized flex changes
 * @param newChange - newly created flexChange
 * @returns {Promise<boolean>} true if further processing is not required
 */
function processFlexChanges(oldChanges: ParsedFlexChangeFile[], newChange: FlexChange): boolean {
    const oldChangesFiltered: ParsedFlexChangeFile[] =
        oldChanges && oldChanges.filter((oldChange) => isMatchingChange(newChange, oldChange.change));
    if (oldChangesFiltered && oldChangesFiltered.length > 0) {
        if (oldChangesFiltered.length === 1) {
            const oldChange = oldChangesFiltered[0].change;
            if (
                (oldChange.content.newValue !== undefined &&
                    newChange.content.newValue !== undefined &&
                    oldChange.content.newValue === newChange.content.newValue) ||
                (oldChange.content.newBinding !== undefined &&
                    newChange.content.newBinding !== undefined &&
                    oldChange.content.newBinding === newChange.content.newBinding)
            ) {
                //nothing changed, keep old change (added later)
                return true;
            }

            newChange.fileName = parse(oldChangesFiltered[0]?.physicalFileName).name;
            // delete the old change, new change will overwrite the file with the new content
            const oldChangeIndex = oldChanges.findIndex((oldChange) => isMatchingChange(newChange, oldChange.change));
            oldChanges.splice(oldChangeIndex, 1);
        } else {
            // if there are more than one flexChanges for a same property, delete them all
            deleteOldFlexChanges(oldChanges, newChange);
        }
    }
    return false;
}
