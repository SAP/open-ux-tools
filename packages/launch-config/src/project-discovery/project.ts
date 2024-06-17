import { basename, join } from 'path';
import type { FioriOptions } from '@sap/ux-launch-config-types';
import type { Package } from '@sap-ux/project-access';
import { FileName, createProjectProvider, getUi5CustomMiddleware, readJSON } from '@sap-ux/project-access';
import type { FioriElementsVersion } from '@sap-ux/ui5-info';

/**
 * Find out starting HTML file for project using package.json.
 *
 * @param projectRoot - root of the project, where package.json is.
 * @returns file to start launch configuration with.
 */
async function getStartFileFromPackageFile(projectRoot: string): Promise<string | undefined> {
    const pckJsonPath = join(projectRoot, FileName.Package);
    const scripts = (await readJSON<Package>(pckJsonPath)).scripts;
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
                    scriptParts?.indexOf('--open') !== -1 ? scriptParts?.indexOf('--open') : scriptParts.indexOf('-o');
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
 * @returns default configuration options.
 */
export async function getDefaultLaunchConfigOptionsForProject(projectRoot: string): Promise<FioriOptions> {
    let name = '';
    let ui5Version = '';
    let startFile;
    let backendConfigs;
    let projectVersion; // V4 or V2
    const visible = true;
    try {
        const projectProvider = await createProjectProvider(projectRoot);
        projectVersion = (await projectProvider.getVersion()) as unknown as FioriElementsVersion;
        name = `Launch Fiori app: ${basename(projectProvider.project.root)}`;
        ui5Version = 'latest'; // reactivate code to find ui5 version in project-access
        startFile = await getStartFileFromPackageFile(projectRoot);
        backendConfigs = (await getUi5CustomMiddleware(projectRoot)).configuration.backend;
    } catch (error) {
        console.error(`Error while getting the default configuration for project '${projectRoot}'`, error);
    }
    return {
        name,
        projectRoot,
        projectVersion,
        ui5Version,
        startFile,
        backendConfigs,
        visible
    };
}
