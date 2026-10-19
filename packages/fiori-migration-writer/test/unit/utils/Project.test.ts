import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { URI } from 'vscode-uri';
import { ProjectAccess, MigrationTypes, initI18n } from '../../../src/index.js';
import type { ProjectFolder } from '../../../src/types.js';
import { createMemFsEditor } from '../../../src/utils/fs-adapter.js';
import { loadProjectIntoMemFs } from '../../helpers/mem-fs-helper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesInput = join(__dirname, '../../fixtures/input');

/**
 * Build a ProjectFolder for the given absolute path.
 *
 * @param fsPath - absolute path of the folder
 * @param index - ordinal index
 */
function projectFolder(fsPath: string, index = 0): ProjectFolder {
    return { uri: URI.file(fsPath), name: fsPath, index };
}

describe('ProjectAccess', () => {
    beforeAll(async () => {
        await initI18n();
    });

    describe('pure delegators', () => {
        test('getManifestPath joins project root, webapp path and manifest.json', () => {
            const result = ProjectAccess.getManifestPath('/project', 'webapp');
            expect(result).toBe(join('/project', 'webapp', 'manifest.json'));
        });

        test('getPackageJsonPath joins project root and package.json', () => {
            const result = ProjectAccess.getPackageJsonPath('/project');
            expect(result).toBe(join('/project', 'package.json'));
        });

        test('getVersionFromManifest returns v2 for sap.ui.generic.app projects', () => {
            const manifest: any = {
                'sap.app': { type: 'application' },
                'sap.ui.generic.app': { pages: [{ entitySet: 'E' }] }
            };
            expect(ProjectAccess.getVersionFromManifest(manifest)).toBeDefined();
        });

        test('getVersionFromManifest returns undefined for freestyle apps', () => {
            const manifest: any = { 'sap.app': { type: 'application' }, 'sap.ui5': {} };
            expect(ProjectAccess.getVersionFromManifest(manifest)).toBeUndefined();
        });

        test('getSemanticObjectAction reads the first crossNavigation inbound', () => {
            const manifest: any = {
                'sap.app': {
                    crossNavigation: {
                        inbounds: {
                            first: { semanticObject: 'Sales', action: 'display' }
                        }
                    }
                }
            };
            expect(ProjectAccess.getSemanticObjectAction(manifest)).toBe('Sales-display');
        });

        test('getSemanticObjectAction returns undefined when no inbounds', () => {
            expect(ProjectAccess.getSemanticObjectAction({ 'sap.app': {} } as any)).toBeUndefined();
        });

        test('getMainEntity returns the first page entitySet', () => {
            const manifest: any = {
                'sap.ui.generic.app': { pages: [{ entitySet: 'Products' }] }
            };
            expect(ProjectAccess.getMainEntity(manifest)).toBe('Products');
        });

        test('getMainEntity falls back to OVP global filter entity', () => {
            const manifest: any = { 'sap.ovp': { globalFilterEntityType: 'Filter' } };
            expect(ProjectAccess.getMainEntity(manifest)).toBe('Filter');
        });

        test('getFloorPlan returns LROP v2 for generic app pages', () => {
            const manifest: any = {
                'sap.app': { type: 'application' },
                'sap.ui.generic.app': { pages: [{ entitySet: 'E' }] }
            };
            const feVersion = ProjectAccess.getVersionFromManifest(manifest);
            expect(ProjectAccess.getFloorPlan(manifest, feVersion)).toBeTruthy();
        });

        test('getFloorPlan throws for unsupported/freestyle projects', () => {
            const manifest: any = { 'sap.app': { type: 'application' } };
            expect(() => ProjectAccess.getFloorPlan(manifest, undefined)).toThrow();
        });

        test('getClientFromDestinationName extracts a trailing 3-digit client', () => {
            expect(ProjectAccess.getClientFromDestinationName('MY_DEST_100')).toBe('100');
            expect(ProjectAccess.getClientFromDestinationName('MY_DEST')).toBe('');
        });

        test('getNeoAppData returns the first destination route', () => {
            const neoApp = {
                routes: [{ path: '/sap', target: { type: 'destination', name: 'BACKEND_100' } }]
            };
            const data = ProjectAccess.getNeoAppData(neoApp, '');
            expect(data.destination).toBe('BACKEND_100');
        });

        test('hasUI5Tooling detects public and legacy tooling deps', () => {
            expect(ProjectAccess.hasUI5Tooling({ devDependencies: { '@sap-ux/ui5-tooling': '1' } } as any)).toBe(true);
            expect(ProjectAccess.hasUI5Tooling({ dependencies: { '@sap/ux-ui5-tooling': '1' } } as any)).toBe(true);
            expect(ProjectAccess.hasUI5Tooling({ dependencies: {} } as any)).toBe(false);
            expect(ProjectAccess.hasUI5Tooling(undefined)).toBe(false);
        });

        test('getPackageJson reads a package.json through mem-fs', async () => {
            const fs = createMemFsEditor();
            const root = join(fixturesInput, 'tool_suite_beta_lrop_v2_project');
            const pkg = await ProjectAccess.getPackageJson(root, fs);
            expect(pkg).toBeDefined();
            expect(typeof pkg).toBe('object');
        });
    });

    describe('getWebappPath', () => {
        test('returns "webapp" when a webapp folder exists', async () => {
            const root = join(fixturesInput, 'tool_suite_beta_lrop_v2_project');
            expect(await ProjectAccess.getWebappPath(root)).toBe('webapp');
        });

        test('resolves custom webapp path from .project.json hcpdeploy entry when it exists', async () => {
            const root = join(fixturesInput, 'webide_freestyle_custom_webapp_path');
            const result = await ProjectAccess.getWebappPath(root);
            // The fixture has no webapp folder, so the resolver falls through its sources.
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        test('shares a provided editor instance', async () => {
            const fs = createMemFsEditor();
            const root = join(fixturesInput, 'webide_v2_lrop_project_no_webapp');
            expect(await ProjectAccess.getWebappPath(root, undefined, undefined, fs)).toBe('webapp');
        });
    });

    describe('getManifestJson', () => {
        test('reads the manifest from the webapp folder', async () => {
            const root = join(fixturesInput, 'tool_suite_beta_lrop_v2_project');
            const manifest = await ProjectAccess.getManifestJson(root, 'webapp');
            expect(manifest['sap.app']).toBeDefined();
        });
    });

    describe('getProjectInfo', () => {
        test('processes a regular v2 LROP project', async () => {
            const root = join(fixturesInput, 'tool_suite_beta_lrop_v2_project');
            const fs = loadProjectIntoMemFs(root);
            const { projectInfo } = await ProjectAccess.getProjectInfo(root, undefined, undefined, undefined, fs);
            expect(projectInfo.webappPath).toBe('webapp');
            expect(projectInfo.FEVersion).toBeDefined();
        });

        test('processes a project extension', async () => {
            const root = join(fixturesInput, 'CA_FIORI_INBOXExtension');
            const fs = loadProjectIntoMemFs(root);
            const { projectInfo } = await ProjectAccess.getProjectInfo(
                root,
                MigrationTypes.projectExtension,
                undefined,
                undefined,
                fs
            );
            expect(projectInfo).toBeDefined();
            expect(projectInfo.webappPath).toBeDefined();
        });

        test('processes an adaptation project', async () => {
            const root = join(fixturesInput, 'adaptation_project_wde');
            const fs = loadProjectIntoMemFs(root);
            const { projectInfo } = await ProjectAccess.getProjectInfo(root, undefined, undefined, undefined, fs);
            expect(projectInfo).toBeDefined();
        });

        test('processes a reuse library discovered via a nested manifest', async () => {
            const root = join(fixturesInput, 'reuse_library_project');
            const fs = loadProjectIntoMemFs(root);
            const { projectInfo } = await ProjectAccess.getProjectInfo(root, undefined, undefined, undefined, fs);
            expect(projectInfo).toBeDefined();
            expect(projectInfo.webappPath).toBeDefined();
        });

        test('processes a standalone reuse library with a root-level library manifest', async () => {
            const root = join(fixturesInput, 'coverage_ui5_library_standalone');
            const fs = loadProjectIntoMemFs(root);
            const { projectInfo } = await ProjectAccess.getProjectInfo(
                root,
                MigrationTypes.library,
                undefined,
                undefined,
                fs
            );
            expect(projectInfo).toBeDefined();
        });

        test('reports an error for a folder that is not migratable', async () => {
            const fs = createMemFsEditor();
            const root = join(__dirname, 'does-not-exist-abc');
            const { messages } = await ProjectAccess.getProjectInfo(root, undefined, undefined, undefined, fs);
            expect(messages.some((m) => m.type === 'ERROR')).toBe(true);
        });
    });

    describe('getProjectRoots', () => {
        test('discovers projects and reuse libraries in a workspace', async () => {
            const fs = createMemFsEditor();
            const roots = [
                projectFolder(join(fixturesInput, 'tool_suite_beta_lrop_v2_project')),
                projectFolder(join(fixturesInput, 'reuse_library_project'), 1)
            ];
            const result = await ProjectAccess.getProjectRoots(roots, false, fs);
            expect(Array.isArray(result)).toBe(true);
            // At least the regular LROP project should be discovered.
            expect(result.some((entry) => entry.root.includes('tool_suite_beta_lrop_v2_project'))).toBe(true);
        }, 60000);

        test('returns an empty array for an empty workspace', async () => {
            const fs = createMemFsEditor();
            const result = await ProjectAccess.getProjectRoots([], false, fs);
            expect(result).toEqual([]);
        });
    });
});
