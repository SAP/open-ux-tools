import { join, parse } from 'node:path';
import { existsSync } from 'node:fs';
import { readdir, mkdir } from 'node:fs/promises';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';

/**
 * Internal interface to work with flex changes. This is not the full specification of a flex change,
 * it comprises just the essential parts that we need to work with flex changes, like the filename,
 * property name and selector. We need these to compare old versus new flex changes and write them
 * to the file system
 */
export interface FlexChange {
    fileName: string;
    selector: {
        id: string;
    };
    fileType: string;
    changeType: string;
    content: {
        newValue?: string;
        property: string;
        newBinding?: string;
    };
}

export interface FlexChangeFiles {
    [name: string]: FlexChange;
}

interface ParsedFlexChangeFile {
    filename: string;
    change: FlexChange;
}

/**
 * Returns a mem-fs editor instance. If an instance is not provided, a new one is created.
 *
 * @param {Editor} [fs] - An optional mem-fs editor instance.
 * @returns {Editor} - The mem-fs editor instance.
 */
function getFsInstance(fs?: Editor): Editor {
    return fs ?? create(createStorage());
}

/**
 * Merges old and new flex changes, processing conflicts and generating files to be written.
 *
 * @param path - The file system path to the changes folder where change files will be stored
 * @param oldChanges - Array of existing flex change files with their content and metadata
 * @param newChangesStrings - Optional array of new flex changes serialized as JSON strings
 * @returns An object mapping file paths to change objects that should be written to disk
 */
export function mergeChanges(
    path: string,
    oldChanges: {
        [key: string]: string;
    },
    newChangesStrings?: string[]
): FlexChangeFiles {
    const files: FlexChangeFiles = {};
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
 * Writes updated Flex Changes(from specification export call) to the filesystem.
 *
 * @param changesPath - Path to changes folder.
 * @param changeFiles - Optional array of incoming flex change JSON strings.
 * @param fs - The optional mem-fs editor instance. If not provided, a new instance is created.
 * @returns A promise that resolves mem-fs editor instance.
 */
export async function writeFlexChanges(
    changesPath: string,
    changeFiles: FlexChangeFiles,
    fs?: Editor
): Promise<Editor> {
    fs = getFsInstance(fs);
    // Remove deleted flex change FileSystem
    await removeDeprecateFlexFiles(changesPath, changeFiles, fs);
    // Check if flex changes files exists and changes folder does not exist
    if (Object.keys(changeFiles).length > 0 && !existsSync(join(changesPath))) {
        await mkdir(changesPath);
    }
    // Write updated flex files
    for (const filePath in changeFiles) {
        let oldContent = '';
        if (existsSync(filePath)) {
            oldContent = await fs.read(filePath);
        }
        const fileContent = JSON.stringify(changeFiles[filePath], undefined, 4);
        const isFileChanged = fileContent !== oldContent;
        if (isFileChanged) {
            await fs.write(filePath, fileContent);
        }
    }
    return fs;
}

/**
 * Removes deprecated (outdated) flex change files from the filesystem.
 *
 * @param changesPath - Path to changes folder.
 * @param files - An object where keys represent current flex change file paths.
 * @param fs - The mem-fs editor instance.
 * @returns A promise that resolves when cleanup is complete.
 */
async function removeDeprecateFlexFiles(changesPath: string, files: FlexChangeFiles, fs: Editor): Promise<void> {
    const latestFiles = Object.keys(files);
    // Read directory files and prepare array of files
    try {
        let directoryFiles = await readdir(changesPath);
        // Use relative path with changes folder
        directoryFiles = directoryFiles.map((fileName) => join(changesPath, fileName));
        // Find deprecated files
        const deprecatedFiles = directoryFiles.filter((directoryFile) => !latestFiles.includes(directoryFile));
        // Delete deprecated files
        for (const deprecatedFile of deprecatedFiles) {
            try {
                await fs.delete(deprecatedFile);
            } catch (error) {
                continue;
            }
        }
    } catch (error) {
        return;
    }
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
 * @param change1 - The first change object to compare.
 * @param change2 - The second change object to compare.
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
function writeChangeFiles(path: string, changeFiles: ParsedFlexChangeFile[], files: FlexChangeFiles): void {
    if (changeFiles) {
        for (const element of changeFiles) {
            files[join(path, `${element.filename}`)] = element.change;
        }
    }
}

/**
 * Parses the JSON content of flex change files into structured objects.
 * Safely handles parsing errors by skipping invalid files and continuing with valid ones.
 *
 * @param changeFiles - Optional array of flex change files with serialized content
 * @returns Array of parsed change files with both metadata and parsed change objects
 */
function parseChangeFilesContent(changeFiles?: { [key: string]: string }): ParsedFlexChangeFile[] {
    const parsedChangeFiles: ParsedFlexChangeFile[] = [];
    for (const name in changeFiles) {
        try {
            const change = JSON.parse(changeFiles[name]);
            parsedChangeFiles.push({
                filename: name,
                change
            });
        } catch (error) {
            // do nothing
        }
    }
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
    const oldChangesFiltered: ParsedFlexChangeFile[] = oldChanges?.filter((oldChange) =>
        isMatchingChange(newChange, oldChange.change)
    );
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

            newChange.fileName = parse(oldChangesFiltered[0]?.filename).name;
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
