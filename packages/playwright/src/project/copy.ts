import { copy } from 'fs-extra';
import type { CopyOptions } from '../types';
import { removeNodeModules, removeProjectContent, getDestinationProjectRoot } from './project';
import { ToolsLogger } from '@sap-ux/logger';
import { install } from './npm';
const logger = new ToolsLogger();

/**
 * Create a copy of project.
 *
 * @param srcDir source directory
 * @param destDir destination directory
 */
const createCopy = async (srcDir: string, destDir: string): Promise<void> => {
    try {
        logger.info(`Copying from ${srcDir} to ${destDir}`);
        await copy(srcDir, destDir, { overwrite: true });
        logger.info(`Copying finished`);
    } catch (error) {
        logger.info(`Could not copy from ${srcDir} to ${destDir}`);
    }
};

/**
 * Copy project.
 *
 * @param params copy options
 */
export const copyProject = async (params: CopyOptions): Promise<void> => {
    const { cb, remove = { content: true, nodeModules: false }, projectRoot, npmI = true } = params;
    const destinationRoot = getDestinationProjectRoot(projectRoot);
    if (remove.content) {
        // remove only content of project
        await removeProjectContent(destinationRoot);
    }
    if (remove.nodeModules) {
        // remove `node_modules` and `package-lock.json`
        await removeNodeModules(destinationRoot);
    }
    // create project copy
    await createCopy(projectRoot, destinationRoot);

    if (cb) {
        // execute call back
        await cb();
    }
    if (npmI) {
        // install project dependencies
        await install(destinationRoot);
    }
};
