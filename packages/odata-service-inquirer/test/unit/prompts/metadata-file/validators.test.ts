import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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
