import type { ExtractedFile } from '../types.js';
import { logger } from '../../../utils/logger.js';

const PATH_MARKER = /\*\*Path:\*\*\s*(.+)/;
const FENCE_OPEN = /^```(\w+)?/;
const FENCE_CLOSE = /^```\s*$/;

function processOutsideBlock(
    line: string,
    state: { inCodeBlock: boolean; currentPath: string; currentCode: string }
): void {
    const pathMatch = PATH_MARKER.exec(line);
    if (pathMatch) {
        state.currentPath = pathMatch[1].trim();
        return;
    }
    if (FENCE_OPEN.test(line)) {
        state.inCodeBlock = true;
        state.currentCode = '';
    }
}

function processInsideBlock(
    line: string,
    state: { inCodeBlock: boolean; currentPath: string; currentCode: string },
    codeBlocks: ExtractedFile[]
): void {
    if (FENCE_CLOSE.test(line)) {
        state.inCodeBlock = false;
        if (state.currentPath && state.currentCode.trim()) {
            codeBlocks.push({ path: state.currentPath, code: state.currentCode.trim() });
        }
        state.currentPath = '';
        state.currentCode = '';
        return;
    }
    state.currentCode += line + '\n';
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
    const state = { inCodeBlock: false, currentPath: '', currentCode: '' };

    for (const line of content.split('\n')) {
        if (!state.inCodeBlock) {
            processOutsideBlock(line, state);
        } else {
            processInsideBlock(line, state, codeBlocks);
        }
    }

    if (state.inCodeBlock) {
        logger.warn(
            `AI response ended with an unclosed code block — content discarded for path: "${state.currentPath || '(no path)'}"`
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
