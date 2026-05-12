import { join } from 'node:path';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { isCapProject, FileName, readUi5Yaml } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';

const DEFAULT_FLP_PATH = 'sap/bc/ui5_ui5/ui2/ushell/shells/abap/Fiorilaunchpad.html';

/**
 * Generates the FLP Embedded Mode configuration for a Fiori app:
 * - adds the `start-embedded` npm script to package.json
 * - creates flp.yaml based on the existing ui5.yaml
 *
 * @param basePath - root of the project (where package.json is)
 * @param bspApplication - BSP application name of the deployed app
 * @param flpPath - FLP URL path (defaults to the standard ABAP FLP path)
 * @param yamlPath - path to the ui5.yaml to use as base (defaults to ui5.yaml in basePath)
 * @param fs - optional mem-fs editor instance
 * @param logger - optional logger
 * @returns mem-fs editor instance with modified/created files
 */
export async function generateFlpEmbeddedConfig(
    basePath: string,
    bspApplication: string,
    flpPath: string = DEFAULT_FLP_PATH,
    yamlPath: string = FileName.Ui5Yaml,
    fs?: Editor,
    logger?: ToolsLogger
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    const bspApp = bspApplication.trim().toLowerCase();
    if (!bspApp) {
        throw new Error('Mandatory parameter bspApplication is missing.');
    }

    if (await isCapProject(basePath)) {
        throw new Error('CAP projects are not supported for FLP Embedded Mode configuration.');
    }

    const resolvedYamlPath = join(basePath, yamlPath);
    if (!fs.exists(resolvedYamlPath)) {
        throw new Error(`Configuration file ${resolvedYamlPath} not found. Please provide a valid path`);
    }

    addStartEmbeddedScript(fs, basePath, flpPath, logger);
    await addFlpYaml(fs, basePath, yamlPath, bspApp, logger);
    return fs;
}

/**
 * Adds the start-embedded npm script to package.json.
 * Prepends `ui5 build` so dist/ is always built before fiori run starts,
 * avoiding issues where --clean-dest in the build script deletes dist/ and
 * kills the file watcher mid-rebuild.
 *
 * @param fs - mem-fs editor instance
 * @param basePath - project root
 * @param flpPath - FLP URL path
 * @param logger - optional logger
 */
function addStartEmbeddedScript(fs: Editor, basePath: string, flpPath: string, logger?: ToolsLogger): void {
    const packageJsonPath = join(basePath, FileName.Package);
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;

    if (!packageJson) {
        throw new Error(`File 'package.json' not found at ${basePath}`);
    }

    if (!packageJson.scripts) {
        packageJson.scripts = {};
    }

    packageJson.scripts['start-embedded'] =
        `ui5 build && fiori run --config ./flp.yaml --open "${flpPath}?sap-ushell-nocb=true"`;
    fs.writeJSON(packageJsonPath, packageJson);
    logger?.debug(`Script 'start-embedded' written to 'package.json'.`);
}

/**
 * Creates flp.yaml based on the existing ui5.yaml, adding servestatic middleware
 * and configuring appreload and proxy middlewares.
 *
 * @param fs - mem-fs editor instance
 * @param basePath - project root
 * @param yamlFileName - relative path to the source ui5.yaml (e.g. 'ui5.yaml')
 * @param bspApplication - BSP application name (lowercase)
 * @param logger - optional logger
 */
async function addFlpYaml(
    fs: Editor,
    basePath: string,
    yamlFileName: string,
    bspApplication: string,
    logger?: ToolsLogger
): Promise<void> {
    const flpYamlPath = join(basePath, 'flp.yaml');
    const ui5Config = await readUi5Yaml(basePath, yamlFileName, fs);

    const appModule: string = ui5Config.getMetadata().name.replaceAll('.', '/');

    const DIST = 'dist' as const;
    const paths: { path: string; src: string }[] = [{ path: '/**/' + bspApplication, src: DIST }];

    if (appModule !== bspApplication) {
        paths.push({ path: '/**/' + appModule, src: DIST });
    }

    ui5Config.setConfiguration({ paths: { webapp: DIST } });

    const appreloadMiddleware = ui5Config.findCustomMiddleware<{ path?: string }>('fiori-tools-appreload');
    if (appreloadMiddleware) {
        ui5Config.updateCustomMiddleware({
            ...appreloadMiddleware,
            configuration: { ...appreloadMiddleware.configuration, path: DIST }
        });
    }

    const proxyMiddleware = ui5Config.findCustomMiddleware<{ bsp?: string }>('fiori-tools-proxy');
    if (proxyMiddleware) {
        ui5Config.updateCustomMiddleware({
            ...proxyMiddleware,
            configuration: { ...proxyMiddleware.configuration, bsp: bspApplication }
        });
    }

    ui5Config.addCustomMiddleware([
        {
            name: 'fiori-tools-servestatic',
            beforeMiddleware: 'fiori-tools-proxy',
            configuration: { paths }
        }
    ]);

    fs.write(flpYamlPath, ui5Config.toString());
    logger?.debug(`'flp.yaml' written.`);
}
