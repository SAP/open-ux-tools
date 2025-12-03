import { XMLAnnotationServiceAdapter } from './xml';
import { VocabularyService } from '@sap-ux/odata-vocabularies';
import { ServiceArtifacts, TextFile } from './types';

const vocabularyService = new VocabularyService();

export function getXmlServiceArtifacts(
    odataVersion: '2.0' | '4.0',
    metadataFile: TextFile,
    annotationFiles: TextFile[],
    fileCache: Map<string, string>
): ServiceArtifacts {
    const adapter = new XMLAnnotationServiceAdapter(
        {
            type: 'local-edmx',
            odataVersion: odataVersion,
            metadataFile,
            annotationFiles
        },
        vocabularyService,
        { apps: {}, projectType: 'EDMXBackend', root: '' },
        ''
    );
    adapter.sync(fileCache);
    return adapter.getArtifacts();
}
