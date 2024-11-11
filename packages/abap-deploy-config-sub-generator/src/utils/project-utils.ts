import { getWebappPath } from '@sap-ux/project-access';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';

/**
 * Checks if index.html exists in Fiori project's custom webapp folder path,
 *
 * @param fs - fs editor instance
 * @param path - root path of the project
 *
 * @returns true if index.html exists
 */
export async function indexHtmlExists(fs: Editor, path: string): Promise<boolean> {
    const customWebappPath = await getWebappPath(path);
    const indexHtmlPath = join(customWebappPath, 'index.html');
    return fs.exists(indexHtmlPath);
}
