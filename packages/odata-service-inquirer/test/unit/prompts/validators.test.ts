import { OdataVersion } from '@sap-ux/odata-service-writer';
import { validateODataVersion } from '../../../src/prompts/validators';
import { initI18nOdataServiceInquirer } from '../../../src/i18n';

const validMetadataV2 =
    '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx"></edmx:Edmx>';
const validMetadataV4 =
    '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="4.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx"></edmx:Edmx>';
describe('prompt validators', () => {
    beforeAll(async () => {
        await initI18nOdataServiceInquirer();
    });

    describe('validateODataVersion', () => {
        it('should validate metadata odata version with provided odata version', () => {
            expect(validateODataVersion(validMetadataV2, OdataVersion.v2)).toEqual({ version: OdataVersion.v2 });
            expect(validateODataVersion(validMetadataV2, OdataVersion.v4)).toEqual({
                validationMsg:
                    'The template you have chosen supports V4 OData services only. The provided version is V2.'
            });
            expect(validateODataVersion(validMetadataV4, OdataVersion.v4)).toEqual({ version: OdataVersion.v4 });
            expect(validateODataVersion(validMetadataV4, OdataVersion.v2)).toEqual({
                validationMsg:
                    'The template you have chosen supports V2 OData services only. The provided version is V4.'
            });
        });

        it('should return metadata odata version', () => {
            expect(validateODataVersion(validMetadataV2)).toEqual({ version: OdataVersion.v2 });
            expect(validateODataVersion(validMetadataV4)).toEqual({ version: OdataVersion.v4 });
        });
    });
});
