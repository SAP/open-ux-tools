import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { findNestedReuseLibManifest } = await import('../../../../src/utils/project-readers/reuse-lib-utils.js');

describe('reuse-lib-utils - findNestedReuseLibManifest', () => {
    const testOutputDir = join(__dirname, '../../../../test-output', 'reuse-lib-utils');

    beforeEach(async () => {
        await mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testOutputDir, { recursive: true, force: true });
    });

    test('finds a library manifest nested in the namespace source tree', async () => {
        // given a reuse library whose manifest lives under src/<namespace>/
        const projectRoot = join(testOutputDir, 'reuse-lib');
        const libDir = join(projectRoot, 'src', 'sap', 'company', 'lib', 'mylib');
        await mkdir(libDir, { recursive: true });
        await writeFile(join(projectRoot, 'package.json'), JSON.stringify({ name: 'reuse-lib' }));
        await writeFile(
            join(libDir, 'manifest.json'),
            JSON.stringify({ 'sap.app': { id: 'sap.company.lib.mylib', type: 'library' } })
        );

        // when
        const result = await findNestedReuseLibManifest(projectRoot);

        // then
        expect(result).toBeDefined();
        expect(result?.manifest['sap.app']?.id).toBe('sap.company.lib.mylib');
        expect(relative(projectRoot, dirname(result?.manifestPath ?? ''))).toBe(
            join('src', 'sap', 'company', 'lib', 'mylib')
        );
    });

    test('returns undefined when no library manifest exists', async () => {
        // given a project with only an application manifest
        const projectRoot = join(testOutputDir, 'app');
        const webappDir = join(projectRoot, 'webapp');
        await mkdir(webappDir, { recursive: true });
        await writeFile(join(projectRoot, 'package.json'), JSON.stringify({ name: 'app' }));
        await writeFile(
            join(webappDir, 'manifest.json'),
            JSON.stringify({ 'sap.app': { id: 'my.app', type: 'application' } })
        );

        // when / then
        expect(await findNestedReuseLibManifest(projectRoot)).toBeUndefined();
    });

    test('returns undefined when the library root does not match the project root', async () => {
        // given a nested library that resolves to its own project root (own package.json)
        const projectRoot = join(testOutputDir, 'outer');
        const innerRoot = join(projectRoot, 'inner');
        const libDir = join(innerRoot, 'src', 'sap', 'company', 'lib', 'mylib');
        await mkdir(libDir, { recursive: true });
        await writeFile(join(innerRoot, 'package.json'), JSON.stringify({ name: 'inner' }));
        await writeFile(
            join(libDir, 'manifest.json'),
            JSON.stringify({ 'sap.app': { id: 'sap.company.lib.mylib', type: 'library' } })
        );

        // when / then - libRoot resolves to innerRoot, not projectRoot
        expect(await findNestedReuseLibManifest(projectRoot)).toBeUndefined();
    });
});
