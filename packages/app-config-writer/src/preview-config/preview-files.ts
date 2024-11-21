import { basename, join } from 'path';
import { extractUrlDetails } from './package-json';
import { getWebappPath } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';

const renameMessage = (filename: string): string =>
    `Renamed '${filename}' to '${filename.slice(
        0,
        -5
    )}_old.html'. This file is no longer needed for the preview. In case there have not been done any modifications you can delete this file. In case of modifications please move the respective content to a custom init script of the preview middleware (see migration information https://www.npmjs.com/package/preview-middleware#migration).`;

/**
 * Renames the sandbox file which is used in a given script.
 *
 * The corresponding file will be renamed from *.html to *_old.html.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param script - the content of the script
 * @param logger logger to report info to the user
 */
export async function renameSandbox(fs: Editor, basePath: string, script: string, logger?: ToolsLogger): Promise<void> {
    const { path: relativePath } = extractUrlDetails(script);
    if (relativePath) {
        const absolutePath = join(await getWebappPath(basePath), relativePath);
        if (fs.exists(absolutePath)) {
            fs.move(absolutePath, absolutePath.replace('.html', '_old.html'));
            logger?.info(renameMessage(relativePath));
        } else if (
            //checks if there is a file with the same name which has already been deleted/renamed to _old.html
            Object.keys(
                fs.dump(basePath, (file) => {
                    return file.history.includes(absolutePath) && file.state !== 'deleted';
                })
            ).length === 0
        ) {
            logger?.debug(`File '${relativePath}' has already been renamed. Skipping renaming.`);
        } else {
            logger?.warn(`File '${relativePath}' not found. Skipping renaming.`);
        }
    }
}

/**
 * Renames the default sandbox files.
 *
 * The default files are 'flpSandbox.html' and 'flpSandboxMockserver.html' and located under webapp/test.
 * It adds '_old' to 'test/flpSandbox.html' and 'test/flpSandboxMockserver.html' to indicate that they will no longer be used.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 */
export async function renameDefaultSandboxes(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const defaultSandboxPaths = [join('test', 'flpSandbox.html'), join('test', 'flpSandboxMockserver.html')];
    for (const path of defaultSandboxPaths) {
        //use fake script to be able to re-use the renameSandbox function for the default sandboxes as well
        const fakeScript = ` --open ${path}`;
        await renameSandbox(fs, basePath, fakeScript, logger);
    }
}

/**
 * Deletes the *.js and *.ts files which are no longer used for the virtual preview.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 */
export async function deleteNoLongerUsedFiles(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const webappTestPath = join(await getWebappPath(basePath), 'test');
    [
        join(webappTestPath, 'locate-reuse-libs.js'),
        join(webappTestPath, 'changes_loader.js'),
        join(webappTestPath, 'changes_loader.ts'),
        join(webappTestPath, 'changes_preview.js'),
        join(webappTestPath, 'changes_preview.ts'),
        join(webappTestPath, 'flpSandbox.js'),
        join(webappTestPath, 'flpSandbox.ts'),
        join(webappTestPath, 'initFlpSandbox.js'),
        join(webappTestPath, 'initFlpSandbox.ts')
    ].forEach((path: string): void => {
        if (fs.exists(path)) {
            fs.delete(path);
            logger?.info(
                `Deleted '${join('webapp', 'test', basename(path))}'. This file is no longer needed for the preview.`
            );
        }
    });
}
