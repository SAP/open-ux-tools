import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

import { createMemFsEditor } from '../../../../src/utils/fs-adapter.js';
import { URI } from 'vscode-uri';
const { findNestedReuseLibManifest, isSamePath, getReuseLibModuleName, checkIfReuseLib } =
    await import('../../../../src/utils/project-readers/reuse-lib-utils.js');
const { MigrationTypes } = await import('../../../../src/utils/constants.js');

describe('reuse-lib-utils - isSamePath', () => {
    test('treats identical paths as the same location', () => {
        const p = join('a', 'b', 'c');
        expect(isSamePath(p, p)).toBe(true);
    });

    test('ignores a trailing separator', () => {
        const base = join(__dirname, 'a', 'b');
        expect(isSamePath(base, base + sep)).toBe(true);
    });

    test('treats genuinely different paths as not the same', () => {
        expect(isSamePath(join(__dirname, 'a', 'b'), join(__dirname, 'a', 'c'))).toBe(false);
    });

    // Regression (Windows-only): getReuseLibs derives paths from URI.file(root).fsPath, which
    // lowercases the Windows drive letter, so a plain === comparison failed on Windows even for
    // the same directory — this is what broke `should migrate reuse_library_project` there.
    // On POSIX there is no drive letter and this case cannot occur, so the assertion is guarded.
    (process.platform === 'win32' ? test : test.skip)(
        'matches paths that differ only by Windows drive-letter casing',
        () => {
            expect(isSamePath('C:\\projects\\reuse-lib', 'c:\\projects\\reuse-lib')).toBe(true);
        }
    );
});

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
        const result = await findNestedReuseLibManifest(createMemFsEditor(), projectRoot);

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
        expect(await findNestedReuseLibManifest(createMemFsEditor(), projectRoot)).toBeUndefined();
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
        expect(await findNestedReuseLibManifest(createMemFsEditor(), projectRoot)).toBeUndefined();
    });
});

describe('reuse-lib-utils - checkIfReuseLib', () => {
    test('returns true when migration type is library', async () => {
        expect(await checkIfReuseLib('/root', MigrationTypes.library)).toBe(true);
    });

    test('returns false when migration type is a non-library type', async () => {
        expect(await checkIfReuseLib('/root', MigrationTypes.project)).toBe(false);
    });

    test('derives library status from a provided manifest', async () => {
        expect(await checkIfReuseLib('/root', undefined, { 'sap.app': { type: 'library' } } as any)).toBe(true);
        expect(await checkIfReuseLib('/root', undefined, { 'sap.app': { type: 'application' } } as any)).toBe(false);
    });

    test('returns false when no manifest can be read from disk', async () => {
        expect(await checkIfReuseLib('/does/not/exist', undefined, undefined, createMemFsEditor())).toBe(false);
    });
});

describe('reuse-lib-utils - getReuseLibModuleName', () => {
    const testOutputDir = join(__dirname, '../../../../test-output', 'reuse-lib-module-name');

    beforeEach(async () => {
        await mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testOutputDir, { recursive: true, force: true });
    });

    test('uses the manifest sap.app id when a manifest is supplied', async () => {
        const name = await getReuseLibModuleName(
            join(testOutputDir, 'lib'),
            undefined,
            { 'sap.app': { id: 'sap.my.lib' } } as any,
            createMemFsEditor()
        );
        expect(name).toBe('sap.my.lib');
    });

    test('resolves the module name from workspace folders', async () => {
        const projectRoot = join(testOutputDir, 'wslib');
        const libDir = join(projectRoot, 'src', 'sap', 'company', 'lib', 'wslib');
        await mkdir(libDir, { recursive: true });
        await writeFile(join(projectRoot, 'package.json'), JSON.stringify({ name: 'wslib' }));
        await writeFile(
            join(libDir, 'manifest.json'),
            JSON.stringify({ 'sap.app': { id: 'sap.company.lib.wslib', type: 'library' } })
        );

        const workspaceFolders = [{ uri: URI.file(projectRoot), name: projectRoot, index: 0 }];
        const name = await getReuseLibModuleName(projectRoot, workspaceFolders, undefined, createMemFsEditor());
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
    });

    test('falls back to the project folder basename when nothing else resolves', async () => {
        const projectRoot = join(testOutputDir, 'bare-lib');
        await mkdir(projectRoot, { recursive: true });
        const name = await getReuseLibModuleName(projectRoot, undefined, undefined, createMemFsEditor());
        expect(name).toBe('bare-lib');
    });
});
