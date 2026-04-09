import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAppDescriptorVariant } from '../../../src/base/archive';
import AdmZip from 'adm-zip';
import { readFileSync } from 'node:fs';

const __testdirname = dirname(fileURLToPath(import.meta.url));

describe('base/archive', () => {
    const fixture = join(__testdirname, '../../fixtures/adp/webapp');

    test('getAppDescriptorVariant', () => {
        const zip = new AdmZip();
        zip.addLocalFolder(fixture);
        const actual = getAppDescriptorVariant(zip.toBuffer());
        const expected = JSON.parse(readFileSync(join(fixture, 'manifest.appdescr_variant'), 'utf-8'));
        expect(actual).toEqual(expected);
    });
});
