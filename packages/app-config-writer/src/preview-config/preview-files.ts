import { basename, join } from 'path';
import { getWebappPath } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';

const renameMessage = (filename: string): string =>
    `Renamed '${filename}' to '${filename.slice(
        0,
        -5
    )}_old.html'. This file is no longer needed for the preview functionality. If you have not modified this file, you can delete it. If you have modified this file, move the modified content to a custom init script for the preview middleware. For more information, see https://www.npmjs.com/package/preview-middleware#migration.`;

/**
 * Renames the sandbox file which is used in a given script.
 *
 * The corresponding file will be renamed from *.html to *_old.html.
 *
 * @param fs - file system reference
 * @param path - file path to be used for the renaming
 * @param logger logger to report info to the user
 */
export async function renameSandbox(fs: Editor, path: string, logger?: ToolsLogger): Promise<void> {
    if (fs.exists(path)) {
        fs.move(path, path.replace('.html', '_old.html'));
        logger?.info(renameMessage(basename(path)));
    } else if (
        //checks if there is a file with the same name which has already been deleted/renamed to _old.html
        Object.keys(
            fs.dump(undefined, (file) => {
                return file.history.includes(path) && file.state !== 'deleted';
            })
        ).length === 0
    ) {
        logger?.debug(`The file '${basename(path)}', has already been renamed. Skipping renaming.`);
    } else {
        logger?.warn(`The file '${basename(path)}', has not been found. Skipping renaming.`);
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
        await renameSandbox(fs, join(await getWebappPath(basePath), path), logger);
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
                `Deleted the '${join(
                    'webapp',
                    'test',
                    basename(path)
                )}' file. This file is no longer needed for the preview functionality.`
            );
        }
    });
}
