/**
 * Helper functions for processing adaptation project configuration
 */
import type { Package } from '../project-spec-types.js';
import type { ImportProjectInfo, NeoappDestination } from '../types.js';

/**
 * Configuration for processing adaptation project
 */
export interface ProcessAdaptationProjectConfig {
    projectRoot: string;
    defaultProjectInfo: ImportProjectInfo;
    projectInfo: ImportProjectInfo;
    checkMigratableAdaptationProject: (projectRoot: string) => Promise<any>;
    getPackageJson: (projectRoot: string) => Promise<Package>;
    hasUI5Tooling: (packageJson: Package) => boolean;
    getDestinationFromNeoApp: (
        projectRoot: string,
        destination: string
    ) => Promise<
        | {
              destination?: string;
              neoAppUI5Version?: string;
              neoappDestinations?: NeoappDestination[];
          }
        | undefined
    >;
    getClientFromDestinationName: (destination: string) => string;
    getFirstBackend: (projectRoot: string) => Promise<
        | {
              url?: string;
          }
        | undefined
    >;
}

/**
 * Process adaptation project to build projectInfo
 * Handles adaptation-specific configuration including UI adaptation and destination setup
 *
 * @param config - Configuration object containing all required parameters
 * @returns Updated project info for adaptation project
 */
export async function processAdaptationProject(config: ProcessAdaptationProjectConfig): Promise<ImportProjectInfo> {
    const {
        projectRoot,
        defaultProjectInfo,
        projectInfo,
        checkMigratableAdaptationProject,
        getPackageJson,
        hasUI5Tooling,
        getDestinationFromNeoApp,
        getClientFromDestinationName,
        getFirstBackend
    } = config;
    try {
        const adaptationProject = await checkMigratableAdaptationProject(projectRoot);
        if (adaptationProject !== undefined) {
            const uiAdaptation = adaptationProject;
            const moduleName = adaptationProject.appvariant;
            const rootPath = projectRoot;
            let packageJSON: Package;
            let isFioriToolsProject = false;
            try {
                packageJSON = await getPackageJson(projectRoot);
                isFioriToolsProject = hasUI5Tooling(packageJSON);
            } catch {
                // Expected: package.json may not exist in legacy WebIDE adaptation projects.
                // Safe to continue - packageJSON will be generated during migration.
            }
            const neoAppData:
                | {
                      destination?: string;
                      neoAppUI5Version?: string;
                      neoappDestinations?: NeoappDestination[];
                  }
                | undefined = await getDestinationFromNeoApp(projectRoot, projectInfo.destination);

            const ui5Version = neoAppData?.neoAppUI5Version || adaptationProject.ui5Version;
            const destination = projectInfo.destination || adaptationProject.sourceSystem;

            const result = {
                ...defaultProjectInfo,
                ...{
                    uiAdaptation,
                    moduleName,
                    rootPath,
                    ui5Version,
                    isFioriToolsProject,
                    destination
                },
                ...neoAppData
            };
            if (neoAppData?.destination) {
                result.destination = neoAppData?.destination;
            }
            result.sapClient = getClientFromDestinationName(result.destination) ?? result.sapClient;

            result.hostname = (await getFirstBackend(projectRoot))?.url ?? '';

            return result;
        }
    } catch {
        // Expected: Not an adaptation project or missing required files (.che/project.json, .adp/config.json).
        // Safe to return original projectInfo and continue as regular project migration.
    }

    return projectInfo;
}
