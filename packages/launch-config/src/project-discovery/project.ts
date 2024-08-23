import { promises as fs } from 'fs';
import { basename, join } from 'path';
import type { Manifest, ODataVersion, Package } from '@sap-ux/project-access';
import { DirName, FileName, readUi5Yaml } from '@sap-ux/project-access';
import { parse } from 'jsonc-parser';
import { Arguments, type FioriOptions } from '../types';
import type { FioriToolsProxyConfig } from '@sap-ux/ui5-config';
import type { Logger } from '@sap-ux/logger';

/**
 * Find out starting HTML file for project using package.json.
 *
 * @param projectRoot - root of the project, where package.json is.
 * @returns file to start launch configuration with.
 */
async function getStartFileFromPackageFile(projectRoot: string): Promise<string | undefined> {
    const pckJsonPath = join(projectRoot, FileName.Package);
    const packageJson = parse(await fs.readFile(pckJsonPath, { encoding: 'utf8' })) as Package;
    const scripts = packageJson.scripts;
    // default html file
    let startHtmlFile = 'test/flpSandbox.html';
    if (scripts) {
        // parse package.json and try to find start file for fiori run command
        Object.entries(scripts).forEach(([key, value]) => {
            const match = value?.match(/fiori run/);
            if (match && key === 'start') {
                const scriptParts = value?.split(' ');
                // search for --open argument
                const openIndex =
                    scriptParts?.indexOf(Arguments.Open) !== -1
                        ? scriptParts?.indexOf(Arguments.Open)
                        : scriptParts.indexOf('-o');
                if (openIndex !== undefined && openIndex !== -1 && scriptParts) {
                    startHtmlFile = scriptParts[openIndex + 1];
                }
            }
        });
    }
    // --open could be specified without a value
    return (startHtmlFile ?? '').replace(/["']/g, '');
}

/**
 * Try to find out default values for the configuration for a given project root.
 *
 * @param projectRoot - root of the project, where package.json is.
 * @param options - optional options.
 * @param options.logger - optional, the logger instance.
 * @returns default configuration options.
 */
export async function getDefaultLaunchConfigOptionsForProject(
    projectRoot: string,
    options?: { logger?: Logger }
): Promise<FioriOptions> {
    const logger = options?.logger;
    let name = '';
    let ui5Version = '';
    let startFile;
    let backendConfigs;
    let oDataVersion; // 4.0 or 2.0
    const visible = true;
    try {
        const manifestPath = join(projectRoot, DirName.Webapp, FileName.Manifest);
        const manifestContent = parse(await fs.readFile(manifestPath, { encoding: 'utf8' })) as Manifest;
        oDataVersion = manifestContent['sap.app']?.dataSources?.mainService.settings?.odataVersion as ODataVersion;
        name = `Launch Fiori app: ${basename(projectRoot)}`;
        ui5Version = 'latest'; // reactivate code to find ui5 version in project-access
        startFile = await getStartFileFromPackageFile(projectRoot);
        const ui5YamlConfig = await readUi5Yaml(projectRoot, FileName.Ui5Yaml);
        // read backend configurations from ui5.yaml
        backendConfigs =
            ui5YamlConfig.findCustomMiddleware<FioriToolsProxyConfig>('fiori-tools-proxy')?.configuration.backend;
    } catch (error) {
        logger?.error(`Error while getting the default configuration for project '${projectRoot}'`);
    }
    return {
        name,
        projectRoot,
        oDataVersion,
        ui5Version,
        startFile,
        backendConfigs,
        visible
    };
}
