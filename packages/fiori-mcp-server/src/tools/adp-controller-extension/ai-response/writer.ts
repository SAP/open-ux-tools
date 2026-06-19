import { promises as FSpromises } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { logger } from '../../../utils/logger.js';
import type { ExtractedFile } from '../types.js';

/**
 * Raised when an extracted file path resolves outside the adaptation project
 * root. Callers convert it into an `error` tool response.
 */
export class PathTraversalError extends Error {
    /**
     * @param appPath Adaptation project root.
     * @param requestedPath Path supplied by the AI response.
     */
    constructor(appPath: string, requestedPath: string) {
        super(`File path ${requestedPath} is outside the application path ${appPath}`);
        this.name = 'PathTraversalError';
    }
}

/**
 * Resolves a path supplied by the model against `appPath` and confirms it
 * stays inside the project. Accepts absolute and relative inputs; both are
 * resolved to absolute form and compared against `appPath` with a trailing
 * separator so that sibling directories sharing a prefix are rejected.
 *
 * @param appPath Adaptation project root directory.
 * @param requestedPath Path supplied by the AI response (slash- or
 *   backslash-separated, absolute or relative).
 * @returns The resolved path, expressed relative to `appPath`.
 * @throws {PathTraversalError} If the resolved path is outside `appPath`.
 */
export function resolveWithinAppPath(appPath: string, requestedPath: string): string {
    const normalizedInput = requestedPath.replace(/\\/g, '/');
    const resolvedAppPath = resolve(appPath);
    const resolvedFilePath = isAbsolute(normalizedInput)
        ? resolve(normalizedInput)
        : resolve(resolvedAppPath, normalizedInput);

    const appPathWithSep = resolvedAppPath.endsWith(sep) ? resolvedAppPath : resolvedAppPath + sep;
    if (resolvedFilePath !== resolvedAppPath && !resolvedFilePath.startsWith(appPathWithSep)) {
        throw new PathTraversalError(appPath, requestedPath);
    }
    return relative(resolvedAppPath, resolvedFilePath);
}

/**
 * Writes a single extracted file under `appPath`, creating parent
 * directories as needed. Returns the relative path on success.
 *
 * @param appPath Adaptation project root directory.
 * @param file Extracted file produced by the parser.
 * @returns The path that was written, relative to `appPath`.
 * @throws {PathTraversalError} If the file would be written outside the project.
 */
export async function writeExtractedFile(appPath: string, file: ExtractedFile): Promise<string> {
    const relativePath = resolveWithinAppPath(appPath, file.path);
    const fullPath = join(appPath, relativePath);
    await FSpromises.mkdir(dirname(fullPath), { recursive: true });
    await FSpromises.writeFile(fullPath, file.code, 'utf-8');
    logger.info(`Created file: ${relativePath}`);
    return relativePath;
}
