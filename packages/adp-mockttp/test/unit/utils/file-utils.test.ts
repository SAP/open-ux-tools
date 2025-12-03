import AdmZip from 'adm-zip';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import { MOCK_DATA_FOLDER_PATH } from '../../../src/server-constants';
import { createMockDataFolderIfNeeded, normalizeZipFileContent } from '../../../src/utils/file-utils';
import { readFixture } from '../../utils/fixture-utils';

jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('file-utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createMockDataFolderIfNeeded', () => {
        test('should return the result from fs.mkdir', async () => {
            const expectedResult = 'mock-result' as any;
            mockFs.mkdir.mockResolvedValue(expectedResult);

            const result = await createMockDataFolderIfNeeded();

            expect(result).toBe(expectedResult);
            expect(mockFs.mkdir).toHaveBeenCalledWith(MOCK_DATA_FOLDER_PATH, { recursive: true });
        });
    });

    describe('normalizeZipFileContent', () => {
        test('should return deterministic output for same ZIP content', () => {
            const files = [
                { name: 'file1.txt', content: 'content1' },
                { name: 'file2.txt', content: 'content2' }
            ];
            const zipBuffer = createZipBuffer(files);

            const result1 = normalizeZipFileContent(zipBuffer);
            const result2 = normalizeZipFileContent(zipBuffer);

            expect(result1).toBe(result2);
            expect(zipBuffer);
        });

        test('should return deterministic output for same ZIP content when the zip buffer has different base64 byte representation (ABAP behaviour)', () => {
            const zipBase64Bytes1 = readFixture('zipBase64Bytes1.txt');
            const zipBase64Bytes2 = readFixture('zipBase64Bytes2.txt');

            const zipBuffer1 = Buffer.from(zipBase64Bytes1, 'base64');
            const zipBuffer2 = Buffer.from(zipBase64Bytes2, 'base64');

            const result1 = normalizeZipFileContent(zipBuffer1);
            const result2 = normalizeZipFileContent(zipBuffer2);

            expect(zipBase64Bytes1).not.toEqual(zipBase64Bytes2);
            expect(result1).toEqual(result2);
        });

        test('should sort files alphabetically by name', () => {
            const files = [
                { name: 'c-file.txt', content: 'content-c' },
                { name: 'a-file.txt', content: 'content-a' },
                { name: 'b-file.txt', content: 'content-b' }
            ];
            const zipBuffer = createZipBuffer(files);

            const result = normalizeZipFileContent(zipBuffer);
            const parsed = JSON.parse(result);

            expect(parsed).toHaveLength(3);
            expect(parsed[0].name).toBe('a-file.txt');
            expect(parsed[1].name).toBe('b-file.txt');
            expect(parsed[2].name).toBe('c-file.txt');
        });

        test('should generate correct file hashes', () => {
            const files = [{ name: 'test.txt', content: 'test content' }];
            const zipBuffer = createZipBuffer(files);

            const result = normalizeZipFileContent(zipBuffer);
            const parsed = JSON.parse(result);

            const expectedHash = getFileContentStableHash('test content');
            expect(parsed[0]).toEqual({
                name: 'test.txt',
                hash: expectedHash
            });
            expect(parsed).toHaveLength(1);
        });

        test('should handle empty ZIP files', () => {
            const zip = new AdmZip();
            const emptyZipBuffer = zip.toBuffer();

            const result = normalizeZipFileContent(emptyZipBuffer);
            const parsed = JSON.parse(result);

            expect(parsed).toEqual([]);
        });

        test('should produce same result regardless of file addition order', () => {
            // Create ZIP with files in different orders
            const files1 = [
                { name: 'file1.txt', content: 'content1' },
                { name: 'file2.txt', content: 'content2' }
            ];
            const files2 = [
                { name: 'file2.txt', content: 'content2' },
                { name: 'file1.txt', content: 'content1' }
            ];

            const zipBuffer1 = createZipBuffer(files1);
            const zipBuffer2 = createZipBuffer(files2);

            const result1 = normalizeZipFileContent(zipBuffer1);
            const result2 = normalizeZipFileContent(zipBuffer2);

            expect(result1).toBe(result2);
        });

        test('should handle files with same content but different names', () => {
            const files = [
                { name: 'file1.txt', content: 'same content' },
                { name: 'file2.txt', content: 'same content' }
            ];
            const zipBuffer = createZipBuffer(files);

            const result = normalizeZipFileContent(zipBuffer);
            const parsed = JSON.parse(result);

            expect(parsed).toHaveLength(2);
            expect(parsed[0].name).toBe('file1.txt');
            expect(parsed[1].name).toBe('file2.txt');
            // Both should have the same hash since content is identical
            expect(parsed[0].hash).toBe(parsed[1].hash);
        });

        test('should handle files with different content', () => {
            const files = [
                { name: 'file1.txt', content: 'content1' },
                { name: 'file2.txt', content: 'content2' }
            ];
            const zipBuffer = createZipBuffer(files);

            const result = normalizeZipFileContent(zipBuffer);
            const parsed = JSON.parse(result);

            expect(parsed).toHaveLength(2);
            expect(parsed[0].hash).not.toBe(parsed[1].hash);
        });

        test('should handle binary content', () => {
            const zip = new AdmZip();
            const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xff]);
            zip.addFile('binary.bin', binaryContent);
            const zipBuffer = zip.toBuffer();

            const result = normalizeZipFileContent(zipBuffer);
            const parsed = JSON.parse(result);

            expect(parsed).toHaveLength(1);
            expect(parsed[0].name).toBe('binary.bin');
            expect(typeof parsed[0].hash).toBe('string');
            expect(parsed[0].hash).toHaveLength(64); // SHA256 hex length
        });

        test('should handle special characters in filenames', () => {
            const files = [
                { name: 'файл.txt', content: 'unicode content' },
                { name: 'file with spaces.txt', content: 'space content' },
                { name: 'file-with-dashes.txt', content: 'dash content' }
            ];
            const zipBuffer = createZipBuffer(files);

            const result = normalizeZipFileContent(zipBuffer);
            const parsed = JSON.parse(result);

            expect(parsed).toHaveLength(3);
            // Should be sorted alphabetically
            const names = parsed.map((f: any) => f.name);
            const sortedNames = [...names].sort();
            expect(names).toEqual(sortedNames);
        });
    });
});

function createZipBuffer(files: Array<{ name: string; content: string }>): Buffer {
    const zip = new AdmZip();
    files.forEach(({ name, content }) => {
        zip.addFile(name, Buffer.from(content, 'utf-8'));
    });
    return zip.toBuffer();
}

function getFileContentStableHash(content: string): string {
    const buffer = Buffer.from(content, 'utf-8');
    const uint8Array = Uint8Array.from(buffer);
    return createHash('sha256').update(uint8Array).digest('hex');
}
