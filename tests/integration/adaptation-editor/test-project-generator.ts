import { randomUUID } from 'crypto';
import { generateAdpProject, generateUi5Project } from './src/project/builder';
import { ADP_FIORI_ELEMENTS_V2 } from './src/project/projects';
import { rm, stat, symlink, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import globalSetup from './src/global-setup';
import { getPortPromise } from 'portfinder';
import { existsSync } from 'fs';

/**
 * Interface for test project configurations.
 */
interface TestProjectConfig {
    projectConfig: any;
    isAdp?: boolean;
}

/**
 * Map of test file names to their corresponding project configurations.
 */
const testConfigMap: Record<string, TestProjectConfig> = {
    'list-report-v2': {
        projectConfig: ADP_FIORI_ELEMENTS_V2,
        isAdp: true
    },
    'object-page-v2': {
        projectConfig: {
            ...ADP_FIORI_ELEMENTS_V2,
            baseApp: {
                ...ADP_FIORI_ELEMENTS_V2.baseApp,
                userParams: {
                    navigationProperty: 'toFirstAssociatedEntity',
                    qualifier: 'tableSection'
                }
            }
        },
        isAdp: true
    },
    'object-page-v2a': {
        projectConfig: {
            ...ADP_FIORI_ELEMENTS_V2,
            baseApp: {
                ...ADP_FIORI_ELEMENTS_V2.baseApp,
                userParams: {
                    navigationProperty: 'toFirstAssociatedEntity',
                    variantManagement: false,
                    qualifier: 'tableSection'
                }
            }
        },
        isAdp: true
    },
    'object-page-v2b': {
        projectConfig: {
            ...ADP_FIORI_ELEMENTS_V2,
            baseApp: {
                ...ADP_FIORI_ELEMENTS_V2.baseApp,
                userParams: {
                    navigationProperty: 'toFirstAssociatedEntity',
                    qualifier: 'tableSection',
                    analyticalTable: true
                }
            }
        },
        isAdp: true
    }
    // Add more test file mappings as needed
};

/**
 * Default UI5 version to use if not provided.
 */
const DEFAULT_UI5_VERSION = '1.120.0';

/**
 * Default backend URL for ADP projects.
 */
const DEFAULT_BACKEND_URL = 'http://localhost:3050';

/**
 * Default livereload port for ADP projects.
 */
const DEFAULT_LIVERELOAD_PORT = 35729;

// Avoid installing npm packages every time, but use symlink instead
const PACKAGE_ROOT = join(__dirname, '..', '..', 'fixtures', 'projects', 'mock');
let abapServerInstance: any;
/**
 * Starts the mock ABAP backend server.
 * If a server is already running, it will reuse the existing server if it's using
 * the same folder, otherwise it will stop the existing server and start a new one.
 *
 * @param folderName - The folder name to use for the server
 * @param port - The port to use for the server (default: 3050)
 * @returns Promise that resolves when the server is started with the port it's running on
 */
export async function startAbapServer(folderName: string, port: number = 3050): Promise<void> {
    abapServerInstance = await globalSetup(port, folderName);
    console.log(`Started ABAP server with PID ${process.pid} using folder: ${folderName} on port: ${port}`);
}

/**
 * Stops the mock ABAP backend server.
 */
export async function stopAbapServer(): Promise<void> {
    if (abapServerInstance) {
        (await abapServerInstance).close();
        abapServerInstance = null;
        console.log('Mock ABAP backend stopped');
    }
}

/**
 * Stops all servers.
 */
export async function stopAllServers(): Promise<void> {
    await stopAbapServer();
}

/**
 * Delete a project
 *
 * @param folderPath - Path to the project to delete
 */
async function deleteProject(folderPath: string): Promise<void> {
    if (existsSync(folderPath)) {
        try {
            console.log(`Deleting existing project at ${folderPath}`);
            await rm(folderPath, { recursive: true });
        } catch (error) {
            console.error(`Error deleting project: ${error}`);
            throw error;
        }
    }
}

/**
 * Generates a test project based on the specified test file name.
 *
 * @param testFileName - The name of the test file to use for configuration
 * @param ui5Version - Optional UI5 version to use
 * @param backendUrl - Optional backend URL for ADP projects
 * @param livereloadPort - Optional livereload port for ADP projects
 * @param startServers - Whether to automatically start the servers (ABAP and UI5)
 * @param ui5Port - Starting port for the UI5 server
 * @param forceRegenerate - Whether to force regeneration of the project even if it exists
 * @returns Promise resolving to an object containing the project path and server info
 * @throws Error if the specified test file is not found in the configuration map
 */
export async function generateTestProject(
    testFileName: string,
    ui5Version: string = DEFAULT_UI5_VERSION,
    backendUrl: string = DEFAULT_BACKEND_URL,
    livereloadPort: number = DEFAULT_LIVERELOAD_PORT,
    startServers: boolean = false,
    //forceRegenerate: boolean = false
): Promise<{ projectPath: string; ui5Port?: number; abapPort?: number }> {
    // Extract just the filename if a full path is provided
    const fileName = testFileName.includes('/')
        ? testFileName.substring(testFileName.lastIndexOf('/') + 1)
        : testFileName;

    // Remove the '#file:' prefix if present
    const normalizedFileName = fileName.startsWith('#file:') ? fileName.substring(6) : fileName;

    // Remove the '.spec.ts' suffix if present
    const testName = normalizedFileName.endsWith('.spec.ts')
        ? normalizedFileName.substring(0, normalizedFileName.length - 8)
        : normalizedFileName;

    const config = testConfigMap[testName];

    if (!config) {
        throw new Error(`No configuration found for test file: ${testName}`);
    }

    const folderPath = join('manual-test', testName);
    const fullFolderPath = join(__dirname, folderPath);

    let projectPath = '';

    // if (!forceRegenerate) {
    //     console.log(`Using existing project at ${fullFolderPath}`);

    //     // Find the actual project path (it includes a unique worker ID)
    //     const items = await readdir(fullFolderPath);
    //     const adpProject = items.find(
    //         (item) => item.startsWith(config.projectConfig.id) && existsSync(join(fullFolderPath, item, 'webapp'))
    //     );

    //     if (adpProject) {
    //         projectPath = join(fullFolderPath, adpProject);
    //     } else {
    //         console.log('Could not find valid project in the folder, regenerating...');
    //         await deleteProject(fullFolderPath);
    //     }
    // }

    // Start the ABAP server if requested
    let abapPort = 3050;
    if (startServers) {
        try {
            abapPort = await getPortPromise({ port: abapPort, stopPort: 3050 + 1000 });
            await startAbapServer(folderPath, abapPort);

            // Update backendUrl with the actual port the server is running on
            backendUrl = `http://localhost:${abapPort}`;
        } catch (error) {
            console.error(`Failed to start ABAP server: ${error}`);
        }
    }

    // Generate the project if it doesn't exist or we need to regenerate
    if (!projectPath) {
        // Generate a unique worker ID for the project
        const workerId = randomUUID().substring(0, 8);

        if (config.isAdp) {
            await mkdir(fullFolderPath, { recursive: true });
            await generateUi5Project(config.projectConfig.baseApp, workerId, ui5Version, folderPath);
            projectPath = await generateAdpProject(
                config.projectConfig,
                workerId,
                ui5Version,
                backendUrl,
                livereloadPort,
                folderPath,
                { port: abapPort }
            );
            const targetPath = join(projectPath, 'node_modules');
            try {
                await stat(targetPath);
                await rm(targetPath, { recursive: true });
            } catch (error) {
                if (error?.code !== 'ENOENT') {
                    console.log(error);
                }
            } finally {
                // type required for windows
                const nmFolder = join(PACKAGE_ROOT, 'node_modules');
                await symlink(nmFolder, targetPath, 'junction');
            }
        } else {
            projectPath = await generateUi5Project(config.projectConfig, workerId, ui5Version, folderPath);
        }
    }

    return { projectPath, abapPort };
}

/**
 * Command line interface for the script.
 * Usage: node test-project-generator.js #file:test-file-name.spec.ts [--start-servers] [--port=3000] [--force]
 */
if (require.main === module) {
    // This will run only when the script is executed directly
    const testFileName = process.argv[2];
    const startServersFlag = process.argv.includes('--start-servers');
    //const forceRegenerateFlag = process.argv.includes('--force');

    if (!testFileName) {
        console.error('Please provide a test file name. Example: #file:object-page-v2a.spec.ts');
        process.exit(1);
    }

    generateTestProject(
        testFileName,
        DEFAULT_UI5_VERSION,
        DEFAULT_BACKEND_URL,
        DEFAULT_LIVERELOAD_PORT,
        startServersFlag,
        //forceRegenerateFlag
    )
        .then(({ projectPath, ui5Port }) => {
            console.log(`Project at: ${projectPath}`);
            if (ui5Port) {
                console.log(
                    `Adaptation Editor URL: http://localhost:${ui5Port}/adaptation-editor.html?fiori-tools-rta-mode=true#app-preview`
                );
            }

            if (!startServersFlag) {
                process.exit(0);
            } else {
                console.log('Press Ctrl+C to stop the servers and exit');

                // Handle graceful shutdown
                process.on('SIGINT', async () => {
                    console.log('Shutting down servers...');
                    await stopAllServers();
                    process.exit(0);
                });
            }
        })
        .catch(async (error) => {
            console.error(`Failed to generate project: ${error.message}`);
            if (startServersFlag) {
                await stopAllServers();
            }
            process.exit(1);
        });
}
