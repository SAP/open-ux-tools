import { isAppStudio } from '@sap-ux/btp-utils';

import { DeployConfig, DeployConfigAnswers, InputChoice } from '../../types';

/**
 * Generates a deployment configuration for UI5 applications based on user input.
 *
 * @param {boolean} isCloudProject - Flag indicating whether the project is a cloud project.
 * @param {DeployConfigAnswers} answers - User provided answers containing deployment details such as repository name,
 *                                        package information, and transport request details.
 * @returns {DeployConfig | undefined} A deployment configuration object if conditions are met; otherwise, undefined.
 *
 * The deployment configuration includes:
 * - `name`: Name of the ABAP repository.
 * - `description`: Description for the deployment.
 * - `package`: ABAP package name, either entered manually or selected from autocomplete suggestions.
 * - `transport`: ABAP transport request, either entered manually or selected from a list.
 *
 * Note: The configuration is only returned if the project is a cloud project and the environment is SAP Business Application Studio.
 */
export function getUI5DeployConfig(isCloudProject: boolean, answers: DeployConfigAnswers): DeployConfig | undefined {
    // TODO: Currently deploy config is only available in BAS
    if (isCloudProject && isAppStudio()) {
        return {
            name: answers.abapRepository,
            description: answers.deployConfigDescription,
            package:
                (answers.packageInputChoice === InputChoice.ENTER_MANUALLY
                    ? answers?.packageManual
                    : answers?.packageAutocomplete) || '',
            transport:
                answers.transportInputChoice === InputChoice.ENTER_MANUALLY
                    ? answers?.transportManual
                    : answers?.transportFromList
        };
    }
}
