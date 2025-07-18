import path from 'path';
import { validateMetadataFile } from '../../../../src/prompts/datasources/metadata-file/validators';

describe('metadata valiadtors', () => {
    test('validateMetadataFile', async () => {
        const testXmlPath = path.join(__dirname, 'fixtures/validatorTest.xml');
        expect(await validateMetadataFile(testXmlPath)).toMatchObject({
            version: '2',
            metadata: expect.stringContaining('Terms &amp; Conditions') //Ensure that the & is replaced with &amp;
        });
    });
});
