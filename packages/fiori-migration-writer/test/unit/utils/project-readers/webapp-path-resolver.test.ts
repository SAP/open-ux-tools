import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { createMemFsEditor } from '../../../../src/utils/fs-adapter.js';
import { MigrationTypes } from '../../../../src/utils/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { getWebappPath } = await import('../../../../src/utils/project-readers/webapp-path-resolver.js');

describe('webapp-path-resolver - getWebappPath', () => {
    const testOutputDir = join(__dirname, '../../../../test-output', 'webapp-path-resolver');

    beforeEach(async () => {
        await mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testOutputDir, { recursive: true, force: true });
    });

    test('returns "webapp" when a webapp folder exists', async () => {
        const root = join(testOutputDir, 'with-webapp');
        await mkdir(join(root, 'webapp'), { recursive: true });
        await writeFile(join(root, 'webapp', 'manifest.json'), '{}');
        expect(await getWebappPath(createMemFsEditor(), root)).toBe('webapp');
    });

    test('returns "" when manifest.json is at the project root', async () => {
        const root = join(testOutputDir, 'root-manifest');
        await mkdir(root, { recursive: true });
        await writeFile(join(root, 'manifest.json'), '{}');
        expect(await getWebappPath(createMemFsEditor(), root)).toBe('');
    });

    test('returns the legacy Maven path when src/main/webapp has a manifest', async () => {
        const root = join(testOutputDir, 'legacy-maven');
        const mavenWebapp = join(root, 'src', 'main', 'webapp');
        await mkdir(mavenWebapp, { recursive: true });
        await writeFile(join(mavenWebapp, 'manifest.json'), '{}');
        expect(await getWebappPath(createMemFsEditor(), root)).toBe(join('src', 'main', 'webapp'));
    });

    test('resolves the library path from libPath', async () => {
        const root = join(testOutputDir, 'library');
        const libDir = join(root, 'src', 'mylib');
        await mkdir(libDir, { recursive: true });
        // No webapp folder, no root manifest - forces the library-specific branch.
        // resolveForLibrary returns libPath with the project root prefix stripped.
        const result = await getWebappPath(createMemFsEditor(), root, MigrationTypes.library, libDir);
        expect(result).toBe(libDir.slice(root.length));
    });

    test('resolves webapp path from .project.json hcpdeploy entryPath', async () => {
        const root = join(testOutputDir, 'project-json');
        const customWebapp = join(root, 'src', 'custom', 'webapp');
        await mkdir(customWebapp, { recursive: true });
        await writeFile(join(customWebapp, 'manifest.json'), '{}');
        await writeFile(
            join(root, '.project.json'),
            JSON.stringify({ hcpdeploy: { entryPath: join('src', 'custom', 'webapp') } })
        );
        expect(await getWebappPath(createMemFsEditor(), root)).toBe(join('src', 'custom', 'webapp'));
    });

    test('resolves webapp path from .che/project.json sap.watt.common.setting hcpdeploy', async () => {
        const root = join(testOutputDir, 'che-project-json');
        const customWebapp = join(root, 'src', 'che', 'webapp');
        await mkdir(join(root, '.che'), { recursive: true });
        await mkdir(customWebapp, { recursive: true });
        await writeFile(join(customWebapp, 'manifest.json'), '{}');
        const settings = JSON.stringify({ hcpdeploy: { entryPath: join('src', 'che', 'webapp') } });
        await writeFile(
            join(root, '.che', 'project.json'),
            JSON.stringify({ attributes: { 'sap.watt.common.setting': [settings] } })
        );
        expect(await getWebappPath(createMemFsEditor(), root)).toBe(join('src', 'che', 'webapp'));
    });

    test('resolves webapp path from ui5.yaml configuration', async () => {
        const root = join(testOutputDir, 'ui5-yaml');
        await mkdir(root, { recursive: true });
        await writeFile(join(root, 'ui5.yaml'), 'resources:\n  configuration:\n    paths:\n      webapp: my-webapp\n');
        expect(await getWebappPath(createMemFsEditor(), root)).toBe('my-webapp');
    });

    test('falls back to "webapp" when no source resolves a path', async () => {
        const root = join(testOutputDir, 'empty');
        await mkdir(root, { recursive: true });
        expect(await getWebappPath(createMemFsEditor(), root)).toBe('webapp');
    });

    test('ignores an invalid .project.json and falls through', async () => {
        const root = join(testOutputDir, 'invalid-project-json');
        await mkdir(root, { recursive: true });
        await writeFile(join(root, '.project.json'), '{ not json');
        expect(await getWebappPath(createMemFsEditor(), root)).toBe('webapp');
    });
});
