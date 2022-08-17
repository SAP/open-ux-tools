import * as mockFs from 'fs';
import type { Destination } from '../../src';
import { cli } from '../../src/cli/index';
import { checkEnvironment } from '../../src/checks/environment';
import { Severity } from '../../src/types';
import { storeResultsZip } from '../../src/output';

jest.mock('fs');
jest.mock('../../src/checks/environment', () => ({
    checkEnvironment: jest.fn()
}));
const mockCheckEnvironment = checkEnvironment as jest.Mock;

jest.mock('../../src/output', () => ({
    storeResultsZip: jest.fn()
}));
const mockStoreResultsZip = storeResultsZip as jest.Mock;

describe('Test for cli()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.argv = process.argv.slice(0, 2);
    });

    test('Call cli() -h, should write help to console', async () => {
        // Mock setup
        console.log = jest.fn();
        process.argv = [...process.argv, '-h'];

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
                    { severity: Severity.Log, text: 'LOG message' }
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
        expect(console.error).toBeCalledWith('🔴 ERROR message');
        expect(console.warn).toBeCalledWith('🟡 WARNING message');
        expect(console.log).toBeCalledWith('🟢 LOG message');
        expect(console.info).not.toHaveBeenCalled(); // should be called only in case we pass verbose
    });

    test('Call cli() --output verbose, info should be writen to console', async () => {
        // Mock setup
        mockCheckEnvironment.mockImplementation(() =>
            Promise.resolve({
                messages: [{ severity: Severity.Info, text: 'INFO message' }]
            })
        );
        console.info = jest.fn();
        process.argv = [...process.argv, '--output', 'verbose'];

        // Test execution
        await cli();

        // Result check
        expect(console.info).toHaveBeenCalledWith('ℹ INFO message');
    });

    test('Call cli() --destination ONE, checkEnvironment() should be called with ONE', async () => {
        // Mock setup
        let checkDest;
        mockCheckEnvironment.mockImplementation((options) => {
            checkDest = options.destinations;
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
            checkDest = options.destinations.sort();
            checkWorkspace = options.workspaceRoots.sort();
            return Promise.resolve({
                messages: [{ severity: Severity.Log, text: 'Test log message' }],
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
            messages: [{ severity: Severity.Log, text: 'DUMMY TEXT' }],
            destinations: ['DUMMYS' as unknown as Destination] as unknown as Destination[],
            destinationResults: { DUMMY: { v2: 'V2DUMMY', v4: 'V4DUMMY' } }
        };
        mockCheckEnvironment.mockImplementation(() => Promise.resolve(result));
        jest.spyOn(mockFs, 'writeFile').mockImplementation((options, content, callback) => {
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
            messages: [{ severity: Severity.Log, text: 'DUMMY TEXT' }],
            destinations: ['DUMMYS' as unknown as Destination] as unknown as Destination[],
            destinationResults: { DUMMY: { v2: 'V2DUMMY', v4: 'V4DUMMY' } }
        };
        mockCheckEnvironment.mockImplementation(() => Promise.resolve(result));
        jest.spyOn(mockFs, 'writeFile').mockImplementation((options, content, callback) => {
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
            messages: [{ severity: Severity.Log, text: 'DUMMY TEXT' }],
            destinations: ['DUMMYS' as unknown as Destination] as unknown as Destination[],
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
});
