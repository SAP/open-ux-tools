/**
 * Helper functions for processing reuse library projects
 */
import type { Manifest, Package } from '../project-spec-types.js';
import type { ImportProjectInfo, ProjectFolder } from '../types.js';
import { MigrationTypes } from '../utils/constants.js';

/**
 * Process reuse library project to build projectInfo
 * Handles reuse-lib-specific configuration
 *
 * @param projectRoot - Root path of the project
 * @param defaultProjectInfo - Default project info template
 * @param workspaceFolders - Project workspace folders
 * @param manifest - The manifest object (optional)
 * @param getPackageJson - Function to get package.json
 * @param hasUI5Tooling - Function to check for UI5 tooling
 * @param getReuseLibModuleName - Function to get reuse lib module name
 * @returns Project info for reuse library
 */
export async function processReuseLibrary(
    projectRoot: string,
    defaultProjectInfo: ImportProjectInfo,
    workspaceFolders: readonly ProjectFolder[] | undefined,
    manifest: Manifest | undefined,
    getPackageJson: (projectRoot: string) => Promise<Package>,
    hasUI5Tooling: (packageJson: Package) => boolean,
    getReuseLibModuleName: (
        projectRoot: string,
        workspaceFolders: readonly ProjectFolder[] | undefined,
        manifest: Manifest | undefined
    ) => Promise<string>
): Promise<ImportProjectInfo> {
    let packageJSON: Package;
    let hasUI5ToolingDep = false;
    try {
        packageJSON = await getPackageJson(projectRoot);
        hasUI5ToolingDep = hasUI5Tooling(packageJSON);
    } catch {
        // Expected: package.json may not exist in reuse library projects.
        // Safe to continue - packageJSON will be generated during migration.
    }
    const moduleName = await getReuseLibModuleName(projectRoot, workspaceFolders, manifest);

    return {
        ...defaultProjectInfo,
        ...{
            moduleName,
            isFioriToolsProject: hasUI5ToolingDep,
            ...{ rootPath: projectRoot, type: MigrationTypes.library }
        }
    };
}
