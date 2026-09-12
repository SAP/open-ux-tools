import type { ExtractedFile } from '../types.js';

const PATH_MARKER = /\*\*Path:\*\*\s*(.+)/;
const FENCE_OPEN = /^```(\w+)?/;

/**
 * Returns `true` when `line` closes the current code fence.
 *
 * @param line - Current source line.
 * @param inCodeBlock - Whether we are currently inside a fenced code block.
 * @returns `true` if this line is a closing fence.
 */
function isFenceClose(line: string, inCodeBlock: boolean): boolean {
    return inCodeBlock && line.startsWith('```');
}

/**
 * Returns `true` when `line` opens a new code fence.
 *
 * @param line - Current source line.
 * @param inCodeBlock - Whether we are currently inside a fenced code block.
 * @returns `true` if this line is an opening fence.
 */
function isFenceOpen(line: string, inCodeBlock: boolean): boolean {
    return !inCodeBlock && FENCE_OPEN.test(line);
}

/**
 * Appends an extracted file entry to `out` when both `path` and `code` are non-empty.
 *
 * @param path - File path declared by the preceding `**Path:**` marker.
 * @param code - Accumulated code block content (before trimming).
 * @param out - Accumulator array to push the result into.
 */
function closeFence(path: string, code: string, out: ExtractedFile[]): void {
    if (path && code.trim()) {
        out.push({ path, code: code.trim() });
    }
}

/**
 * Parses an AI response containing markdown code blocks preceded by
 * `**Path:** <fullFilePath>` markers and returns the extracted files. Lines
 * outside fenced blocks are ignored. A code block without a preceding path
 * marker is dropped.
 *
 * @param content Raw AI response text.
 * @returns Files declared in the response.
 */
export function extractFilesFromResponse(content: string): ExtractedFile[] {
    const codeBlocks: ExtractedFile[] = [];
    const lines = content.split('\n');
    let currentPath = '';
    let inCodeBlock = false;
    let currentCode = '';

    for (const line of lines) {
        const pathMatch = PATH_MARKER.exec(line);
        if (pathMatch) {
            currentPath = pathMatch[1].trim();
            const remainder = line.slice(line.indexOf(pathMatch[0]) + pathMatch[0].length);
            if (isFenceOpen(remainder, inCodeBlock)) {
                inCodeBlock = true;
                currentCode = '';
            }
            continue;
        }

        if (isFenceClose(line, inCodeBlock)) {
            inCodeBlock = false;
            closeFence(currentPath, currentCode, codeBlocks);
            currentPath = '';
            currentCode = '';
            continue;
        }

        if (isFenceOpen(line, inCodeBlock)) {
            inCodeBlock = true;
            currentCode = '';
            continue;
        }

        if (inCodeBlock) {
            currentCode += line + '\n';
        }
    }

    return codeBlocks;
}

/**
 * Returns `true` for `.change` files. The AI may emit those alongside code
 * files but they are persisted by a separate flow, so the writer skips them.
 *
 * @param filePath Candidate file path or filename.
 * @returns Whether the path looks like a flexibility change file.
 */
export function isChangeFile(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.change');
}
