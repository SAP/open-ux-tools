import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getMtaPath } from '../../src';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

describe('Test getMtaPath()', () => {
    test('Test managed MTA project', async () => {
        const mtaRootPath = join(__dirname, '..', 'test-data', 'project', 'mta', 'managedMta');
        const appPath = join(mtaRootPath, 'app1');
        expect(await getMtaPath(appPath)).toStrictEqual({
            hasRoot: true,
            mtaPath: join(mtaRootPath, 'mta.yaml')
        });
    });

    test('Test standalone MTA project', async () => {
        const appPath = join(__dirname, '..', 'test-data', 'project', 'mta', 'standaloneMtaApp');
        expect(await getMtaPath(appPath)).toStrictEqual({
            hasRoot: false,
            mtaPath: join(appPath, 'mta.yaml')
        });
    });

    test('Regular Non-MTA project', async () => {
        const appPath = join(__dirname, '..', 'test-data', 'project', 'mta', 'nonMtaApp');
        expect(await getMtaPath(appPath)).toBe(undefined);
    });
});
