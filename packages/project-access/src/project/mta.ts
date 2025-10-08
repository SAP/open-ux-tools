import type { Editor } from 'mem-fs-editor';
import { findFileUp } from '../file/file-search';
import { FileName } from '../constants';
import { dirname } from 'node:path';
import type { MtaPath } from '../types/mta';

/**
 * Searches `projectPath` and parent folders.
 * If mta.yaml file is inside projectPath, this is a special type of MTA project
 * that created in Fiori generator (Standalone App Router). E.g. Creating a new project that doesn't have
 * a parent root folder for MTA project, and this project itself is configured
 * to have deploy target CF and user answered yes to "add to Managed App Router" question.
 *
 * @param projectPath - Fiori app root folder
 * @param fs - optional mem-fs-editor instance
 * @returns - MtaPath
 */
export async function getMtaPath(projectPath: string, fs?: Editor): Promise<MtaPath | undefined> {
    const mtaPath = await findFileUp(FileName.MtaYaml, projectPath, fs);
    if (!mtaPath) {
        return undefined;
    } else {
        const mtaFolderPath = dirname(mtaPath);
        return {
            mtaPath,
            hasRoot: mtaFolderPath !== projectPath
        };
    }
}
