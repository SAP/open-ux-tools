import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { getAppProgrammingLanguage } from '../../src/project';

describe('Test getAppProgrammingLanguage()', () => {
    const sampleRoot = join(__dirname, '../test-data/project/info');
    test('Detect TypeScript app, no mem-fs', async () => {
        expect(await getAppProgrammingLanguage(join(sampleRoot, 'typescript-app'))).toBe('TypeScript');
    });

    test('Detect JavaScript app, no mem-fs', async () => {
        expect(await getAppProgrammingLanguage(join(sampleRoot, 'javascript-app'))).toBe('JavaScript');
    });

    test('Detect app language, .ts file deleted in mem-fs, no app language', async () => {
        const fs = create(createStorage());
        fs.delete(join(sampleRoot, 'typescript-app/webapp/index.ts'));
        expect(await getAppProgrammingLanguage(join(sampleRoot, 'typescript-app'), fs)).toBe('');
    });

    test('Detect app language, no webapp folder', async () => {
        const fs = create(createStorage());
        fs.delete(join(sampleRoot, 'javascript-app/webapp'));
        expect(await getAppProgrammingLanguage(join(sampleRoot, 'javascript-app'), fs)).toBe('');
    });
});
