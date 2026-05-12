import { OdataVersion } from '@sap-ux/odata-service-writer';
import { validateODataVersion } from '../../../src/prompts/validators';
import { initI18nOdataServiceInquirer } from '../../../src/i18n';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const validMetadataV2 =
    '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx">' +
    '<edmx:DataServices m:DataServiceVersion="2.0"></edmx:DataServices></edmx:Edmx>';
const validMetadataV4 =
    '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="4.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx">' +
    '<edmx:DataServices m:DataServiceVersion="4.0"></edmx:DataServices></edmx:Edmx>';
describe('prompt validators', () => {
    let validMetadataV401: string;

    beforeAll(async () => {
        await initI18nOdataServiceInquirer();
        validMetadataV401 = await readFile(join(__dirname, '../utils/fixtures/metadata_v401.xml'), 'utf8');
    });

    describe('validateODataVersion', () => {
        it('should validate metadata odata version with provided odata version', () => {
            expect(validateODataVersion(validMetadataV2, OdataVersion.v2)).toMatchObject({ version: OdataVersion.v2 });
            expect(validateODataVersion(validMetadataV2, OdataVersion.v4)).toMatchObject({
                validationMsg:
                    'The template you have chosen supports V4 OData services only. The provided version is V2.'
            });
            expect(validateODataVersion(validMetadataV4, OdataVersion.v4)).toMatchObject({ version: OdataVersion.v4 });
            expect(validateODataVersion(validMetadataV4, OdataVersion.v2)).toMatchObject({
                validationMsg:
                    'The template you have chosen supports V2 OData services only. The provided version is V4.'
            });
        });

        it('should return metadata odata version', () => {
            expect(validateODataVersion(validMetadataV2)).toMatchObject({ version: OdataVersion.v2 });
            expect(validateODataVersion(validMetadataV4)).toMatchObject({ version: OdataVersion.v4 });
        });

        it('should accept v401 metadata when no required version is specified', () => {
            expect(validateODataVersion(validMetadataV401)).toMatchObject({ version: OdataVersion.v401 });
        });

        it('should accept v401 metadata when required version is v401', () => {
            expect(validateODataVersion(validMetadataV401, OdataVersion.v401)).toMatchObject({
                version: OdataVersion.v401
            });
        });

        it('should accept v401 metadata when required version is v4 (backwards compatible)', () => {
            expect(validateODataVersion(validMetadataV401, OdataVersion.v4)).toMatchObject({
                version: OdataVersion.v401
            });
        });

        it('should reject v401 metadata when required version is v2', () => {
            expect(validateODataVersion(validMetadataV401, OdataVersion.v2)).toMatchObject({
                validationMsg:
                    'The template you have chosen supports V2 OData services only. The provided version is V4.01.'
            });
        });
    });
});
