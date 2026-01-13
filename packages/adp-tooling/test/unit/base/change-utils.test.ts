import path, { resolve } from 'node:path';
import { create, type Editor } from 'mem-fs-editor';
import type { UI5FlexLayer } from '@sap-ux/project-access';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { renderFile } from 'ejs';

jest.mock('ejs', () => ({
    ...jest.requireActual('ejs'),
    renderFile: jest.fn()
}));
const renderFileMock = renderFile as jest.Mock;

import {
    type AnnotationsData,
    type PropertyValueType,
    ChangeType,
    type ManifestChangeProperties,
    type DescriptorVariant,
    type AdpWriterConfig,
    type App,
    type ToolsSupport,
    FlexLayer
} from '../../../src';
import {
    findChangeWithInboundId,
    getChange,
    getChangesByType,
    getParsedPropertyValue,
    parseStringToObject,
    transformKeyUserChangeForAdp,
    writeAnnotationChange,
    writeChangeToFolder,
    writeKeyUserChanges
} from '../../../src/base/change-utils';
import type { KeyUserChangeContent } from '@sap-ux/axios-extension';
import { create as createStorage } from 'mem-fs';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    readFileSync: jest.fn(),
    writeJSON: jest.fn()
}));

jest.mock('path', () => ({
    ...jest.requireActual('path'),
    resolve: jest.fn()
}));

describe('Change Utils', () => {
    describe('writeChangeToFolder', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const projectPath = 'project';
        const change = { key: 'value', fileName: 'something' };
        const writeJsonSpy = jest.fn();
        const mockFs = { writeJSON: writeJsonSpy };

        it('should write change to the specified folder without subdirectory', async () => {
            await writeChangeToFolder(
                projectPath,
                change as unknown as ManifestChangeProperties,
                mockFs as unknown as Editor
            );

            expect(writeJsonSpy).toHaveBeenCalledWith(expect.stringContaining(change.fileName), change);
        });

        it('should write change to the specified folder with subdirectory', async () => {
            const dir = 'subdir';
            await writeChangeToFolder(
                projectPath,
                change as unknown as ManifestChangeProperties,
                mockFs as unknown as Editor,
                dir
            );

            expect(writeJsonSpy).toHaveBeenCalledWith(expect.stringContaining(path.join(dir, change.fileName)), change);
        });

        it('should throw error when writing json fails', async () => {
            const errMsg = 'Corrupted json.';
            mockFs.writeJSON.mockImplementation(() => {
                throw new Error(errMsg);
            });

            const expectedPath = path.join('project', 'webapp', 'changes', `${change.fileName}.change`);

            await expect(() =>
                writeChangeToFolder(
                    projectPath,
                    change as unknown as ManifestChangeProperties,
                    mockFs as unknown as Editor
                )
            ).rejects.toThrow(
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

    describe('getChange', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const mockData = {
            projectData: {
                namespace: 'mockNamespace',
                layer: 'mockLayer' as UI5FlexLayer,
                id: 'mockId'
            },
            timestamp: Date.now()
        };
        const mockContent = { key: 'value' };

        it('should throw error when changeType is an empty string', () => {
            const invalidChangeType = '' as unknown as ChangeType;
            expect(() => getChange(mockData.projectData, mockData.timestamp, mockContent, invalidChangeType)).toThrow(
                `Could not extract the change name from the change type: ${invalidChangeType}`
            );
        });

        it('should throw error when changeType is undefined', () => {
            const invalidChangeType = undefined as unknown as ChangeType;
            expect(() => getChange(mockData.projectData, mockData.timestamp, mockContent, invalidChangeType)).toThrow(
                `Could not extract the change name from the change type: ${invalidChangeType}`
            );
        });

        it('should return the correct change object structure', () => {
            const result = getChange(
                mockData.projectData,
                mockData.timestamp,
                mockContent,
                ChangeType.ADD_ANNOTATIONS_TO_ODATA
            );

            expect(result).toEqual({
                fileName: expect.stringContaining('_addAnnotationsToOData'),
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

    describe('getChangesByType', () => {
        const mockFiles = [
            { name: 'id_addNewModel.change', isFile: () => true },
            { name: 'id_changeDataSource.change', isFile: () => true }
        ];

        const mockChange1 = {
            fileName: 'id_addNewModel.change',
            changeType: 'appdescr_ui5_addNewModel'
        };
        const mockChange2 = {
            fileName: 'id_changeDataSource.change',
            changeType: 'appdescr_app_changeDataSource'
        };

        beforeEach(() => {
            jest.resetAllMocks();
        });

        const existsSyncMock = existsSync as jest.Mock;
        const readdirSyncMock = readdirSync as jest.Mock;
        const readFileSyncMock = readFileSync as jest.Mock;
        const resolveMock = path.resolve as jest.Mock;

        beforeEach(() => {
            existsSyncMock.mockReturnValue(true);
            readdirSyncMock.mockReturnValue(mockFiles);
            readFileSyncMock
                .mockReturnValueOnce(JSON.stringify(mockChange1))
                .mockReturnValueOnce(JSON.stringify(mockChange2));
            resolveMock.mockImplementation((_, fileName) => `mock/path/${fileName}`);
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should return an array of change objects for a specific change type', () => {
            const results = getChangesByType('mock/project', ChangeType.ADD_NEW_MODEL);

            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject(mockChange1);
        });

        it('should return an empty array if no matching files are found', () => {
            readdirSyncMock.mockReturnValue([]);
            const results = getChangesByType('mock/project', ChangeType.ADD_NEW_MODEL);

            expect(results).toHaveLength(0);
        });

        it('should handle subdirectories correctly', () => {
            getChangesByType('mock/project', ChangeType.ADD_NEW_MODEL, 'manifest');

            expect(resolve).toHaveBeenCalledWith('mock/project/webapp/changes/manifest', 'id_addNewModel.change');
        });

        it('should return an empty array if the target directory does not exist', () => {
            existsSyncMock.mockReturnValue(false);
            const results = getChangesByType('mock/project', ChangeType.ADD_NEW_MODEL);

            expect(results).toHaveLength(0);
        });

        it('should return an empty array if the subdirectory is given and target directory does not exist', () => {
            existsSyncMock.mockReturnValueOnce(true).mockReturnValueOnce(false);
            const results = getChangesByType('mock/project', ChangeType.ADD_NEW_MODEL, 'manifest');

            expect(results).toHaveLength(0);
        });

        it('should throw an error if there is an issue reading the change files', () => {
            readdirSyncMock.mockImplementation(() => {
                throw new Error('Failed to read');
            });

            expect(() => getChangesByType('mock/project', ChangeType.ADD_NEW_MODEL)).toThrow(
                'Error reading change files: Failed to read'
            );
        });
    });

    describe('findChangeWithInboundId', () => {
        const mockProjectPath = '/mock/project/path';
        const mockInboundId = 'mockInboundId';
        const memFs = create(createStorage());

        beforeEach(() => {
            jest.resetAllMocks();
        });

        const existsSyncMock = existsSync as jest.Mock;
        const readdirSyncMock = readdirSync as jest.Mock;
        const readFileSyncMock = readFileSync as jest.Mock;

        it('should return empty results if the directory does not exist', async () => {
            existsSyncMock.mockReturnValue(false);

            const result = await findChangeWithInboundId(mockProjectPath, mockInboundId, memFs);

            expect(result).toEqual({ filePath: '', changeWithInboundId: undefined });
        });

        it('should return empty results if no matching file is found', async () => {
            existsSyncMock.mockReturnValue(true);
            readdirSyncMock.mockReturnValue([]);

            const result = await findChangeWithInboundId(mockProjectPath, mockInboundId, memFs);

            expect(result).toEqual({ filePath: '', changeWithInboundId: undefined });
        });

        it('should return the change object and file path if a matching file is found', async () => {
            existsSyncMock.mockReturnValue(true);
            readdirSyncMock.mockReturnValue([
                { name: 'id_addAnnotationsToOData.change', isFile: () => true },
                { name: 'id_changeInbound.change', isFile: () => true }
            ]);
            readFileSyncMock.mockReturnValue(JSON.stringify({ content: { inboundId: mockInboundId } }));

            const result = await findChangeWithInboundId(mockProjectPath, mockInboundId, memFs);

            expect(result).toEqual({
                filePath: expect.stringContaining('id_changeInbound.change'),
                changeWithInboundId: { content: { inboundId: mockInboundId } }
            });
        });

        it('should throw an error if reading the file fails', async () => {
            existsSyncMock.mockReturnValue(true);
            readdirSyncMock.mockReturnValue([{ name: 'id_changeInbound.change', isFile: () => true }]);
            readFileSyncMock.mockImplementation(() => {
                throw new Error('Read file error');
            });

            await expect(() => findChangeWithInboundId(mockProjectPath, mockInboundId, memFs)).rejects.toThrow(
                'Could not find change with inbound id'
            );
        });
    });

    describe('writeAnnotationChange', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const mockProjectPath = 'mock/project/path';
        const mockTemplatesPath = 'mock/templates/path';
        const mockData = {
            variant: {
                layer: 'CUSTOMER_BASE',
                reference: 'mock.reference',
                id: 'adp.mock.variant',
                namespace: 'apps/adp.mock.variant'
            } as DescriptorVariant,
            annotation: {
                fileName: 'mockAnnotation.xml',
                dataSource: '/sap/opu/odata/source'
            }
        } as AnnotationsData;
        const mockChange = { key: 'value', fileName: 'id_123456789_addAnnotationsToOData' };
        const writeJsonSpy = jest.fn();
        const writeSpy = jest.fn();
        const copySpy = jest.fn();
        const mockFs = {
            write: writeSpy,
            copy: copySpy,
            writeJSON: writeJsonSpy
        };

        it('should write the change file and an annotation file from a template', async () => {
            renderFileMock.mockImplementation((templatePath, data, options, callback) => {
                callback(undefined, 'test');
            });
            await writeAnnotationChange(
                mockProjectPath,
                123456789,
                {
                    ...(mockData.annotation as AnnotationsData['annotation']),
                    namespaces: [
                        {
                            namespace: 'mockNamespace',
                            alias: 'mockAlias'
                        }
                    ],
                    serviceUrl: '/path/to/odata'
                },
                mockChange as unknown as ManifestChangeProperties,
                mockFs as unknown as Editor
            );

            expect(writeJsonSpy).toHaveBeenCalledWith(
                expect.stringContaining('id_123456789_addAnnotationsToOData.change'),
                mockChange
            );

            expect(renderFileMock).toHaveBeenCalledWith(
                expect.stringContaining(path.join('templates', 'changes', 'annotation.xml')),
                expect.objectContaining({
                    namespaces: [
                        {
                            namespace: 'mockNamespace',
                            alias: 'mockAlias'
                        }
                    ],
                    path: '/path/to/odata',
                    schemaNamespace: `local_123456789`
                }),
                expect.objectContaining({}),
                expect.any(Function)
            );

            expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('mockAnnotation.xml'), 'test');
        });

        it('should write the change file and an annotation file from a template using the provided templates path', async () => {
            renderFileMock.mockImplementation((templatePath, data, options, callback) => {
                callback(undefined, 'test');
            });
            await writeAnnotationChange(
                mockProjectPath,
                123456789,
                {
                    ...(mockData.annotation as AnnotationsData['annotation']),
                    namespaces: [
                        {
                            namespace: 'mockNamespace',
                            alias: 'mockAlias'
                        }
                    ],
                    serviceUrl: '/path/to/odata'
                },
                mockChange as unknown as ManifestChangeProperties,
                mockFs as unknown as Editor,
                mockTemplatesPath
            );

            expect(writeJsonSpy).toHaveBeenCalledWith(
                expect.stringContaining('id_123456789_addAnnotationsToOData.change'),
                mockChange
            );

            expect(renderFileMock).toHaveBeenCalledWith(
                expect.stringContaining(path.join(mockTemplatesPath, 'changes', 'annotation.xml')),
                expect.objectContaining({
                    namespaces: [
                        {
                            namespace: 'mockNamespace',
                            alias: 'mockAlias'
                        }
                    ],
                    path: '/path/to/odata',
                    schemaNamespace: `local_123456789`
                }),
                expect.objectContaining({}),
                expect.any(Function)
            );

            expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('mockAnnotation.xml'), 'test');
        });

        it('should copy the annotation file to the correct directory if not creating a new empty file', async () => {
            mockData.annotation.filePath = `mock/path/to/annotation/file.xml`;

            await writeAnnotationChange(
                mockProjectPath,
                123456789,
                mockData.annotation as AnnotationsData['annotation'],
                mockChange as unknown as ManifestChangeProperties,
                mockFs as unknown as Editor
            );

            expect(copySpy).toHaveBeenCalledWith(
                mockData.annotation.filePath,
                expect.stringContaining('mockAnnotation.xml')
            );
        });

        it('should not copy the annotation file if the selected directory is the same as the target', async () => {
            mockData.annotation.filePath = path.join(
                'mock',
                'project',
                'path',
                'webapp',
                'changes',
                'annotations',
                'mockAnnotation.xml'
            );

            await writeAnnotationChange(
                mockProjectPath,
                123456789,
                mockData.annotation as AnnotationsData['annotation'],
                mockChange as unknown as ManifestChangeProperties,
                mockFs as unknown as Editor
            );

            expect(copySpy).not.toHaveBeenCalled();
        });

        it('should throw error when write operation fails', async () => {
            mockData.annotation.filePath = '';

            mockFs.writeJSON.mockImplementationOnce(() => {
                throw new Error('Failed to write JSON');
            });

            await expect(() =>
                writeAnnotationChange(
                    mockProjectPath,
                    123456789,
                    mockData.annotation as AnnotationsData['annotation'],
                    mockChange as unknown as ManifestChangeProperties,
                    mockFs as unknown as Editor
                )
            ).rejects.toThrow(
                `Could not write annotation changes. Reason: Could not write change to file: ${path.join(
                    mockProjectPath,
                    'webapp',
                    'changes',
                    'id_123456789_addAnnotationsToOData.change'
                )}. Reason: Failed to write JSON`
            );
        });

        it('should throw an error if rendering the annotation file fails', async () => {
            renderFileMock.mockImplementation((templatePath, data, options, callback) => {
                callback(new Error('Failed to render annotation file'), '');
            });

            await expect(() =>
                writeAnnotationChange(
                    mockProjectPath,
                    123456789,
                    mockData.annotation as AnnotationsData['annotation'],
                    mockChange as unknown as ManifestChangeProperties,
                    mockFs as unknown as Editor
                )
            ).rejects.toThrow('Failed to render annotation file');
        });
    });

    describe('writeKeyUserChanges', () => {
        const projectPath = 'project';
        const appId = 'sap.ui.demoapps.rta.freestyle';
        const supportId = '@sap-ux/adp-tooling';
        const writeJsonSpy = jest.fn();
        const mockFs = { writeJSON: writeJsonSpy } as unknown as Editor;
        const mockConfig: AdpWriterConfig = {
            app: {
                id: appId,
                layer: 'CUSTOMER_BASE'
            } as App,
            customConfig: {
                adp: {
                    support: {
                        id: supportId,
                        version: '1.0.0'
                    }
                }
            }
        } as AdpWriterConfig;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return early if changes is undefined', async () => {
            await writeKeyUserChanges(projectPath, { ...mockConfig, keyUserChanges: [] }, mockFs);
            await writeKeyUserChanges(projectPath, { ...mockConfig, keyUserChanges: undefined }, mockFs);
            expect(writeJsonSpy).not.toHaveBeenCalled();
        });

        it('should skip entries without content', async () => {
            const changes: KeyUserChangeContent[] = [
                { content: { fileName: 'test.change' } },
                {} as KeyUserChangeContent,
                { content: { fileName: 'test2.change' } }
            ];

            await writeKeyUserChanges(projectPath, { ...mockConfig, keyUserChanges: changes }, mockFs);

            expect(writeJsonSpy).toHaveBeenCalledTimes(2);
        });

        it('should skip entries without fileName', async () => {
            const changes: KeyUserChangeContent[] = [
                { content: { fileName: 'test.change' } },
                { content: { changeType: 'page' } },
                { content: { fileName: 'test2.change' } }
            ];

            await writeKeyUserChanges(projectPath, { ...mockConfig, keyUserChanges: changes }, mockFs);

            expect(writeJsonSpy).toHaveBeenCalledTimes(2);
        });

        it('should add texts to change if not already present', async () => {
            const texts = { variantName: { value: 'Test Variant', type: 'XFLD' } };
            const changes: KeyUserChangeContent[] = [
                {
                    content: {
                        fileName: 'id_123_page.change',
                        changeType: 'page'
                    },
                    texts
                }
            ];

            await writeKeyUserChanges(projectPath, { ...mockConfig, keyUserChanges: changes }, mockFs);

            expect(writeJsonSpy).toHaveBeenCalledWith(
                expect.stringContaining('id_123_page.change'),
                expect.objectContaining({
                    fileName: 'id_123_page.change',
                    changeType: 'page',
                    texts
                })
            );
        });

        it('should write multiple changes', async () => {
            const changes: KeyUserChangeContent[] = [
                {
                    content: {
                        fileName: 'id_123_page.change',
                        changeType: 'page'
                    }
                },
                {
                    content: {
                        fileName: 'id_456_variant.change',
                        changeType: 'variant'
                    }
                }
            ];

            await writeKeyUserChanges(projectPath, { ...mockConfig, keyUserChanges: changes }, mockFs);

            expect(writeJsonSpy).toHaveBeenCalledTimes(2);
        });

        it('should transform key user changes for ADP format', async () => {
            const changes: KeyUserChangeContent[] = [
                {
                    content: {
                        fileName: 'id_123_rename.change',
                        changeType: 'rename',
                        reference: 'sap.ui.demoapps.rta.freestyle',
                        layer: 'CUSTOMER',
                        namespace: 'apps/sap.ui.demoapps.rta.freestyle/changes/',
                        projectId: 'sap.ui.demoapps.rta.freestyle',
                        adaptationId: 'DEFAULT',
                        version: '1.0',
                        context: 'someContext',
                        versionId: 'someVersionId',
                        support: {
                            generator: 'sap.ui.rta.command'
                        }
                    }
                }
            ];

            await writeKeyUserChanges(projectPath, { ...mockConfig, keyUserChanges: changes }, mockFs);

            expect(writeJsonSpy).toHaveBeenCalledWith(
                expect.stringContaining('id_123_rename.change'),
                expect.objectContaining({
                    fileName: 'id_123_rename.change',
                    reference: appId,
                    layer: 'CUSTOMER_BASE',
                    namespace: `apps/${appId}/changes/`,
                    projectId: appId,
                    support: expect.objectContaining({
                        generator: `${supportId} (converted from key user changes)`
                    })
                })
            );
            const writtenChange = writeJsonSpy.mock.calls[0][1];
            expect(writtenChange).not.toHaveProperty('adaptationId');
            expect(writtenChange).not.toHaveProperty('version');
            expect(writtenChange).not.toHaveProperty('context');
            expect(writtenChange).not.toHaveProperty('versionId');
        });

        it('should always set support.generator when support.id is provided', async () => {
            const changesWithGenerator: KeyUserChangeContent[] = [
                {
                    content: {
                        fileName: 'id_123_with_generator.change',
                        changeType: 'rename',
                        support: {
                            generator: 'sap.ui.rta.command'
                        }
                    }
                }
            ];

            const changesWithoutGenerator: KeyUserChangeContent[] = [
                {
                    content: {
                        fileName: 'id_456_without_generator.change',
                        changeType: 'rename'
                    }
                }
            ];

            await writeKeyUserChanges(projectPath, { ...mockConfig, keyUserChanges: changesWithGenerator }, mockFs);
            await writeKeyUserChanges(projectPath, { ...mockConfig, keyUserChanges: changesWithoutGenerator }, mockFs);

            expect(writeJsonSpy).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('id_123_with_generator.change'),
                expect.objectContaining({
                    support: expect.objectContaining({
                        generator: `${supportId} (converted from key user changes)`
                    })
                })
            );

            const secondCallChange = writeJsonSpy.mock.calls[1][1];
            expect(secondCallChange.support).toBeDefined();
            expect(secondCallChange.support.generator).toBe(`${supportId} (converted from key user changes)`);
        });
    });

    describe('transformKeyUserChangeForAdp', () => {
        const appId = 'sap.ui.demoapps.rta.freestyle';
        const support = {
            id: '@sap-ux/adp-tooling',
            version: '1.0.0'
        } as ToolsSupport;

        it('should update support.generator when generator exists and support.id is provided', () => {
            const change = {
                fileName: 'test.change',
                changeType: 'rename',
                support: {
                    generator: 'sap.ui.rta.command'
                }
            };

            const result = transformKeyUserChangeForAdp(change, appId, support, FlexLayer.CUSTOMER_BASE);

            expect(result.support).toBeDefined();
            expect((result.support as Record<string, unknown>)?.generator).toBe(
                `${support.id} (converted from key user changes)`
            );
        });

        it('should add support.generator when generator does not exist but support.id is provided', () => {
            const change = {
                fileName: 'test.change',
                changeType: 'rename',
                support: {}
            };

            const result = transformKeyUserChangeForAdp(change, appId, support, FlexLayer.CUSTOMER_BASE);

            expect(result.support).toBeDefined();
            expect((result.support as Record<string, unknown>)?.generator).toBe(
                `${support.id} (converted from key user changes)`
            );
        });

        it('should create support object and add generator if support.id is provided', () => {
            const change = {
                fileName: 'test.change',
                changeType: 'rename'
            };

            const result = transformKeyUserChangeForAdp(change, appId, support, FlexLayer.CUSTOMER_BASE);

            expect(result.support).toBeDefined();
            expect((result.support as Record<string, unknown>)?.generator).toBe(
                `${support.id} (converted from key user changes)`
            );
        });
    });
});
