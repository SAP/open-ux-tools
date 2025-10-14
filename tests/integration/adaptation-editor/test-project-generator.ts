import { randomUUID } from 'crypto';
import { generateAdpProject, generateUi5Project } from './src/project/builder';
import { rm, stat, symlink, mkdir } from 'fs/promises';
import { join } from 'node:path';
import { getPortPromise } from 'portfinder';
import { existsSync, readFileSync } from 'node:fs';
import readline from 'node:readline';

/**
 * Interface for test project configurations.
 */
interface TestProjectConfig {
    projectConfig: any;
    isAdp?: boolean;
}

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
    livereloadPort: number = DEFAULT_LIVERELOAD_PORT
    // startServers: boolean = false,
    //forceRegenerate: boolean = false
): Promise<{ projectPath: string }> {
    // Extract just the filename if a full path is provided
    const fileName = testFileName.includes('/')
        ? testFileName.substring(testFileName.lastIndexOf('/') + 1)
        : testFileName;

    // Remove the '.spec.ts' suffix if present
    const testName = fileName.endsWith('.spec.ts') ? fileName.substring(0, fileName.length - 8) : fileName;

    // Get the configuration by reading #test-project-map.json
    // load mapping from JSON file placed next to this script
    const testConfigMap: Record<string, TestProjectConfig> = JSON.parse(
        readFileSync(join(__dirname, 'test-project-map.json'), 'utf-8')
    );
    const config = testConfigMap[testName];

    if (!config) {
        throw new Error(`No configuration found for test file: ${testName}`);
    }

    const folderPath = join('manual-test', testName);
    const fullFolderPath = join(__dirname, folderPath);

    let projectPath = '';

    // Generate the project if it doesn't exist or we need to regenerate
    if (!projectPath) {
        // Generate a unique worker ID for the project
        const workerId = randomUUID().substring(0, 8);

        if (config.isAdp) {
            const abapPort = await getPortPromise({ port: 3050, stopPort: 3050 + 1000 });
            // If the target folder already exists, remove it completely to start clean
            if (existsSync(fullFolderPath)) {
                console.log(`WARNING: existing folder will be removed: ${fullFolderPath}`);
                const ok = await promptYesNo('This will delete the existing project state. Continue and remove it? (y/N): ');
                if (!ok) {
                    throw new Error('Aborted by user — existing project state preserved.');
                }
                console.log(`Removing existing folder ${fullFolderPath} to recreate fresh project`);
                await rm(fullFolderPath, { recursive: true, force: true });
            }
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

    return { projectPath };
}

/**
 * Ask a yes/no question on the terminal. Returns true only if user answers 'y' or 'Y'.
 * If stdin is not a TTY, returns false to avoid destructive actions in non-interactive environments.
 */
function promptYesNo(question: string): Promise<boolean> {
    return new Promise((resolve) => {
        if (!process.stdin.isTTY) {
            console.error('Non-interactive terminal detected — cannot confirm destructive action.');
            return resolve(false);
        }
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, (answer) => {
            rl.close();
            const normalized = (answer || '').trim().toLowerCase();
            resolve(normalized === 'y' || normalized === 'yes');
        });
    });
}

if (require.main === module) {
    // argv[2] expect on file name with or without extension
    const testFileName = process.argv[2];
    if (!testFileName) {
        console.error('Please provide a test file name. Example: #file:object-page-v2a.spec.ts');
        process.exit(1);
    }

    generateTestProject(testFileName, DEFAULT_UI5_VERSION, DEFAULT_BACKEND_URL, DEFAULT_LIVERELOAD_PORT).then(
        ({ projectPath }) => console.log(`Project Generated under folder: "${projectPath}"`)
    );
}
