import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { FileName } from '../constants';
import { fileExists, findFilesByExtension } from '../file';

/**
 * Get the used programming language of an app.
 *
 * @param appRoot - root folder of the application
 * @param memFs - optional mem-fs editor instance
 * @returns - used language, JavaScript or TypeScript
 */
export async function getAppLanguage(appRoot: string, memFs?: Editor): Promise<'JavaScript' | 'TypeScript'> {
    if (await fileExists(join(appRoot, FileName.Tsconfig), memFs)) {
        const result = await findFilesByExtension('.ts', appRoot, ['node_modules'], memFs);
        if (result.length > 0) {
            return 'TypeScript';
        }
    }
    return 'JavaScript';
}
