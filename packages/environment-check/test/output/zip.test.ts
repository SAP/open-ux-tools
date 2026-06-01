import { jest } from '@jest/globals';
import type * as archiver from 'archiver';

const mockCreateWriteStream = jest.fn();
jest.unstable_mockModule('node:fs', () => ({
    createWriteStream: mockCreateWriteStream
}));

let zipMock: any;
jest.unstable_mockModule('archiver', () => ({
    __esModule: true,
    default: (): typeof zipMock => zipMock
}));

const { storeResultsZip } = await import('../../src/output');
const { Check } = await import('../../src/types');

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
        let writeStreamCloseCallback: any;
        const writeStreamMock = {
            on: (name: string, callback: any) => {
                if (name === 'close') {
                    writeStreamCloseCallback = callback;
                }
            }
        };
        mockCreateWriteStream.mockImplementation((filename: string) => {
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
        } as unknown as archiver.Archiver & { on: ReturnType<typeof jest.fn> };
        let writeStreamCloseCallback: any;
        const writeStreamMock = {
            on: (name: string, callback: any) => {
                if (name === 'close') {
                    writeStreamCloseCallback = callback;
                }
            }
        };
        mockCreateWriteStream.mockImplementation((filename: string) => {
            return filename === 'ANY_NAME' ? writeStreamMock : undefined;
        });
        console.log = jest.fn();
        console.warn = jest.fn();

        // Test execution
        storeResultsZip({}, 'ANY_NAME');
        writeStreamCloseCallback();
        zipMock.on.mock.calls.find((c: any) => c[0] === 'warning')[1]({ code: 'ENOENT' });

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
        } as unknown as archiver.Archiver & { on: ReturnType<typeof jest.fn> };
        mockCreateWriteStream.mockImplementation(() => ({
            on: jest.fn()
        }));

        // Test execution
        storeResultsZip({});

        // Result check
        try {
            const warnHandler = zipMock.on.mock.calls.find((c: any) => c[0] === 'warning');
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
        } as unknown as archiver.Archiver & { on: ReturnType<typeof jest.fn> };
        mockCreateWriteStream.mockImplementation(() => ({
            on: jest.fn()
        }));

        // Test execution
        storeResultsZip({});

        // Result check
        try {
            const warnHandler = zipMock.on.mock.calls.find((c: any) => c[0] === 'error');
            if (warnHandler) {
                warnHandler[1]({});
            }
            fail('Waring callback for zip error should throw error but did not');
        } catch (error) {
            expect(error).toBeDefined();
        }
    });
});
