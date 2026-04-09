import { jest } from '@jest/globals';
import { hostEnvironment } from '../src/types';
import * as actualBtpUtils from '@sap-ux/btp-utils';

jest.unstable_mockModule('@vscode-logging/logger', () => ({
    getExtensionLogger: jest.fn()
}));

const mockIsAppStudio = jest.fn(actualBtpUtils.isAppStudio);
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...actualBtpUtils,
    isAppStudio: mockIsAppStudio
}));

const { isCli, getHostEnvironment } = await import('../src/environment');

function mockCli(isCli: boolean) {
    process.argv[1] = isCli ? 'path/to/yo' : 'path/to/mock';
    process.stdin.isTTY = isCli ? true : false;
}

describe('environment utils', () => {
    const originalArgv = process.argv;

    beforeEach(() => {
        jest.resetAllMocks();
        process.argv = [...originalArgv];
    });

    afterEach(() => {
        process.argv = originalArgv;
    });

    afterAll(() => {
        process.stdin.destroy();
    });

    it('should return true for cli', () => {
        mockCli(true);
        expect(isCli()).toBe(true);
    });

    it('should return false for non-cli', () => {
        mockCli(false);
        expect(isCli()).toBe(false);
    });

    it('should return correct host environment - cli', () => {
        mockCli(true);
        expect(getHostEnvironment()).toEqual(hostEnvironment.cli);
    });

    it('should return correct host environment - app studio', () => {
        mockCli(false);
        mockIsAppStudio.mockReturnValueOnce(true);
        expect(getHostEnvironment()).toEqual(hostEnvironment.bas);
    });

    it('should return correct host environment - vscode', () => {
        mockCli(false);
        mockIsAppStudio.mockReturnValueOnce(false);
        expect(getHostEnvironment()).toEqual(hostEnvironment.vscode);
    });
});
