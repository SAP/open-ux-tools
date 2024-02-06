import { findChrome } from '../../src/locate-chrome';
import { existsSync } from 'fs';
import { homedir } from 'os';

import { join } from 'path';

const existsSyncMock = jest.fn();

jest.mock('fs', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('fs') as object),
    existsSync: (...args: any) => existsSyncMock(...args)
}));

const whichSyncMock = jest.fn();

jest.mock('which', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('which') as object),
    sync: (...args: any) => whichSyncMock(...args)
}));

describe('findChrome', () => {
    let localAppDataEnv: string | undefined;

    beforeAll(() => {
        localAppDataEnv = process.env.LOCALAPPDATA;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        process.env.LOCALAPPDATA = localAppDataEnv;
    });

    it('should return Chrome path on linux', () => {
        Object.defineProperty(process, 'platform', {
            value: 'linux'
        });

        const chromePath = 'path/to/chrome';
        whichSyncMock.mockReturnValue(chromePath);

        expect(findChrome()).toEqual(chromePath);
    });

    it('should return null when which sync fails linux', () => {
        Object.defineProperty(process, 'platform', {
            value: 'linux'
        });

        const chromePath = 'path/to/chrome';
        whichSyncMock.mockImplementation(() => {
            throw new Error('which error');
        });

        expect(findChrome()).toEqual(null);
    });

    it('should return Chrome path on macOS', () => {
        Object.defineProperty(process, 'platform', {
            value: 'darwin'
        });

        const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        existsSyncMock.mockReturnValue(chromePath);

        expect(findChrome()).toEqual(chromePath);
    });

    it('should return Chrome path on windows', () => {
        Object.defineProperty(process, 'platform', {
            value: 'win32'
        });
        process.env.LOCALAPPDATA = 'AppData';

        existsSyncMock.mockReturnValue(true);

        expect(findChrome()).toEqual(`${process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'}`);
    });

    it('should return null for path on windows', () => {
        Object.defineProperty(process, 'platform', {
            value: 'win32'
        });

        existsSyncMock.mockReturnValue(false);

        expect(findChrome()).toEqual(null);
    });
});
