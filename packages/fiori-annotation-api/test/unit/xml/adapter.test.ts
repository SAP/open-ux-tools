import { jest } from '@jest/globals';
import type * as parserType from '@xml-tools/parser';
import type * as astType from '@xml-tools/ast';
import type * as converterType from '@sap-ux/xml-odata-annotation-converter';
import type { AnnotationFile } from '@sap-ux/odata-annotation-core-types';
import { pathToFileURL } from 'node:url';
import { VocabularyService } from '@sap-ux/odata-vocabularies';

const mockParse = jest.fn<typeof parserType.parse>();
const realParser = await import('@xml-tools/parser');
jest.unstable_mockModule('@xml-tools/parser', () => ({
    ...realParser,
    parse: mockParse
}));

const mockBuildAst = jest.fn<typeof astType.buildAst>();
const realAst = await import('@xml-tools/ast');
jest.unstable_mockModule('@xml-tools/ast', () => ({
    ...realAst,
    buildAst: mockBuildAst
}));

const mockConvertDocument = jest.fn<typeof converterType.convertDocument>();
const mockConvertMetadataDocument = jest.fn<typeof converterType.convertMetadataDocument>();
const realConverter = await import('@sap-ux/xml-odata-annotation-converter');
jest.unstable_mockModule('@sap-ux/xml-odata-annotation-converter', () => ({
    ...realConverter,
    convertDocument: mockConvertDocument,
    convertMetadataDocument: mockConvertMetadataDocument
}));

const { XMLAnnotationServiceAdapter } = await import('../../../src/xml');

describe('XML Adapter', () => {
    const vocabularyService = new VocabularyService(false);
    describe('getDocuments', () => {
        test('no documents', () => {
            const adapter = new XMLAnnotationServiceAdapter(
                {
                    type: 'local-edmx',
                    odataVersion: '4.0',
                    metadataFile: { uri: 'metadata.xml', isReadOnly: true },
                    annotationFiles: []
                },
                vocabularyService,
                { apps: {}, projectType: 'EDMXBackend', root: '' },
                ''
            );
            const documents = adapter.getDocuments();
            expect(Object.keys(documents)).toHaveLength(0);
        });

        test('has documents', () => {
            const adapter = new XMLAnnotationServiceAdapter(
                {
                    type: 'local-edmx',
                    odataVersion: '4.0',
                    metadataFile: { uri: 'metadata.xml', isReadOnly: true },
                    annotationFiles: []
                },
                vocabularyService,
                { apps: {}, projectType: 'EDMXBackend', root: '' },
                ''
            );
            const file = { uri: 'file1.cds', type: 'annotation-file' };
            adapter['documents'].set('file1.cds', { annotationFile: file } as any);

            const documents = adapter.getDocuments();
            expect(documents).toStrictEqual({
                'file1.cds': file
            });
        });

        test.each([true, false])('sync external services data', (isFileExists) => {
            // Arrange
            const adapter = new XMLAnnotationServiceAdapter(
                {
                    type: 'local-edmx',
                    odataVersion: '4.0',
                    metadataFile: { uri: 'metadata.xml', isReadOnly: true },
                    annotationFiles: []
                },
                vocabularyService,
                { apps: {}, projectType: 'EDMXBackend', root: '' },
                ''
            );

            const dummyCst = { name: 'dummyCst', children: {} };
            const dummyTokenVector = [
                {
                    startOffset: 0,
                    endOffset: 10,
                    image: '<dummy></dummy>',
                    tokenType: { name: 'dummyToken' },
                    tokenTypeIdx: 0
                }
            ];
            mockParse.mockReturnValue({
                cst: dummyCst,
                tokenVector: dummyTokenVector,
                lexErrors: [],
                parseErrors: []
            } as any);

            const dummyAst = { type: 'dummyAst' } as any;
            mockBuildAst.mockReturnValue(dummyAst);
            const dummyAnnotationFile: AnnotationFile = {
                uri: 'dummyUri',
                references: [],
                targets: [],
                type: 'annotation-file'
            };
            mockConvertDocument.mockReturnValue(dummyAnnotationFile);

            mockConvertMetadataDocument.mockReturnValue([{ name: 'dummyMetadata' } as any]);

            const importMock = jest
                .spyOn(adapter.metadataService, 'importServiceMetadata')
                .mockImplementation(() => {});

            // Act
            adapter.syncExternalService('dummyUri', isFileExists ? 'dummyData' : '', 'localFilePath');
            const services = adapter.getExternalServices();

            // Assert
            try {
                if (isFileExists) {
                    expect(mockParse).toHaveBeenCalledWith('dummyData');
                    expect(mockBuildAst).toHaveBeenCalledWith(dummyCst, dummyTokenVector);
                    expect(mockConvertDocument).toHaveBeenCalledWith('dummyUri', dummyAst);

                    expect(adapter['documents'].get('dummyUri')).toEqual({
                        ast: {
                            type: 'dummyAst'
                        },
                        comments: [],
                        uri: 'dummyUri',
                        usedNamespaces: new Set(),
                        annotationFile: dummyAnnotationFile
                    });
                    expect(mockConvertMetadataDocument).toHaveBeenCalledWith('dummyUri', dummyAst);
                } else {
                    expect(mockParse).not.toHaveBeenCalled();
                    expect(mockBuildAst).not.toHaveBeenCalled();
                    expect(mockConvertMetadataDocument).toHaveBeenCalledWith('dummyUri', {
                        'position': {
                            'endColumn': 0,
                            'endLine': 0,
                            'endOffset': 0,
                            'startColumn': 0,
                            'startLine': 0,
                            'startOffset': 0
                        },
                        'rootElement': null,
                        'type': 'XMLDocument'
                    });
                }
                expect(importMock).toHaveBeenCalledWith([{ name: 'dummyMetadata' }], 'dummyUri', 'dummyUri');
                expect(services[0].compiledService).toEqual({
                    annotationFiles: [dummyAnnotationFile],
                    metadata: [{ name: 'dummyMetadata' }],
                    odataVersion: '4.0'
                });
                expect(services[0].uri).toBe('dummyUri');
                expect(services[0].localFileUri).toBe(pathToFileURL('localFilePath').toString());
            } finally {
                mockParse.mockReset();
                mockBuildAst.mockReset();
                mockConvertDocument.mockReset();
                mockConvertMetadataDocument.mockReset();
                importMock.mockRestore();
            }
        });
    });
});
