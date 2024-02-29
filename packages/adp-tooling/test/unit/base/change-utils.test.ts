import { sep } from 'path';
import type { Editor } from 'mem-fs-editor';
import { readFileSync, existsSync, readdirSync } from 'fs';

import { type AnnotationsData, type PropertyValueType, ChangeType } from '../../../src';
import {
    findChangeWithInboundId,
    getGenericChange,
    getParsedPropertyValue,
    parseStringToObject,
    writeAnnotationChange,
    writeChangeToFolder
} from '../../../src/base/change-utils';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    readFileSync: jest.fn()
}));

describe('Change Utils', () => {
    describe('writeChangeToFolder', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const projectPath = '/project';
        const change = { key: 'value' };
        const fileName = 'something.change';
        const writeJsonSpy = jest.fn();
        const mockFs = { writeJSON: writeJsonSpy };

        it('should write change to the specified folder without subdirectory', () => {
            writeChangeToFolder(projectPath, change, fileName, mockFs as unknown as Editor);

            expect(writeJsonSpy).toHaveBeenCalledWith(expect.stringContaining(fileName), change);
        });

        it('should write change to the specified folder with subdirectory', () => {
            const dir = 'subdir';
            writeChangeToFolder(projectPath, change, fileName, mockFs as unknown as Editor, dir);

            expect(writeJsonSpy).toHaveBeenCalledWith(expect.stringContaining(`subdir/${fileName}`), change);
        });

        it('should throw error when writing json fails', () => {
            const errMsg = 'Corrupted json.';
            mockFs.writeJSON.mockImplementation(() => {
                throw new Error(errMsg);
            });

            const expectedPath = `${sep}project${sep}webapp${sep}changes/something.change`;

            expect(() => {
                writeChangeToFolder(projectPath, change, fileName, mockFs as unknown as Editor);
            }).toThrow(
                `Could not write change to folder. Reason: Could not write change to file: ${expectedPath}. Reason: Corrupted json.`
            );
        });
    });

    describe('parseStringToObject', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should correctly parse a valid JSON string', () => {
            expect(parseStringToObject('"key":"value"')).toEqual({ key: 'value' });
        });

        it('should throw an error for invalid JSON string', () => {
            const invalidJsonStr = '"key": value';
            expect(() => parseStringToObject(invalidJsonStr)).toThrow(SyntaxError);
        });
    });

    describe('getParsedPropertyValue', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('returns an object for a valid JSON string', () => {
            expect(getParsedPropertyValue('{"key": "value"}' as PropertyValueType)).toEqual({ key: 'value' });
        });

        it('returns the original string for a non-JSON string', () => {
            const nonJsonStr = 'nonJSONValue';
            expect(getParsedPropertyValue(nonJsonStr as PropertyValueType)).toBe(nonJsonStr);
        });

        it('returns the original string for an invalid JSON string', () => {
            const invalidJsonStr = '{"key": value}';
            expect(getParsedPropertyValue(invalidJsonStr as PropertyValueType)).toBe(invalidJsonStr);
        });
    });

    describe('getGenericChange', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const mockData = {
            projectData: {
                namespace: 'mockNamespace',
                layer: 'mockLayer',
                id: 'mockId'
            },
            timestamp: Date.now()
        };
        const mockContent = { key: 'value' };

        it('should return the correct change object structure', () => {
            const result = getGenericChange(
                mockData as AnnotationsData,
                mockContent,
                ChangeType.ADD_ANNOTATIONS_TO_ODATA
            );

            expect(result).toEqual({
                fileName: `id_${mockData.timestamp}`,
                namespace: `${mockData.projectData.namespace}/changes`,
                layer: mockData.projectData.layer,
                fileType: 'change',
                creation: expect.any(String),
                packageName: '$TMP',
                reference: mockData.projectData.id,
                support: { generator: '@sap-ux/adp-tooling' },
                changeType: ChangeType.ADD_ANNOTATIONS_TO_ODATA,
                content: mockContent
            });
        });
    });

    describe('findChangeWithInboundId', () => {
        const mockProjectPath = '/mock/project/path';
        const mockInboundId = 'mockInboundId';

        beforeEach(() => {
            jest.resetAllMocks();
        });

        const existsSyncMock = existsSync as jest.Mock;
        const readdirSyncMock = readdirSync as jest.Mock;
        const readFileSyncMock = readFileSync as jest.Mock;

        it('should return empty results if the directory does not exist', () => {
            existsSyncMock.mockReturnValue(false);

            const result = findChangeWithInboundId(mockProjectPath, mockInboundId);

            expect(result).toEqual({ filePath: '', changeWithInboundId: undefined });
        });

        it('should return empty results if no matching file is found', () => {
            existsSyncMock.mockReturnValue(true);
            readdirSyncMock.mockReturnValue([]);

            const result = findChangeWithInboundId(mockProjectPath, mockInboundId);

            expect(result).toEqual({ filePath: '', changeWithInboundId: undefined });
        });

        it('should return the change object and file path if a matching file is found', () => {
            existsSyncMock.mockReturnValue(true);
            readdirSyncMock.mockReturnValue([{ name: 'id_changeInbound.change', isFile: () => true }]);
            readFileSyncMock.mockReturnValue(JSON.stringify({ content: { inboundId: mockInboundId } }));

            const result = findChangeWithInboundId(mockProjectPath, mockInboundId);

            expect(result).toEqual({
                filePath: expect.stringContaining('id_changeInbound.change'),
                changeWithInboundId: { content: { inboundId: mockInboundId } }
            });
        });

        it('should throw an error if reading the file fails', () => {
            existsSyncMock.mockReturnValue(true);
            readdirSyncMock.mockReturnValue([{ name: 'id_changeInbound.change', isFile: () => true }]);
            readFileSyncMock.mockImplementation(() => {
                throw new Error('Read file error');
            });

            expect(() => findChangeWithInboundId(mockProjectPath, mockInboundId)).toThrow(
                'Could not find change with inbound id'
            );
        });
    });

    describe('writeAnnotationChange', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const mockProjectPath = '/mock/project/path';
        const mockData = {
            annotationFilePath: '',
            timestamp: '123456789',
            annotationFileName: 'mockAnnotation.xml'
        };
        const mockChange = { key: 'value' };
        const writeJsonSpy = jest.fn();
        const writeSpy = jest.fn();
        const copySpy = jest.fn();
        const mockFs = {
            write: writeSpy,
            copy: copySpy,
            writeJSON: writeJsonSpy
        };

        it('should write the change file and an empty annotation file for NewEmptyFile option', () => {
            writeAnnotationChange(
                mockProjectPath,
                mockData as unknown as AnnotationsData,
                mockChange,
                mockFs as unknown as Editor
            );

            expect(writeJsonSpy).toHaveBeenCalledWith(
                expect.stringContaining('id_123456789_addAnnotationsToOData.change'),
                mockChange
            );

            expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('mockAnnotation.xml'), '');
        });

        it('should copy the annotation file to the correct directory if not creating a new empty file', () => {
            mockData.annotationFilePath = `/mock/path/to/annotation/file.xml`;

            writeAnnotationChange(
                mockProjectPath,
                mockData as unknown as AnnotationsData,
                mockChange,
                mockFs as unknown as Editor
            );

            expect(copySpy).toHaveBeenCalledWith(
                mockData.annotationFilePath,
                expect.stringContaining('mockAnnotation.xml')
            );
        });

        it('should not copy the annotation file if the selected directory is the same as the target', () => {
            mockData.annotationFilePath = `${sep}mock${sep}project${sep}path${sep}webapp${sep}changes${sep}annotations${sep}mockAnnotation.xml`;

            writeAnnotationChange(
                mockProjectPath,
                mockData as unknown as AnnotationsData,
                mockChange,
                mockFs as unknown as Editor
            );

            expect(copySpy).not.toHaveBeenCalled();
        });

        it('should throw error when write operation fails', () => {
            mockData.annotationFilePath = '';

            mockFs.write.mockImplementation(() => {
                throw new Error('Failed to write JSON');
            });

            expect(() => {
                writeAnnotationChange(
                    mockProjectPath,
                    mockData as unknown as AnnotationsData,
                    mockChange,
                    mockFs as unknown as Editor
                );
            }).toThrow('Could not write annotation changes. Reason: Failed to write JSON');
        });
    });
});
