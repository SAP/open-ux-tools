import { describe, it, expect } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProjectAccess } from '../../../src/utils/Project.js';
import { MigrationTypes } from '../../../src/utils/constants.js';
import { URI } from 'vscode-uri';
import type { ProjectFolder } from '../../../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ProjectAccess.getProjectRoots', () => {
    const fixturesDir = join(__dirname, '..', '..', 'fixtures', 'project-roots');

    const createProjectFolder = (path: string): ProjectFolder => ({
        uri: URI.file(path),
        name: path.split('/').pop() ?? '',
        index: 0
    });

    it('should deduplicate a project with both package.json and pom.xml (exact match)', async () => {
        // Regression: A package/POM project with a root-level manifest.json passes the later
        // descendant-only filter because manifestRoot === root, then gets appended and scanned
        // twice again. The fix rejects exact matches (manifestRoot === root || manifestRoot.startsWith(root + sep)).
        const WSUri = URI.file(join(fixturesDir, 'app-with-package-and-pom'));
        const projectRoots = await ProjectAccess.getProjectRoots([createProjectFolder(WSUri.fsPath)], false);
        expect(projectRoots.length).toEqual(1);
        expect(projectRoots[0].type).toEqual(MigrationTypes.project);
        expect(projectRoots[0].root.endsWith(join('fixtures', 'project-roots', 'app-with-package-and-pom'))).toEqual(
            true
        );
    });

    it('should include a regular app with an embedded library (not filtered out)', async () => {
        // Regression: A shared root is not necessarily itself a reuse-library project.
        // getReuseLibs assigns a nested library to the nearest package/POM root, so a normal
        // freestyle app containing an embedded library can have the same libRoot. Only suppress
        // the project entry when getProjectInfo classifies that root as MigrationTypes.library.
        const WSUri = URI.file(join(fixturesDir, 'app-with-nested-lib'));
        const projectRoots = await ProjectAccess.getProjectRoots([createProjectFolder(WSUri.fsPath)], false);
        // Should have 2 entries: one for the app (project type) and one for the nested lib (library type)
        expect(projectRoots.length).toEqual(2);
        const appEntry = projectRoots.find(
            (p) =>
                p.type === MigrationTypes.project &&
                p.root.endsWith(join('fixtures', 'project-roots', 'app-with-nested-lib'))
        );
        const libEntry = projectRoots.find((p) => p.type === MigrationTypes.library);
        expect(appEntry).toBeDefined();
        expect(libEntry).toBeDefined();
        expect(appEntry?.root.endsWith(join('fixtures', 'project-roots', 'app-with-nested-lib'))).toEqual(true);
        expect(
            libEntry?.root.endsWith(join('fixtures', 'project-roots', 'app-with-nested-lib', 'libs', 'test-lib'))
        ).toEqual(true);
    });

    it('should return a single entry for a reuse library that also has a ui5.yaml and .che entryPath', async () => {
        // Regression: a legacy WebIDE UI5 library whose manifest.json is nested in the source tree
        // (src/sap/.../manifest.json) is discovered both as a plain project (via pom.xml/neo-app.json)
        // and as a reuse library (via getReuseLibs). Its .che/project.json points hcpdeploy.entryPath
        // at the nested manifest, so project-type resolution also finds the library manifest. The root
        // must be reported exactly once, as a library — not twice.
        const WSUri = URI.file(join(fixturesDir, 'reuselib-ui5yaml'));
        const projectRoots = await ProjectAccess.getProjectRoots([createProjectFolder(WSUri.fsPath)], false);
        expect(projectRoots.length).toEqual(1);
        expect(projectRoots[0].type).toEqual(MigrationTypes.library);
        expect(projectRoots[0].root.endsWith(join('fixtures', 'project-roots', 'reuselib-ui5yaml'))).toEqual(true);
    });

    it('should preserve correct libRoot and libPath for nested library structure', async () => {
        // Regression test: Verify that deduplication logic preserves the correct
        // distinction between libRoot (project root, where package.json/ui5.yaml go) and libPath
        // (manifest directory in nested source tree).
        //
        // Bug scenario: For UI5 libraries with namespace folder structure
        // (e.g., src/sap/nw/core/om/lib/printreuse/manifest.json), the migration tool was
        // incorrectly placing configuration files inside the nested source directory.
        //
        // Expected structure after migration:
        // project-root/
        // ├── package.json ✅ (at root, driven by libRoot)
        // ├── ui5.yaml ✅ (at root, driven by libRoot)
        // └── src/sap/nw/core/om/lib/printreuse/
        //     └── manifest.json (libPath = dirname of this)
        const WSUri = URI.file(join(fixturesDir, 'reuselib-ui5yaml'));
        const projectRoots = await ProjectAccess.getProjectRoots([createProjectFolder(WSUri.fsPath)], false);
        expect(projectRoots.length).toEqual(1);
        const libEntry = projectRoots[0];
        expect(libEntry.type).toEqual(MigrationTypes.library);

        // libRoot should be the project root (where package.json/ui5.yaml go)
        expect(libEntry.root.endsWith(join('fixtures', 'project-roots', 'reuselib-ui5yaml'))).toEqual(true);
        expect(libEntry.root).not.toContain('src'); // Must NOT be in nested src directory

        // libPath should be the manifest directory (nested in src/)
        expect(libEntry.libPath).toBeDefined();
        expect(libEntry.libPath).toContain('src');
        expect(
            libEntry.libPath?.endsWith(
                join(
                    'fixtures',
                    'project-roots',
                    'reuselib-ui5yaml',
                    'src',
                    'sap',
                    'nw',
                    'core',
                    'om',
                    'lib',
                    'printreuse'
                )
            )
        ).toEqual(true);
    });
});
