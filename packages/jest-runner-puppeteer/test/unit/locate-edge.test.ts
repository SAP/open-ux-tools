import { getEdgePath, getEdgeDevPath, getAnyEdgeStable } from '../../src/locate-edge';
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

describe('getEdgePath', () => {
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

    it('should return correct path on Linux', () => {
        whichSyncMock.mockReturnValue('/usr/bin/edge');

        Object.defineProperty(process, 'platform', {
            value: 'linux'
        });

        expect(getEdgePath()).toEqual('/usr/bin/edge');
    });

    it('should return correct path on macOS', () => {
        existsSyncMock.mockReturnValue(true);
        Object.defineProperty(process, 'platform', {
            value: 'darwin'
        });

        expect(getEdgePath()).toEqual('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
    });

    it('should return correct path on Windows', () => {
        Object.defineProperty(process, 'platform', {
            value: 'win32'
        });

        process.env.LOCALAPPDATA = 'AppData';

        existsSyncMock.mockReturnValue(true);
        expect(getEdgePath()).toEqual(
            `${join(process.env.LOCALAPPDATA, '\\Microsoft\\Edge\\Application\\msedge.exe')}`
        );
    });

    it('should throw an error if path not found on Linux', () => {
        whichSyncMock.mockImplementationOnce(() => {
            throw new Error('sync error');
        });

        Object.defineProperty(process, 'platform', {
            value: 'linux'
        });

        expect(getEdgePath).toThrowError(
            'Edge browser not found. Please recheck your installation. Here are list of executable we tried to search: edge'
        );
    });

    it('should throw an error if path not found on macOS', () => {
        existsSyncMock.mockReturnValue(false);
        Object.defineProperty(process, 'platform', {
            value: 'darwin'
        });

        expect(getEdgePath).toThrowError(
            'Edge browser not found. Please recheck your installation. Path /Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
        );
    });

    it('should throw an error if path not found on Windows', () => {
        existsSyncMock.mockReturnValue(false);
        Object.defineProperty(process, 'platform', {
            value: 'win32'
        });

        expect(getEdgePath).toThrowError('Edge browser not found. Please recheck your installation.');
    });

    it('should throw an error if platform is invalid', () => {
        existsSyncMock.mockReturnValue(false);
        Object.defineProperty(process, 'platform', {
            value: 'invalid-platform'
        });

        expect(getEdgePath).toThrowError('Your platform is not supported.');
    });
});

describe('getEdgeDevPath', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return correct path on Linux', () => {
        whichSyncMock.mockReturnValue('/usr/bin/microsoft-edge-dev');

        Object.defineProperty(process, 'platform', {
            value: 'linux'
        });

        expect(getEdgeDevPath()).toEqual('/usr/bin/microsoft-edge-dev');
    });

    it('should throw an error if platform is invalid', () => {
        existsSyncMock.mockReturnValue(false);
        Object.defineProperty(process, 'platform', {
            value: 'invalid-platform'
        });

        expect(getEdgeDevPath).toThrowError('Your platform is not supported.');
    });
});

describe('getAnyEdgeStable', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return edge path if available', () => {
        existsSyncMock.mockReturnValue(true);
        Object.defineProperty(process, 'platform', {
            value: 'darwin'
        });
        expect(getAnyEdgeStable()).toEqual('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
    });

    it('should return edge dev path if edge path not available', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error');

        const edgeDevPath = '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev';
        existsSyncMock.mockReturnValueOnce(false).mockReturnValue(true);

        Object.defineProperty(process, 'platform', {
            value: 'darwin'
        });

        expect(getAnyEdgeStable()).toEqual(edgeDevPath);
        expect(consoleErrorSpy).toBeCalledWith(
            'Edge browser not found. Please recheck your installation. Path /Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
        );
    });

    it('should throw an error if both edge and edge dev paths are not available', () => {
        existsSyncMock.mockReturnValue(false);

        Object.defineProperty(process, 'platform', {
            value: 'darwin'
        });
        expect(getAnyEdgeStable).toThrowError('Unable to find any path');
    });
});
