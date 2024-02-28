import os from 'os';
import { rmdirSync, existsSync } from 'fs';
import type { Editor } from 'mem-fs-editor';

/**
 * Reusable function to reset/delete the test-output folder before running tests.
 *
 * @param path - folder to be deleted
 */
export function clearTestOutput(path: string) {
    if (existsSync(path)) {
        rmdirSync(path, { recursive: true });
    }
}

/**
 * Write the test results to the file system if UX_DEBUG is activated.
 *
 * @param fs - reference to the mem-fs editor instance
 * @returns a promise when the files are written to the file system.
 */
export function writeFilesForDebugging(fs: Editor): Promise<void> {
    return new Promise((resolve) => {
        // write out the files for debugging
        if (process.env['UX_DEBUG']) {
            fs.commit(resolve);
        } else {
            resolve();
        }
    });
}

export const tabSizingTestCases = [
    {
        name: '6 spaces',
        tabInfo: {
            size: 6
        },
        expectedAfterSave: {
            size: 6,
            useTabSymbol: false
        }
    },
    {
        name: '1 tab',
        tabInfo: {
            useTabSymbol: true
        },
        expectedAfterSave: {
            size: 1,
            useTabSymbol: true
        }
    },
    {
        name: '2 tabs',
        tabInfo: {
            size: 2,
            useTabSymbol: true
        },
        expectedAfterSave: {
            size: 2,
            useTabSymbol: true
        }
    }
];

/**
 * Method returns length of end of lines symbols for passed line.
 * In Windows it might be two symbols '\r\n'.
 *
 * @param line Index of line to calculate.
 * @param content Existing content to check.
 * @returns Length of end of line symbols.
 */
export function getEndOfLinesLength(line: number, content?: string) {
    let size = line * os.EOL.length;
    if (content) {
        // Apply 2 symbols as end of line for Windows if it exists in original file '\n\n'
        size = content.includes('\r\n') ? line * 2 : line;
    }
    return size;
}
