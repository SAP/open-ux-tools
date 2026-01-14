import { Project } from '@sap-ux/project-access';
import { VocabularyService } from '@sap-ux/odata-vocabularies';

import { XMLAnnotationServiceAdapter } from '../../../src/xml';

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
    });
});
