import type { Editor } from 'mem-fs-editor';
import { create as createMemFs } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import * as fsNode from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Global mem-fs editor instance when mem-fs mode is enabled
 */
let memFsEditor: Editor | undefined;

/**
 * Enable mem-fs mode with provided editor
 *
 * @param editor - Mem-fs editor instance to use for file operations
 */
export function enableMemFs(editor: Editor): void {
    memFsEditor = editor;
}

/**
 * Disable mem-fs mode (use real file system)
 */
export function disableMemFs(): void {
    memFsEditor = undefined;
}

/**
 * Check if mem-fs mode is enabled
 *
 * @returns True if mem-fs mode is active
 */
export function isMemFsEnabled(): boolean {
    return memFsEditor !== undefined;
}

/**
 * Get current mem-fs editor (or create one if needed)
 *
 * @returns Mem-fs editor instance
 */
export function getOrCreateEditor(): Editor {
    if (!memFsEditor) {
        const store = createMemFs();
        memFsEditor = createEditor(store);
    }
    return memFsEditor;
}

/**
 * Get current mem-fs editor if one is active
 *
 * @returns Current editor or undefined
 */
export function getCurrentEditor(): Editor | undefined {
    return memFsEditor;
}

/**
 * Write file (mem-fs or real fs)
 *
 * @param path - File path
 * @param content - File content
 */
export async function writeFile(path: string, content: string | Buffer): Promise<void> {
    if (memFsEditor) {
        memFsEditor.write(path, content);
    } else {
        // Ensure directory exists
        await fsNode.mkdir(dirname(path), { recursive: true });
        await fsNode.writeFile(path, content, typeof content === 'string' ? 'utf-8' : undefined);
    }
}

/**
 * Read file (mem-fs or real fs)
 *
 * @param path - File path
 * @returns File content as string
 */
export async function readFile(path: string): Promise<string> {
    if (memFsEditor) {
        return memFsEditor.read(path, { raw: false }) as string;
    } else {
        return await fsNode.readFile(path, 'utf-8');
    }
}

/**
 * Read file as buffer (mem-fs or real fs)
 *
 * @param path - File path
 * @returns File content as Buffer
 */
export async function readFileBuffer(path: string): Promise<Buffer> {
    if (memFsEditor) {
        const content = memFsEditor.read(path, { raw: true });
        if (Buffer.isBuffer(content)) {
            return content;
        }
        if (typeof content === 'string') {
            return Buffer.from(content, 'utf-8');
        }
        // Handle other types (ArrayBuffer, Uint8Array, etc.)
        return Buffer.from(content as any);
    } else {
        return await fsNode.readFile(path);
    }
}

/**
 * Copy file (mem-fs or real fs)
 *
 * @param src - Source path
 * @param dest - Destination path
 */
export async function copyFile(src: string, dest: string): Promise<void> {
    if (memFsEditor) {
        memFsEditor.copy(src, dest);
    } else {
        await fsNode.mkdir(dirname(dest), { recursive: true });
        await fsNode.copyFile(src, dest);
    }
}

/**
 * Check if file exists (mem-fs or real fs)
 *
 * @param path - File path
 * @returns True if file exists
 */
export function exists(path: string): boolean {
    if (memFsEditor) {
        return memFsEditor.exists(path);
    } else {
        return existsSync(path);
    }
}

/**
 * Delete file (mem-fs or real fs)
 *
 * @param path - File path
 */
export async function deleteFile(path: string): Promise<void> {
    if (memFsEditor) {
        memFsEditor.delete(path);
    } else {
        try {
            await fsNode.unlink(path);
        } catch (err: any) {
            if (err?.code !== 'ENOENT') {
                throw err;
            }
        }
    }
}

/**
 * Create directory (mem-fs or real fs)
 *
 * @param path - Directory path
 */
export async function mkdir(path: string): Promise<void> {
    if (memFsEditor) {
        // mem-fs handles directories implicitly when writing files
        // No explicit mkdir needed
    } else {
        await fsNode.mkdir(path, { recursive: true });
    }
}

/**
 * Copy template with EJS processing (mem-fs or real fs)
 *
 * @param from - Template source path
 * @param to - Destination path
 * @param context - Template variables
 * @param options - Copy options
 */
export function copyTpl(from: string | string[], to: string, context?: Record<string, any>, options?: any): void {
    if (memFsEditor) {
        memFsEditor.copyTpl(from, to, context, options);
    } else {
        throw new Error('copyTpl requires mem-fs mode to be enabled');
    }
}

/**
 * Read JSON file (mem-fs or real fs)
 *
 * @param path - File path
 * @returns Parsed JSON object
 */
export async function readJSON<T = any>(path: string): Promise<T> {
    const content = await readFile(path);
    return JSON.parse(content);
}

/**
 * Write JSON file (mem-fs or real fs)
 *
 * @param path - File path
 * @param data - Data to write
 * @param space - JSON formatting spaces (default 2)
 */
export async function writeJSON(path: string, data: any, space: number = 2): Promise<void> {
    const content = JSON.stringify(data, null, space);
    await writeFile(path, content);
}

/**
 * Commit pending mem-fs changes to disk
 *
 * @returns Promise that resolves when commit is complete
 */
export function commit(): Promise<void> {
    if (memFsEditor) {
        return new Promise((resolve, reject) => {
            memFsEditor!.commit((err: Error[]) => {
                if (err && err.length > 0) {
                    reject(err[0]);
                } else {
                    resolve();
                }
            });
        });
    }
    return Promise.resolve();
}
