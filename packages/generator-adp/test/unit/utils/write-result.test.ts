import { jest } from '@jest/globals';

const mockExistsSync = jest.fn<typeof realFs.existsSync>();
const mockReadFileSync = jest.fn<typeof realFs.readFileSync>();
const mockWriteFileSync = jest.fn<typeof realFs.writeFileSync>();

const realFs = await import('node:fs');
jest.unstable_mockModule('node:fs', () => ({
    ...realFs,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync
}));

const { writeResult, RESULT_FILE_PATH } = await import('../../../src/utils/write-result.js');

describe('writeResult', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should write the project path under the given id when the file does not exist', () => {
        mockExistsSync.mockReturnValue(false);

        writeResult('id-1', '/home/user/projects/app.variant');

        expect(mockReadFileSync).not.toHaveBeenCalled();
        expect(mockWriteFileSync).toHaveBeenCalledWith(
            RESULT_FILE_PATH,
            JSON.stringify({ 'id-1': '/home/user/projects/app.variant' })
        );
    });

    it('should write a failure result under the given id', () => {
        mockExistsSync.mockReturnValue(false);

        writeResult('id-1', 'Failure: something went wrong');

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            RESULT_FILE_PATH,
            JSON.stringify({ 'id-1': 'Failure: something went wrong' })
        );
    });

    it('should merge the new result into existing entries', () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(JSON.stringify({ existing: '/path/existing' }));

        writeResult('id-2', '/path/new');

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            RESULT_FILE_PATH,
            JSON.stringify({ existing: '/path/existing', 'id-2': '/path/new' })
        );
    });

    it.each([
        ['malformed JSON', 'not-json'],
        ['a non-object value', '42'],
        ['an array', '[1,2]']
    ])('should treat %s result file as empty', (_label, fileContent) => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(fileContent);

        writeResult('id-3', '/path/new');

        expect(mockWriteFileSync).toHaveBeenCalledWith(RESULT_FILE_PATH, JSON.stringify({ 'id-3': '/path/new' }));
    });

    it('should swallow a write failure instead of throwing', () => {
        mockExistsSync.mockReturnValue(false);
        mockWriteFileSync.mockImplementation(() => {
            throw new Error('EACCES');
        });

        expect(() => writeResult('id-6', '/path/new')).not.toThrow();
    });
});
