import { isAppStudio } from '@sap-ux/btp-utils';
import { DeployConfig, DeployConfigAnswers, InputChoice } from '../../types';

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
