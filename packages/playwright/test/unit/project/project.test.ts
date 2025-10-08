import { join } from 'node:path';
import {
    removeNodeModules,
    removeProjectContent,
    getDestinationProjectRoot,
    nodeModulesUpToDate,
    storePackageJsonHash
} from '../../../src/project/project';
import { copyProject } from '../../../src';
import type { CopyOptions } from '../../../src';
import { pathExists, ensureDir } from 'fs-extra';

const projectRoot = join(__dirname, '..', '..', 'fixtures', 'simple-app');
const des = getDestinationProjectRoot(projectRoot);

beforeEach(async () => {
    // first create project copy
    const options: CopyOptions = {
        projectRoot,
        remove: {
            content: false,
            nodeModules: false
        },
        npmI: false
    };
    await copyProject(options);
});
test('removeProjectContent', async () => {
    // check src folder exits
    const srcFolder = join(des, 'src');
    await expect(pathExists(srcFolder)).resolves.toBe(true);
    // remove content
    await removeProjectContent(des);
    // check src is removed
    await expect(pathExists(srcFolder)).resolves.toBe(false);
});
test('removeNodeModules', async () => {
    // create node_modules folder
    const nodeModulesFolder = join(des, 'node_modules', 'has-content');
    await ensureDir(nodeModulesFolder);
    // make sure `node_modules` is created
    await expect(pathExists(nodeModulesFolder)).resolves.toBe(true);
    // remove
    await removeNodeModules(des);
    // check `node_modules` is removed
    await expect(pathExists(nodeModulesFolder)).resolves.toBe(false);
});
test('getDestinationProjectRoot', async () => {
    const result = getDestinationProjectRoot(projectRoot);
    expect(result.endsWith(join('fixtures-copy', 'simple-app'))).toBeTruthy();
});
describe('nodeModulesUpToDate', () => {
    test('node_modules does not exits', async () => {
        // remove `node_modules`
        await removeNodeModules(des);
        const result = await nodeModulesUpToDate(des);
        expect(result).toBe(false);
    });
    test('node_modules exits', async () => {
        // create node_modules folder
        const nodeModulesFolder = join(des, 'node_modules', 'has-content');
        await ensureDir(nodeModulesFolder);
        // make sure `node_modules` is created
        await expect(pathExists(nodeModulesFolder)).resolves.toBe(true);
        const result = await nodeModulesUpToDate(des);
        expect(result).toBe(false);
    });
});

test('storePackageJsonHash', async () => {
    // remove content
    await storePackageJsonHash(des);
    // check packageJsonHash is created
    await expect(pathExists(join(des, 'packageJsonHash'))).resolves.toBe(true);
});
