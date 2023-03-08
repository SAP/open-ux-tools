import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { getAppLanguage } from '../../src/project';

describe('Test getAppLanguage()', () => {
    const sampleRoot = join(__dirname, '../test-data/project/info');
    test('Detect TypeScript app, no mem-fs', async () => {
        expect(await getAppLanguage(join(sampleRoot, 'typescript-app'))).toBe('TypeScript');
    });

    test('Detect JavaScript app, no mem-fs', async () => {
        expect(await getAppLanguage(join(sampleRoot, 'javascript-app'))).toBe('JavaScript');
    });

    test('Detect app language, .ts file deleted in mem-fs', async () => {
        const fs = create(createStorage());
        fs.delete(join(sampleRoot, 'typescript-app/webapp/index.ts'));
        expect(await getAppLanguage(join(sampleRoot, 'typescript-app'), fs)).toBe('JavaScript');
    });
});
