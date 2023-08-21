import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { getAppProgrammingLanguage, getFioriArtifactType } from '../../src';

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

describe('Test getFioriArtifactType()', () => {
    test('Get type for adaptation', async () => {
        expect(
            await getFioriArtifactType(
                join(__dirname, '../test-data/project/find-all-apps/adaptations/valid-adaptation')
            )
        ).toBe('adaptation');
    });

    test('Get type for application', async () => {
        expect(
            await getFioriArtifactType(join(__dirname, '../test-data/project/find-all-apps/single_apps/fiori_elements'))
        ).toBe('application');
    });

    test('Get type for extension', async () => {
        expect(
            await getFioriArtifactType(join(__dirname, '../test-data/project/find-all-apps/extensions/valid-extension'))
        ).toBe('extension');
    });

    test('Get type for library', async () => {
        expect(
            await getFioriArtifactType(join(__dirname, '../test-data/project/find-all-apps/libraries/valid-library'))
        ).toBe('library');
    });

    test('No Fiori Artifact type, but sub dirs have. Should throw error', async () => {
        try {
            await getFioriArtifactType(join(__dirname, '../test-data/project/find-all-apps/adaptations'));
            fail(
                'Call to getFioriArtifactType() should have thrown error because the passed dir is not a root dir, but did not'
            );
        } catch (error) {
            expect(error.toString()).toContain('project');
        }
    });
});
