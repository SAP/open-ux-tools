import { VocabularyService } from '@sap-ux/odata-vocabularies';

export * from './service';
export { CDSAnnotationServiceAdapter } from './adapter';

export const CDS_VOCABULARY_SERVICE = new VocabularyService(true);