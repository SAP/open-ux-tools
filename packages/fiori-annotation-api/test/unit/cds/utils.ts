import { pathToFileURL } from 'url';
import { join } from 'path';

import type { CdsCompilerFacade } from '@sap/ux-cds-compiler-facade';
import { createCdsCompilerFacadeForRoot, createMetadataCollector } from '@sap/ux-cds-compiler-facade';
import { VocabularyService } from '@sap-ux/odata-vocabularies';
import { getDocument } from '../../../src/cds/document';
import type { Document } from '../../../src/cds/document';

const vocabularyService = new VocabularyService(true);

export async function getCDSDocument(
    root: string,
    text: string,
    fileName = 'test.cds',
    serviceName = 'S'
): Promise<[CdsCompilerFacade, Document]> {
    const filePath = join(root, fileName);
    const fileUri = pathToFileURL(filePath).toString();
    const fileCache = new Map([[fileUri, text]]);

    const facade = await createCdsCompilerFacadeForRoot(root, [filePath], fileCache);
    const metadataElementMap = facade.getMetadata(serviceName);
    const metadataCollector = createMetadataCollector(metadataElementMap, facade);
    return [
        facade,
        getDocument(serviceName, vocabularyService, facade, fileCache, { uri: fileUri }, metadataCollector)
    ];
}
