import { getMetadataFileQuestion } from '../../../../src/prompts/datasources/metadata-file';
import path from 'path';
import { OdataVersion } from '../../../../src/index';
import { t, initI18nOdataServiceInquirer } from '../../../../src/i18n';
import { PromptStateHelper } from '../../../../src/prompts/prompt-helpers';
import isEmpty from 'lodash/isEmpty';

describe('Test metadata file prompts', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    test('getMetadataFileQuestion', async () => {
        const metadataFileQuestion = getMetadataFileQuestion();
        expect(metadataFileQuestion).toMatchInlineSnapshot(`
            {
              "guiOptions": {
                "breadcrumb": true,
                "mandatory": true,
              },
              "guiType": "file-browser",
              "message": "Metadata file path",
              "name": "metadataFilePath",
              "type": "input",
              "validate": [Function],
            }
        `);

        const validate = metadataFileQuestion.validate;

        if (!validate) {
            fail('Validate function not found in metadataFileQuestion');
        }

        expect(await validate('')).toBe(false);
        expect(isEmpty(PromptStateHelper.odataService)).toBe(true);

        const edmxV2Path = path.join(__dirname, 'fixtures/v2.xml');
        expect(await validate(edmxV2Path)).toBe(true);
        expect(PromptStateHelper.odataService).toMatchSnapshot();

        const edmxV4Path = path.join(__dirname, 'fixtures/v4.xml');
        expect(await validate(edmxV4Path)).toBe(true);
        expect(PromptStateHelper.odataService).toMatchSnapshot();

        // Bad file
        const badEdmxPath = path.join(__dirname, 'fixtures/bad-edmx.xml');
        expect(await validate(badEdmxPath)).toEqual(t('prompts.validationMessages.metadataInvalid'));
        expect(isEmpty(PromptStateHelper.odataService)).toBe(true);

        // Bad path
        const noSuchPath = path.join(__dirname, 'fixtures/no-such-file.xml');
        expect(await validate(noSuchPath)).toEqual(t('prompts.validationMessages.metadataFilePathNotValid'));
        expect(isEmpty(PromptStateHelper.odataService)).toBe(true);
    });

    test('getMetadataFileQuestion: odata version validation', async () => {
        // validate v4 only
        let metadataFileQuestion = getMetadataFileQuestion({ requiredOdataVersion: OdataVersion.v4 });
        let validate = metadataFileQuestion.validate;

        if (!validate) {
            fail('Validate function not found in metadataFileQuestion');
        }

        const edmxV2Path = path.join(__dirname, 'fixtures/v2.xml');
        const edmxV4Path = path.join(__dirname, 'fixtures/v4.xml');

        expect(await validate(edmxV2Path)).toBe(
            t('prompts.validationMessages.odataVersionMismatch', {
                providedOdataVersion: OdataVersion.v2,
                requiredOdataVersion: OdataVersion.v4
            })
        );
        expect(await validate(edmxV4Path)).toBe(true);
        expect(PromptStateHelper.odataService).toMatchSnapshot();

        // validate v2 only
        metadataFileQuestion = getMetadataFileQuestion({ requiredOdataVersion: OdataVersion.v2 });
        validate = metadataFileQuestion.validate;

        if (!validate) {
            fail('Validate function not found in metadataFileQuestion');
        }

        expect(await validate(edmxV4Path)).toBe(
            t('prompts.validationMessages.odataVersionMismatch', {
                providedOdataVersion: OdataVersion.v4,
                requiredOdataVersion: OdataVersion.v2
            })
        );
        expect(await validate(edmxV2Path)).toBe(true);
        expect(PromptStateHelper.odataService).toMatchSnapshot();
    });
});
