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
