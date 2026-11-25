import { join, dirname, relative, isAbsolute } from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { copy, remove } from 'fs-extra';
import { jest } from '@jest/globals';
import {
    defaultMinUi5Version,
    defaultVersion,
    getDefaultUI5Theme,
    getLatestUI5Version,
    getSapSystemUI5Version,
    getUi5Themes,
    latestVersionString,
    minSupportedSpecVersion,
    minUI5VersionForLocalDev,
    minUi5VersionV4Template,
    supportedUi5VersionFallbacks,
    ui5ThemeIds,
    ui5Themes,
    ui5VersionRequestInfo
} from '@sap-ux/ui5-info';
import type { MigrationUIProjectInfo } from '../../src/types.js';
import { DUMMY_BACKEND_URL } from '../test-constants.js';

jest.unstable_mockModule('@sap-ux/ui5-info', () => ({
    defaultMinUi5Version,
    defaultVersion,
    getDefaultUI5Theme,
    getLatestUI5Version,
    getSapSystemUI5Version,
    getUI5Versions: jest.fn().mockResolvedValue([{ version: '1.153.0' }]),
    getUi5Themes,
    latestVersionString,
    minSupportedSpecVersion,
    minUI5VersionForLocalDev,
    minUi5VersionV4Template,
    supportedUi5VersionFallbacks,
    ui5ThemeIds,
    ui5Themes,
    ui5VersionRequestInfo
}));

const { ProjectMigrator, BulkProjectMigrator, initI18n } = await import('../../src/index.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, '../fixtures/input/tool_suite_beta_lrop_v2_project');

describe('Migration with relative project roots', () => {
    let tempDir: string;
    let projectPath: string;
    let relativeProjectPath: string;
    const originalCwd = process.cwd();

    // The backend URL is only written into ui5.yaml by the migration, so it proves the output reached disk
    const migratedYaml = (): boolean => readFileSync(join(projectPath, 'ui5.yaml'), 'utf8').includes(DUMMY_BACKEND_URL);

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(async () => {
        tempDir = join(tmpdir(), `relative-root-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        projectPath = join(tempDir, 'project');
        await copy(FIXTURE, projectPath);
        // Run from a sibling directory so the relative path never crosses drives (relative() returns an absolute path then)
        const workDir = join(tempDir, 'cwd');
        mkdirSync(workDir, { recursive: true });
        process.chdir(workDir);
        relativeProjectPath = relative(process.cwd(), projectPath);
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await remove(tempDir);
    });

    it('migrates and commits to disk when projectRoot is relative and ui5SnapshotUrl is omitted', async () => {
        expect(isAbsolute(relativeProjectPath)).toBe(false);
        expect(migratedYaml()).toBe(false);

        const { result, messages } = await ProjectMigrator.migrate({
            projectRoot: relativeProjectPath,
            baseUri: DUMMY_BACKEND_URL
        });

        expect(messages.filter((m) => m.type === 'ERROR')).toEqual([]);
        expect(result).toBe(true);
        expect(migratedYaml()).toBe(true);
    }, 60000);

    it('migrates when projectRoot is a single-segment path relative to the working directory', async () => {
        process.chdir(tempDir);

        const { result, messages } = await ProjectMigrator.migrate({
            projectRoot: 'project',
            baseUri: DUMMY_BACKEND_URL
        });

        expect(messages.filter((m) => m.type === 'ERROR')).toEqual([]);
        expect(result).toBe(true);
        expect(migratedYaml()).toBe(true);
    }, 60000);

    it('migrates when projectRoot is "." and the working directory is the project', async () => {
        process.chdir(projectPath);

        const { result, messages } = await ProjectMigrator.migrate({ projectRoot: '.', baseUri: DUMMY_BACKEND_URL });

        expect(messages.filter((m) => m.type === 'ERROR')).toEqual([]);
        expect(result).toBe(true);
        expect(migratedYaml()).toBe(true);
    }, 60000);

    it('does not commit to disk when the caller provides the editor', async () => {
        const { createMemFsEditor } = await import('../../src/utils/fs-adapter.js');
        const fs = createMemFsEditor();

        const { result, fs: returnedFs } = await ProjectMigrator.migrate({
            projectRoot: relativeProjectPath,
            baseUri: DUMMY_BACKEND_URL,
            fs
        });

        expect(result).toBe(true);
        expect(returnedFs).toBe(fs);
        expect(migratedYaml()).toBe(false);
        expect(fs.read(join(projectPath, 'ui5.yaml'))).toContain(DUMMY_BACKEND_URL);
    }, 60000);

    it('overrides a relative rootPath supplied via importProjectInfo with the resolved absolute path', async () => {
        const { result, messages } = await ProjectMigrator.migrate({
            projectRoot: relativeProjectPath,
            baseUri: DUMMY_BACKEND_URL,
            importProjectInfo: { rootPath: relativeProjectPath }
        });

        expect(messages.filter((m) => m.type === 'ERROR')).toEqual([]);
        expect(result).toBe(true);
        expect(migratedYaml()).toBe(true);
    }, 60000);

    it('bulk migrates a project with a relative rootPath and no ui5SnapshotUrl', async () => {
        const projects = [
            {
                rootPath: relativeProjectPath,
                hostname: DUMMY_BACKEND_URL,
                moduleName: 'com.example.relative'
            } as MigrationUIProjectInfo
        ];

        const results = await new BulkProjectMigrator().migrate(projects);

        expect(results).toHaveLength(1);
        expect(results[0].status).toBe('SUCCESS');
        expect(migratedYaml()).toBe(true);
    }, 60000);
});
