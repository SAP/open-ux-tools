import type { FlexChangeFile, FlexChange, ParsedFlexChangeFile } from './types';
import { join, parse } from 'path';

export interface Files {
    [name: string]: object;
}

/**
 * Merges old and new flex changes, processing conflicts and generating files to be written.
 * 
 * @param path - The file system path to the changes folder where change files will be stored
 * @param oldChanges - Array of existing flex change files with their content and metadata
 * @param newChangesStrings - Optional array of new flex changes serialized as JSON strings
 * @returns An object mapping file paths to change objects that should be written to disk
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
 * Converts an array of serialized change strings into typed FlexChange objects.
 * Filters out any invalid changes that cannot be parsed.
 * 
 * @param changeStrings - Array of serialized flex changes as JSON strings
 * @returns Array of parsed FlexChange objects, excluding any that failed to parse
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
 * Parses a single serialized flex change string into a FlexChange object.
 * Safely handles JSON parsing errors by returning undefined for invalid input.
 * 
 * @param change - A single serialized flex change as a JSON string
 * @returns The parsed FlexChange object, or undefined if parsing fails
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
 * Removes all old flex changes that target the same element and property as the new change.
 * This prevents duplicate changes from accumulating when multiple changes affect the same property.
 * 
 * @param oldChanges - Array of parsed flex change files to search through and modify
 * @param newChange - The new flex change that should replace matching old changes
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
 * Adds parsed change files to the files collection for writing to the filesystem.
 * Each change file is mapped to its target file path within the changes folder.
 * 
 * @param path - The base path to the changes folder where files will be written
 * @param changeFiles - Array of parsed flex change files to be added
 * @param files - Target object that maps file paths to change objects for writing
 */
function writeChangeFiles(path: string, changeFiles: ParsedFlexChangeFile[], files: Files): void {
    if (changeFiles) {
        changeFiles.forEach((element: ParsedFlexChangeFile) => {
            files[join(path, `${element.physicalFileName}`)] = element.change;
        });
    }
}

/**
 * Parses the JSON content of flex change files into structured objects.
 * Safely handles parsing errors by skipping invalid files and continuing with valid ones.
 * 
 * @param changeFiles - Optional array of flex change files with serialized content
 * @returns Array of parsed change files with both metadata and parsed change objects
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
 * Processes a new flex change against existing changes to handle conflicts and duplicates.
 * Determines whether the new change should be skipped (if identical to existing) or should
 * replace existing changes. Preserves original file names when overwriting existing changes.
 * 
 * @param oldChanges - Array of existing parsed flex changes to compare against
 * @param newChange - The new flex change to process and potentially merge
 * @returns True if the new change should be skipped (no further processing needed), false otherwise
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
