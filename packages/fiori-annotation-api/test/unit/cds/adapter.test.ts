import { Project } from '@sap-ux/project-access';
import { VocabularyService } from '@sap-ux/odata-vocabularies';

import { CDSAnnotationServiceAdapter } from '../../../src/cds';

describe('CDS Adapter', () => {
    const vocabularyService = new VocabularyService(true);
    describe('getDocuments', () => {
        test('no documents', () => {
            const adapter = new CDSAnnotationServiceAdapter(
                {
                    serviceFiles: [],
                    serviceName: 'TestService',
                    type: 'cap-cds'
                },
                {} as Project,
                vocabularyService,
                '',
                false,
                false
            );
            const documents = adapter.getDocuments();
            expect(Object.keys(documents)).toHaveLength(0);
        });

        test('has documents', () => {
            const adapter = new CDSAnnotationServiceAdapter(
                {
                    serviceFiles: [],
                    serviceName: 'TestService',
                    type: 'cap-cds'
                },
                {} as Project,
                vocabularyService,
                '',
                false,
                false
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
