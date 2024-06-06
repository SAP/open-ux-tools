import { readFile } from 'fs/promises';
import { join } from 'path';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { parseOdataVersion } from '../../../src/utils';

describe('Utils', () => {
    test('parseOdataVersion', async () => {
        let metadata: string = await readFile(join(__dirname, 'fixtures/metadata_v2.xml'), 'utf8');
        let odataVersion = parseOdataVersion(metadata);
        expect(odataVersion).toBe(OdataVersion.v2);

        metadata = await readFile(join(__dirname, 'fixtures/metadata_v4.xml'), 'utf8');
        odataVersion = parseOdataVersion(metadata);
        expect(odataVersion).toBe(OdataVersion.v4);

        metadata = await readFile(join(__dirname, 'fixtures/invalid_metadata.xml'), 'utf8');
        expect(() => parseOdataVersion(metadata)).toThrowError('The service metadata is invalid.');
    });
});
