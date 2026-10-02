import type { Editor } from 'mem-fs-editor';
import { getCurrentEditor, createMemFsEditor } from './fs-adapter.js';

/**
 * Get editor from context, parameter, or create a new one
 * Priority: explicit parameter > context > new instance
 *
 * @param editorOrPath
 */
function getEditor(editorOrPath: string | Editor): Editor {
    if (typeof editorOrPath !== 'string') {
        return editorOrPath;
    }
    // Try to get from context
    const contextEditor = getCurrentEditor();
    if (contextEditor) {
        return contextEditor;
    }
    // Create a temporary one for backward compatibility (tests, direct API usage)
    return createMemFsEditor();
}

/**
 * stripSpaces
 *
 * @param val
 */
export const stripSpaces = (val: string): string => val.replace(/\s/g, '');

/**
 * escapeSingleQuotes
 *
 * @param s
 */
export const escapeSingleQuotes = (s: string): string => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/**
 * escapeDoubleQuotes
 *
 * @param s
 */
export const escapeDoubleQuotes = (s: string): string => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Check if directory exists
 *
 * @param directoryOrFs - Directory path, or Editor instance
 * @param directory - Directory path (if first param is Editor)
 */
export function doesDirectoryExists(directoryOrFs: string | Editor, directory?: string): boolean {
    const fs = getEditor(directoryOrFs);
    const dir = typeof directoryOrFs === 'string' ? directoryOrFs : directory!;
    return fs.exists(dir);
}

/**
 * Check if property exists on object
 *
 * @param obj
 * @param fieldName
 */
export function doesPropertyExist(obj: unknown, fieldName: string): boolean {
    return Object.hasOwn(obj as object, fieldName);
}

/**
 * Create directory if it doesn't exist
 * Note: mem-fs handles directories implicitly, so this is a no-op
 *
 * @param directoryOrFs - Directory path or Editor instance
 * @param directory - Directory path (if first param is Editor)
 */
export function createDirectory(directoryOrFs: string | Editor, directory?: string): boolean {
    // mem-fs handles directories implicitly when writing files
    // Check if it exists for consistency
    const exists = doesDirectoryExists(directoryOrFs, directory);
    return !exists; // Return true if it didn't exist (was "created")
}
