import { createWriteStream, existsSync, promises } from 'fs';
import { basename, dirname, join } from 'path';
import * as archiver from 'archiver';
import { glob } from 'glob-gitignore';
import ignore from 'ignore';
import { t } from '../i18n';
import { byteNumberToSizeString } from '../formatter';

interface ArchiveProjectOptions {
    projectRoot: string;
    targetPath?: string;
    targetFileName?: string;
}

/**
 * Archive a project to zip file. Result file is written to parent of the project root folder.
 *
 * @param options - archive project options
 * @param options.projectRoot - root of the project, where package.json is located
 * @param options.targetPath - optional, target path where to create the archive
 * @param options.targetFileName - optional file name, defaults to project folder + timestamp + .zip
 */
export async function archiveProject({
    projectRoot,
    targetPath,
    targetFileName
}: ArchiveProjectOptions): Promise<{ path: string; size: string }> {
    if (!existsSync(projectRoot)) {
        return Promise.reject(new Error(t('error.noProjectRoot', { projectRoot })));
    }
    const fileList = await getFileList(projectRoot);
    return new Promise((resolve, reject) => {
        try {
            const zip = archiver.default('zip', { zlib: { level: 9 } });
            let targetName = '';
            if (typeof targetFileName === 'string') {
                targetName = targetFileName.toLocaleLowerCase().endsWith('.zip')
                    ? targetFileName
                    : targetFileName + '.zip';
            } else {
                targetName = `${basename(projectRoot)}-${new Date()
                    .toISOString()
                    .replace('T', '')
                    .replace(':', '')
                    .substring(0, 14)}.zip`;
            }
            const targetFolder = targetPath ? join(targetPath, targetName) : join(dirname(projectRoot), targetName);
            const writeStream = createWriteStream(targetFolder);
            zip.pipe(writeStream);
            zip.on('error', (error) => reject(error));
            for (const file of fileList) {
                zip.file(join(projectRoot, file), { name: file });
            }
            writeStream.on('close', () => resolve({ path: targetFolder, size: byteNumberToSizeString(zip.pointer()) }));
            zip.finalize();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Get list of files to be added to archive. Depending on the existence of file {cwd}/.gitignore, we use either a default filter
 * or the .gitignore content.
 *
 * @param cwd - working directory, usually the project root
 * @returns - list of files to add to the archive, relative to cwd
 */
async function getFileList(cwd: string): Promise<string[]> {
    const gitignorePath = join(cwd, '.gitignore');
    const hasGitignore = existsSync(gitignorePath);
    const globPattern = hasGitignore ? ['**'] : ['**', '.cdsrc.json', '.extconfig.json'];
    const dot = hasGitignore;
    const ignores = hasGitignore ? (await promises.readFile(gitignorePath)).toString() : ['**/.env', '**/node_modules'];
    const skip = hasGitignore ? undefined : ['**/node_modules/**'];

    const files = await glob(globPattern, {
        cwd,
        dot,
        ignore: ignore().add(ignores),
        skip
    });
    return files;
}
