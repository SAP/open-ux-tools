import { hostEnvironment } from '../src/types';
import { isCli, getHostEnvironment } from '../src/environment';
import * as btpUtils from '@sap-ux/btp-utils';

jest.mock('@sap-ux/btp-utils', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/btp-utils')
    };
});

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
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValueOnce(true);
        expect(getHostEnvironment()).toEqual(hostEnvironment.bas);
    });

    it('should return correct host environment - vscode', () => {
        mockCli(false);
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValueOnce(false);
        expect(getHostEnvironment()).toEqual(hostEnvironment.vscode);
    });
});
