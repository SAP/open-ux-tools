import { t } from '../i18n';
import type { CapRuntime } from '@sap-ux/odata-service-inquirer';

/**
 * Returns the url to the specified cap app as served by `cds serve` or `cds watch`.
 *
 * @param capType The type of CAP runtime used in the application (e.g., 'Java' or 'Node.js').
 * @param projectName The project's name, which is the module name.
 * @param appId If appId is provided, it will be used to open the application instead of the project name. This option is available for use with npm workspaces.
 * @returns The URL for launching the project.
 */
function getCapUrl(capType: CapRuntime, projectName: string, appId?: string): string {
    const projectPath = appId ?? projectName + '/webapp';
    if (capType === 'Java') {
        // For Java projects
        return `http://localhost:8080/${projectName}/webapp/index.html`;
    } else {
        // For Node.js projects or when capType is undefined
        return `http://localhost:4004/${projectPath}/index.html`;
    }
}

/**
 * Generates a launch text for the launching of applications.
 *
 * @param capType The type of CAP runtime used in the application will be provided for CAP applications.
 * @param projectName The project's name, which is the module name.
 * @param appId If appId is provided, it will be used to open the application instead of the project name. This option is available for use with npm workspaces.
 * @returns The launch text for the application.
 */
export function getAppLaunchText(capType: CapRuntime, projectName: string, appId?: string): string {
    // Determine the Maven command if the project is a Java project
    const mvnCommand = capType === 'Java' ? ' (```mvn spring-boot:run```)' : '';
    const capUrl = getCapUrl(capType, projectName, appId);

    // Return launch text
    return `${t('launchCapText', { mvnCommand, capUrl })}`;
}
