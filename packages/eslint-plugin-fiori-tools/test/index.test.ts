import { join } from 'node:path';
import { getResourcePaths } from '../src/utils';

describe('Tests for utils.ts', () => {
    let mockCwd;

    test('getResourcePaths', async () => {
        mockCwd = jest.spyOn(process, 'cwd');
        mockCwd.mockImplementation(() => join(__dirname, 'test-input/standardProject'));

        expect(await getResourcePaths()).toEqual({ sourceCodePath: 'webapp' });
    });
    test('getResourcePaths', async () => {
        mockCwd = jest.spyOn(process, 'cwd');
        mockCwd.mockImplementation(() => join(__dirname, 'test-input/customWebappProject'));

        expect(await getResourcePaths()).toEqual({ sourceCodePath: 'src/webapp' });
    });
    test('getResourcePaths', async () => {
        mockCwd = jest.spyOn(process, 'cwd');
        mockCwd.mockImplementation(() => join(__dirname, 'test-input/nonUI5Project'));

        expect(await getResourcePaths()).toEqual({ sourceCodePath: 'webapp' });
    });
    test('getResourcePaths', async () => {
        mockCwd = jest.spyOn(process, 'cwd');
        mockCwd.mockImplementation(() => join(__dirname, 'test-input/libraryProject'));

        expect(await getResourcePaths()).toEqual({ sourceCodePath: 'src', 'testCodePath': 'test' });
    });
    test('getResourcePaths', async () => {
        mockCwd = jest.spyOn(process, 'cwd');
        mockCwd.mockImplementation(() => join(__dirname, 'test-input/libraryProjectCustomPaths'));

        expect(await getResourcePaths()).toEqual({ sourceCodePath: 'mySrc', 'testCodePath': 'myTest' });
    });

    test('configs', async () => {
        const configs = await import('../src/index');
        expect(configs).toBeDefined();
    });
});
