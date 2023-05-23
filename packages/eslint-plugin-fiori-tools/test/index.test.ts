import { join } from 'path';
import { getWebAppPath } from '../src/utils';

describe('Tests for utils.ts', () => {
    let mockCwd;

    test('getWebAppPath', async () => {
        mockCwd = jest.spyOn(process, 'cwd');
        mockCwd.mockImplementation(() => join(__dirname, 'test-input/standardProject'));

        expect(await getWebAppPath()).toEqual('webapp');
    });
    test('getWebAppPath', async () => {
        mockCwd = jest.spyOn(process, 'cwd');
        mockCwd.mockImplementation(() => join(__dirname, 'test-input/customWebappProject'));

        expect(await getWebAppPath()).toEqual('src/webapp');
    });
    test('getWebAppPath', async () => {
        mockCwd = jest.spyOn(process, 'cwd');
        mockCwd.mockImplementation(() => join(__dirname, 'test-input/nonUI5Project'));

        expect(await getWebAppPath()).toEqual('webapp');
    });

    test('configs', async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const configs = require('../src/index');
        expect(configs).toBeDefined();
    });
});
