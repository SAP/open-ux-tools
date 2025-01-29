import { readFile } from 'fs/promises';
import { showCollabDraftWarning } from '../../../../src/prompts/datasources/service-helpers/service-helpers';
import LoggerHelper from '../../../../src/prompts/logger-helper';
import { join } from 'path';
import { initI18nOdataServiceInquirer, t } from '../../../../src/i18n';

describe('Test service-helpers function `showCollabDraftWarning`', () => {
    let metadataV4WithDraftAndShareAnnot: string;
    let metadataNoDraftEntities: string;
    let metadataV4WithDraftEntities: string;

    beforeAll(async () => {
        // Ensure i18n texts are loaded so we can test localised strings
        await initI18nOdataServiceInquirer();
        // Read the test metadata files
        metadataV4WithDraftAndShareAnnot = await readFile(
            join(__dirname, '../test-data/metadataV4WithDraftAnnotationAndShareAction.xml'),
            'utf8'
        );
        metadataNoDraftEntities = await readFile(
            join(__dirname, '../test-data/metadataV4WithAggregateTransforms.xml'),
            'utf8'
        );
        metadataV4WithDraftEntities = await readFile(
            join(__dirname, '../test-data/metadataV4WithDraftEntities.xml'),
            'utf8'
        );
    });

    it('should show collaborative draft warning if draft entities but not collobrative (ShareAction property not present)', () => {
        const result = showCollabDraftWarning(metadataV4WithDraftEntities);
        expect(result).toEqual(true);
    });

    it('should not show show collaborative draft warning if draft is not enabled', () => {
        const result = showCollabDraftWarning(metadataNoDraftEntities);
        expect(result).toEqual(false);
    });

    test('should not show collaborative draft warning if draft is enabled and `ShareAction` is defined', async () => {
        const result = showCollabDraftWarning(metadataV4WithDraftAndShareAnnot);
        expect(result).toEqual(false);
    });

    it('should log and return false if edmx is an unparseable', () => {
        const errorLogSpy = jest.spyOn(LoggerHelper.logger, 'error');
        const result = showCollabDraftWarning(
            '<?xml version="1.0" encoding="utf-8"?>' +
                '<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"></edmx:Edmx>' +
                '<edmx:DataServices></edmx:DataServices>'
        );
        expect(result).toEqual(false);
        expect(errorLogSpy).toHaveBeenCalledWith(expect.stringMatching(t('errors.unparseableMetadata')));
    });
});
