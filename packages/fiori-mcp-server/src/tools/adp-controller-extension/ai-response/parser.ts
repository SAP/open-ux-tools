import type { ExtractedFile } from '../types.js';
import { logger } from '../../../utils/logger.js';

const PATH_MARKER = /\*\*Path:\*\*\s*(.+)/;
const FENCE_OPEN = /^```(\w+)?/;
const FENCE_CLOSE = /^```\s*$/;

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
        if (!inCodeBlock) {
            const pathMatch = line.match(PATH_MARKER);
            if (pathMatch) {
                currentPath = pathMatch[1].trim();
                continue;
            }

            if (FENCE_OPEN.test(line)) {
                inCodeBlock = true;
                currentCode = '';
                continue;
            }
        } else {
            if (FENCE_CLOSE.test(line)) {
                inCodeBlock = false;
                if (currentPath && currentCode.trim()) {
                    codeBlocks.push({ path: currentPath, code: currentCode.trim() });
                }
                currentPath = '';
                currentCode = '';
                continue;
            }
            currentCode += line + '\n';
        }
    }

    if (inCodeBlock) {
        logger.warn(
            `AI response ended with an unclosed code block — content discarded for path: "${currentPath || '(no path)'}"`
        );
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
