import { VocabularyService } from '@sap-ux/odata-vocabularies';

export * from './service.js';
export { CDSAnnotationServiceAdapter } from './adapter.js';

export const CDS_VOCABULARY_SERVICE = new VocabularyService(true);
