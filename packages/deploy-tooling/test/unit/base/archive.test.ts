import { join } from 'path';
import { getFileNames, isAdaptationProject } from '../../../src/base/archive';
import { existsSync } from 'fs';
import AdmZip from 'adm-zip';

describe('base/archive', () => {
    const testPath = {
        adp: join(__dirname, '../../fixtures/adp/webapp')
    };

    test('getFileNames', () => {
        const names = getFileNames(testPath.adp);
        expect(names).toHaveLength(6);
        for (const name of names) {
            expect(existsSync(name)).toBe(true);
        }
    });

    test('isAdaptationProject', () => {
        const zip = new AdmZip();
        zip.addLocalFolder(testPath.adp);
        expect(isAdaptationProject(zip.toBuffer())).toBe(true);
    });
});
