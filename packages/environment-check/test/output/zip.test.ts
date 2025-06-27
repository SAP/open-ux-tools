import * as mockFs from 'fs';
import type * as archiver from 'archiver';
import { storeResultsZip } from '../../src/output';
import { Check } from '../../src';

// Need to mock fs and archiver on top level before any test is run
jest.mock('fs');
let zipMock;
jest.mock('archiver', () => ({
    __esModule: true,
    'default': (): typeof zipMock => zipMock
}));

describe('Test to check zip save, storeResultsZip()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Check if writer is creating output appropriately', () => {
        // Mock setup
        zipMock = {
            on: jest.fn(),
            pipe: jest.fn(),
            append: jest.fn(),
            finalize: jest.fn(),
            pointer: () => 123456789
        } as unknown as archiver.Archiver;
        let writeStreamCloseCallback;
        const writeStreamMock = {
            on: (name, callback) => {
                if (name === 'close') {
                    writeStreamCloseCallback = callback;
                }
            }
        } as unknown as mockFs.WriteStream & { on: jest.Mock };
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation((filename) => {
            return filename === 'envcheck-results.zip' ? writeStreamMock : undefined;
        });
        console.log = jest.fn();
        const requestedChecksSet = [Check.Environment, Check.Destinations, Check.EndpointResults];

        // Test execution
        storeResultsZip({ requestedChecks: requestedChecksSet });
        writeStreamCloseCallback();

        // Result check
        expect(zipMock.pipe).toHaveBeenCalledWith(writeStreamMock);
        expect(zipMock.append).toHaveBeenCalledTimes(2);
        expect(zipMock.finalize).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith(`Results written to file 'envcheck-results.zip' 117.74 MB`);
    });

    test('Check writer for file size 0 bytes, different filename, and ENOENT warning', () => {
        // Mock setup
        zipMock = {
            on: jest.fn(),
            pipe: jest.fn(),
            append: jest.fn(),
            finalize: jest.fn(),
            pointer: () => 0
        } as unknown as archiver.Archiver & { on: jest.Mock };
        let writeStreamCloseCallback;
        const writeStreamMock = {
            on: (name, callback) => {
                if (name === 'close') {
                    writeStreamCloseCallback = callback;
                }
            }
        } as unknown as mockFs.WriteStream & { on: jest.Mock };
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation((filename) => {
            return filename === 'ANY_NAME' ? writeStreamMock : undefined;
        });
        console.log = jest.fn();
        console.warn = jest.fn();

        // Test execution
        storeResultsZip({}, 'ANY_NAME');
        writeStreamCloseCallback();
        zipMock.on.mock.calls.find((c) => c[0] === 'warning')[1]({ code: 'ENOENT' });

        // Result check
        expect(zipMock.pipe).toHaveBeenCalledWith(writeStreamMock);
        expect(zipMock.append).toHaveBeenCalled();
        expect(zipMock.finalize).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith(`Results written to file 'ANY_NAME' 0 Bytes`);
        expect(console.warn).toHaveBeenCalledWith({ code: 'ENOENT' });
    });

    test('Should throw exception for wrong writer warning', () => {
        // Mock setup
        zipMock = {
            on: jest.fn(),
            pipe: jest.fn(),
            append: jest.fn(),
            finalize: jest.fn(),
            pointer: () => 0
        } as unknown as archiver.Archiver & { on: jest.Mock };
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation(
            () =>
                ({
                    on: jest.fn()
                } as unknown as mockFs.WriteStream & { on: jest.Mock })
        );

        // Test execution
        storeResultsZip({});

        // Result check
        try {
            const warnHandler = zipMock.on.mock.calls.find((c) => c[0] === 'warning');
            if (warnHandler) {
                warnHandler[1]({});
            }
            fail('Waring callback should throw error but did not');
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    test('Should throw exception for writer error', () => {
        // Mock setup
        zipMock = {
            on: jest.fn(),
            pipe: jest.fn(),
            append: jest.fn(),
            finalize: jest.fn(),
            pointer: () => 0
        } as unknown as archiver.Archiver & { on: jest.Mock };
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation(
            () =>
                ({
                    on: jest.fn()
                } as unknown as mockFs.WriteStream & { on: jest.Mock })
        );

        // Test execution
        storeResultsZip({});

        // Result check
        try {
            const warnHandler = zipMock.on.mock.calls.find((c) => c[0] === 'error');
            if (warnHandler) {
                warnHandler[1]({});
            }
            fail('Waring callback for zip error should throw error but did not');
        } catch (error) {
            expect(error).toBeDefined();
        }
    });
});
