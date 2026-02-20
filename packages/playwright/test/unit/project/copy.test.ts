import { join } from 'node:path';
import { getDestinationProjectRoot } from '../../../src';
import type { CopyOptions } from '../../../src';
import { copyProject } from '../../../src/project/copy';
import { pathExists, remove } from 'fs-extra';
import * as project from '../../../src/project/project';
import * as npm from '../../../src/project/npm';

const projectRoot = join(__dirname, '..', '..', 'fixtures', 'simple-app');
const des = getDestinationProjectRoot(projectRoot);

describe('copyProject', () => {
    test('createCopy', async () => {
        // remove to ensure consistency
        await remove(des);

        const options: CopyOptions = {
            projectRoot,
            remove: {
                content: false,
                nodeModules: false
            },
            npmI: false
        };
        await copyProject(options);
        await expect(pathExists(des)).resolves.toBe(true);
    });
    test('removeProjectContent', async () => {
        const removeProjectContentMocked = jest.spyOn(project, 'removeProjectContent').mockResolvedValue();
        const options: CopyOptions = {
            projectRoot,
            remove: {
                content: true
            },
            npmI: false
        };
        await copyProject(options);
        expect(removeProjectContentMocked.mock.calls).toHaveLength(1);
    });
    test('removeNodeModules', async () => {
        const removeNodeModulesMocked = jest.spyOn(project, 'removeNodeModules').mockResolvedValue();
        const options: CopyOptions = {
            projectRoot,
            remove: {
                content: false,
                nodeModules: true
            },
            npmI: false
        };
        await copyProject(options);
        expect(removeNodeModulesMocked.mock.calls).toHaveLength(1);
    });
    test('cb', async () => {
        const cbFn = jest.fn().mockResolvedValue(undefined);
        const options: CopyOptions = {
            projectRoot,
            remove: {
                content: false,
                nodeModules: false
            },
            cb: cbFn,
            npmI: false
        };
        await copyProject(options);
        expect(cbFn.mock.calls).toHaveLength(1);
    });
    test('npmI', async () => {
        const installMocked = jest.spyOn(npm, 'install').mockResolvedValue();
        const options: CopyOptions = {
            projectRoot,
            remove: {
                content: false,
                nodeModules: true
            },
            npmI: true
        };
        await copyProject(options);
        expect(installMocked.mock.calls).toHaveLength(1);
    });
});
