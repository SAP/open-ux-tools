import { join } from 'node:path';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { isCapProject, FileName } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';
import YAML from 'yaml';

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
    yamlPath?: string,
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

    const resolvedYamlPath = yamlPath ? join(basePath, yamlPath) : join(basePath, FileName.Ui5Yaml);
    if (!fs.exists(resolvedYamlPath)) {
        throw new Error(`Configuration file ${resolvedYamlPath} not found. Please provide a valid path`);
    }

    addStartEmbeddedScript(fs, basePath, flpPath, logger);
    addFlpYaml(fs, basePath, resolvedYamlPath, bspApp, logger);

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
 * @param yamlPath - absolute path to the source ui5.yaml
 * @param bspApplication - BSP application name (lowercase)
 * @param logger - optional logger
 */
function addFlpYaml(fs: Editor, basePath: string, yamlPath: string, bspApplication: string, logger?: ToolsLogger): void {
    const flpYamlPath = join(basePath, 'flp.yaml');
    const yamlContent = fs.read(yamlPath);
    const flpYaml = YAML.parseDocument(yamlContent).toJSON();

    const appModule: string = flpYaml.metadata.name.replace(/\./g, '/');
    const paths: { path: string; src: string }[] = [{ path: '/**/' + bspApplication, src: 'dist' }];

    if (appModule !== bspApplication) {
        paths.push({ path: '/**/' + appModule, src: 'dist' });
    }

    flpYaml.resources = { configuration: { paths: { webapp: 'dist' } } };

    const appreloadMiddleware = flpYaml.server?.customMiddleware?.find(
        (mw: { name: string }) => mw.name === 'fiori-tools-appreload'
    );
    if (appreloadMiddleware) {
        if (appreloadMiddleware.configuration) {
            appreloadMiddleware.configuration.path = 'dist';
        } else {
            appreloadMiddleware.configuration = { path: 'dist' };
        }
    }

    const proxyMiddleware = flpYaml.server?.customMiddleware?.find(
        (mw: { name: string }) => mw.name === 'fiori-tools-proxy'
    );
    if (proxyMiddleware) {
        proxyMiddleware.configuration.bsp = bspApplication;
    }

    flpYaml.server.customMiddleware.push({
        name: 'fiori-tools-servestatic',
        beforeMiddleware: 'fiori-tools-proxy',
        configuration: { paths }
    });

    fs.write(flpYamlPath, YAML.stringify(flpYaml));
    logger?.debug(`'flp.yaml' written.`);
}
