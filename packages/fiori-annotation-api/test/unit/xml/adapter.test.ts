import { VocabularyService } from '@sap-ux/odata-vocabularies';

import { XMLAnnotationServiceAdapter } from '../../../src/xml';
import * as parserDep from '@xml-tools/parser';
import * as astDep from '@xml-tools/ast';
import * as converterDep from '@sap-ux/xml-odata-annotation-converter';
import type { AnnotationFile } from '@sap-ux/odata-annotation-core-types';
import { pathToFileURL } from 'url';
import { join } from 'path';

jest.mock('@xml-tools/parser');
jest.mock('@xml-tools/ast');

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

        test('sync external services data', () => {
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
            const parserMock = jest.spyOn(parserDep, 'parse').mockReturnValue({
                cst: dummyCst,
                tokenVector: dummyTokenVector,
                lexErrors: [],
                parseErrors: []
            });

            const dummyAst = { type: 'dummyAst' } as any;
            const buildAstMock = jest.spyOn(astDep, 'buildAst').mockReturnValue(dummyAst);
            const dummyAnnotationFile: AnnotationFile = {
                uri: 'dummyUri',
                references: [],
                targets: [],
                type: 'annotation-file'
            };
            const convertDocumentMock = jest
                .spyOn(converterDep, 'convertDocument')
                .mockReturnValue(dummyAnnotationFile);

            const convertMetadataDocumentMock = jest
                .spyOn(converterDep, 'convertMetadataDocument')
                .mockReturnValue([{ name: 'dummyMetadata' } as any]);

            const importMock = jest
                .spyOn(adapter.metadataService, 'importServiceMetadata')
                .mockImplementation(() => {});

            // Act
            adapter.syncExternalService('dummyUri', 'dummyData', 'localFilePath');
            const services = adapter.getExternalServices();

            // Assert
            try {
                expect(parserMock).toHaveBeenCalledWith('dummyData');
                expect(buildAstMock).toHaveBeenCalledWith(dummyCst, dummyTokenVector);
                expect(convertDocumentMock).toHaveBeenCalledWith('dummyUri', dummyAst);

                expect(adapter['documents'].get('dummyUri')).toEqual({
                    ast: {
                        type: 'dummyAst'
                    },
                    comments: [],
                    uri: 'dummyUri',
                    usedNamespaces: new Set(),
                    annotationFile: dummyAnnotationFile
                });
                expect(convertMetadataDocumentMock).toHaveBeenCalledWith('dummyUri', dummyAst);
                expect(importMock).toHaveBeenCalledWith([{ name: 'dummyMetadata' }], 'dummyUri', 'dummyUri');
                expect(services[0].compiledService).toEqual({
                    annotationFiles: [dummyAnnotationFile],
                    metadata: [{ name: 'dummyMetadata' }],
                    odataVersion: '4.0'
                });
                expect(services[0].uri).toBe('dummyUri');
                expect(services[0].localFileUri).toBe(pathToFileURL('localFilePath').toString());
            } finally {
                parserMock.mockRestore();
                buildAstMock.mockRestore();
                convertDocumentMock.mockRestore();
                convertMetadataDocumentMock.mockRestore();
                importMock.mockRestore();
            }
        });
    });
});
