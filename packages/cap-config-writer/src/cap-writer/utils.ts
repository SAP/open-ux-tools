import { t } from '../i18n';
import type { CapRuntime } from '@sap-ux/odata-service-inquirer';

/**
 * Generates a launch text for the launching of applications.
 *
 * @param capType The type of CAP runtime used in the application will be provided for CAP applications.
 * @param projectName The project's name, which is the module name.
 * @param appId If appId is provided, it will be used to open the application instead of the project name. This option is available for use with npm workspaces.
 * @returns The launch text for the application.
 */
export function getLaunchText(capType: CapRuntime | undefined, projectName: string, appId?: string): string {
    function getCapUrl(): string {
        const project = appId ?? projectName + '/webapp';
        if (capType === 'Java') {
            return `http://localhost:8080/${projectName}/webapp/index.html`;
        } else if (capType === undefined || capType === 'Node.js') {
            return `http://localhost:4004/${project}/index.html`;
        }
        return '';
    }

    let mvnCommand = '';
    if (capType === 'Java') {
        mvnCommand = ' (```mvn spring-boot:run```)';
    }
    const capUrl = getCapUrl();
    return `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl })}`;
}
