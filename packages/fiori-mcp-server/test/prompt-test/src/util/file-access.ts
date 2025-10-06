import fs from "node:fs/promises";

const fileMap: Map<string, Promise<string>> = new Map();

/**
 * Reads a file asynchronously and caches the result.
 *
 * @param path The file path to read
 * @returns Promise resolving to the file contents as a string
 */
export async function readFile(path: string): Promise<string> {
    if (!fileMap.has(path)) {
        fileMap.set(path, fs.readFile(path, "utf-8"));
    }
    return fileMap.get(path)!;
}
