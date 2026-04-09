import { jest } from '@jest/globals';
import type { Endpoint } from '../../src';
import { Severity } from '../../src/types';

const mockIsAppStudio = jest.fn();
const actualBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...actualBtpUtils,
    isAppStudio: mockIsAppStudio
}));

const mockWriteFile = jest.fn();
jest.unstable_mockModule('node:fs', () => ({
    __esModule: true,
    default: {
        writeFile: (...args: any[]) => mockWriteFile(...args)
    },
    writeFile: (...args: any[]) => mockWriteFile(...args)
}));

const mockCheckEnvironment = jest.fn();
jest.unstable_mockModule('../../src/checks/environment', () => ({
    checkEnvironment: mockCheckEnvironment
}));

const mockStoreResultsZip = jest.fn();
jest.unstable_mockModule('../../src/output', () => ({
    storeResultsZip: mockStoreResultsZip
}));

const { cli } = await import('../../src/cli/index');

describe('Test for cli()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.argv = process.argv.slice(0, 2);
    });

    test('Call cli() -h, should write help to console', async () => {
        // Mock setup
        console.log = jest.fn();
        process.argv = [...process.argv, '-h'];
        mockIsAppStudio.mockReturnValue(true);

        // Test execution
        await cli();

        // Result check
        expect(console.log).toHaveBeenCalledTimes(1);
    });

    test('Call cli() --help should write help to console', async () => {
        // Mock setup
        console.log = jest.fn();
        process.argv = [...process.argv, '--help'];

        // Test execution
        await cli();

        // Result check
        expect(console.log).toHaveBeenCalledTimes(1);
    });

    test('Call cli() without parameters, message result should just write to console', async () => {
        // Mock setup
        mockCheckEnvironment.mockImplementation(() =>
            Promise.resolve({
                messages: [
                    { severity: Severity.Error, text: 'ERROR message' },
                    { severity: Severity.Warning, text: 'WARNING message' },
                    { severity: Severity.Info, text: 'INFO message' },
                    { severity: Severity.Debug, text: 'DEBUG message' }
                ]
            })
        );

        console.error = jest.fn();
        console.warn = jest.fn();
        console.log = jest.fn();
        console.info = jest.fn();

        // Test execution
        await cli();

        // Result check
        expect(console.error).toHaveBeenCalledWith('🔴 ERROR message');
        expect(console.warn).toHaveBeenCalledWith('🟡 WARNING message');
        expect(console.log).toHaveBeenCalledWith('🟢 INFO message');
        expect(console.info).not.toHaveBeenCalled(); // should be called only in case we pass verbose
    });

    test('Call cli() --output verbose, info should be writen to console', async () => {
        // Mock setup
        mockCheckEnvironment.mockImplementation(() =>
            Promise.resolve({
                messages: [{ severity: Severity.Debug, text: 'DEBUG message' }]
            })
        );

        console.info = jest.fn();
        process.argv = [...process.argv, '--output', 'verbose'];

        // Test execution
        await cli();

        // Result check
        expect(console.info).toHaveBeenCalledWith('ℹ DEBUG message');
    });

    test('Call cli() --destination ONE, checkEnvironment() should be called with ONE', async () => {
        // Mock setup
        let checkDest;
        mockCheckEnvironment.mockImplementation((options) => {
            checkDest = options.endpoints;
            return Promise.resolve({
                messages: [],
                destinations: [],
                destinationResults: {}
            });
        });
        process.argv = [...process.argv, '--destination', 'ONE'];

        // Test execution
        await cli();

        // Result check
        expect(checkDest).toEqual(['ONE']);
    });

    test('Call cli() --destination ONE --destination TWO work/space1 work/space2, checkEnvironment() should be called with params', async () => {
        // Mock setup
        let checkDest;
        let checkWorkspace;
        mockCheckEnvironment.mockImplementation((options) => {
            checkDest = options.endpoints.sort();
            checkWorkspace = options.workspaceRoots.sort();
            return Promise.resolve({
                messages: [{ severity: Severity.Info, text: 'Test log message' }],
                destinations: [],
                destinationResults: {}
            });
        });

        process.argv = [...process.argv, '--destination', 'ONE', '--destination', 'TWO', 'work/space1', 'work/space2'];

        // Test execution
        await cli();

        // Result check
        expect(checkDest).toEqual(['ONE', 'TWO']);
        expect(checkWorkspace).toEqual(['work/space1', 'work/space2']);
    });

    test('Call cli() --output json, should write json to file (mocked)', async () => {
        // Mock setup
        let checkWriteOtions;
        let checkContent;
        const result = {
            messages: [{ severity: Severity.Info, text: 'DUMMY TEXT' }],
            destinations: ['DUMMYS' as unknown as Endpoint] as unknown as Endpoint[],
            destinationResults: { DUMMY: { v2: 'V2DUMMY', v4: 'V4DUMMY' } }
        };
        mockCheckEnvironment.mockImplementation(() => Promise.resolve(result));

        mockWriteFile.mockImplementation((options: any, content: any, callback: any) => {
            checkWriteOtions = options;
            checkContent = content;
            callback('' as unknown as NodeJS.ErrnoException);
        });
        process.argv = [...process.argv, '--output', 'json'];

        // Test execution
        await cli();

        // Result check
        expect(checkWriteOtions).toBe('envcheck-results.json');
        expect(checkContent).toBe(JSON.stringify(result, null, 4));
    });

    test('Call cli() --output markdown, should write json to file (mocked)', async () => {
        // Mock setup
        let checkWriteOtions;
        let checkContent;
        const result = {
            messages: [{ severity: Severity.Info, text: 'DUMMY TEXT' }],
            destinations: ['DUMMYS' as unknown as Endpoint] as unknown as Endpoint[],
            destinationResults: { DUMMY: { v2: 'V2DUMMY', v4: 'V4DUMMY' } }
        };
        mockCheckEnvironment.mockImplementation(() => Promise.resolve(result));

        mockWriteFile.mockImplementation((options: any, content: any, callback: any) => {
            checkWriteOtions = options;
            checkContent = content;
            callback('' as unknown as NodeJS.ErrnoException);
        });
        process.argv = [...process.argv, '--output', 'markdown'];

        // Test execution
        await cli();

        // Result check
        expect(checkWriteOtions).toBe('envcheck-results.md');
        expect(checkContent).toContain('DUMMY');
    });

    test('Call cli() --output zip, should write json to file (mocked)', async () => {
        // Mock setup
        let checkContent;
        const result = {
            messages: [{ severity: Severity.Info, text: 'DUMMY TEXT' }],
            destinations: ['DUMMYS' as unknown as Endpoint] as unknown as Endpoint[],
            destinationResults: { DUMMY: { v2: 'V2DUMMY', v4: 'V4DUMMY' } }
        };
        mockCheckEnvironment.mockImplementation(() => Promise.resolve(result));
        mockStoreResultsZip.mockImplementation((content) => {
            checkContent = content;
        });
        process.argv = [...process.argv, '--output', 'zip'];

        // Test execution
        await cli();

        // Result check
        expect(checkContent).toEqual(result);
    });

    test('Call cli() (VSCode)', async () => {
        // Mock setup
        let checkContent;
        const result = {
            messages: [],
            environment: {
                fioriGenVersion: '1',
                cloudCli: '2',
                appWizard: '2',
                ui5LanguageAssistant: '2',
                xmlToolkit: '2',
                annotationMod: '2.2',
                appMod: '2',
                help: '2',
                serviceMod: '2.4',
                cds: '2'
            }
        };
        mockIsAppStudio.mockReturnValue(false);
        mockCheckEnvironment.mockImplementation(() => Promise.resolve(result));
        mockStoreResultsZip.mockImplementation((content) => {
            checkContent = content;
        });
        process.argv = [...process.argv, '--output', 'zip'];

        // Test execution
        await cli();

        // Result check
        expect(mockCheckEnvironment).toHaveBeenCalledTimes(1);
        expect(checkContent).toEqual(result);
    });
});
