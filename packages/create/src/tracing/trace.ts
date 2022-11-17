import { existsSync, promises } from 'fs';
import type { Editor } from 'mem-fs-editor';
import { extname } from 'path';
import type { EditorWithDump } from '../types';
import { compareStrings, compareJson } from './compare';
import { getLogger } from './logger';

/**
 * Compare changes from mem-fs-editor and write to logger.
 *
 * @param fs - mem-fs-editor
 */
export async function traceChanges(fs: Editor): Promise<void> {
    const editor = fs as EditorWithDump;
    const changedFiles = editor.dump() || {};
    const logger = getLogger();

    for (const changedFile in changedFiles) {
        const fileStat = changedFiles[changedFile];
        if (fileStat.state === 'deleted') {
            logger.info(`File '${changedFile}' ${fileStat.state}`);
            continue;
        }
        const memContent = fileStat.contents;
        if (!existsSync(changedFile)) {
            logger.info(`File '${changedFile}' added`);
            logger.debug(`File content:\n${memContent}`);
            continue;
        }
        const discContent = await promises.readFile(changedFile, 'utf-8');
        if (discContent === memContent) {
            logger.info(`File '${changedFile}' unchanged`);
            logger.debug(`File content:\n${memContent}`);
            continue;
        }
        logger.info(`File '${changedFile}' modified`);
        const fileExtension: string = extname(changedFile).toLowerCase();
        switch (fileExtension) {
            case '.json': {
                compareJson(JSON.parse(discContent), JSON.parse(memContent));
                break;
            }
            case '.yaml': {
                compareStrings(discContent, memContent);
                break;
            }
            default:
                logger.debug(`Can't compare file. New file content:\n${memContent}`);
        }
    }
}
