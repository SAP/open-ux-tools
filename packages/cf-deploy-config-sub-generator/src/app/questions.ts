import { isAppStudio } from '@sap-ux/btp-utils';
import { DeploymentGenerator } from '@sap-ux/deploy-config-generator-shared';
import { getMtaPath } from '@sap-ux/project-access';
import { getPrompts, promptNames } from '@sap-ux/cf-deploy-config-inquirer';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { destinationQuestionDefaultOption, getCFChoices } from './utils';
import { t } from '../utils';
import { ApiHubConfig, useAbapDirectServiceBinding } from '@sap-ux/cf-deploy-config-writer';
import type { CfDeployConfigPromptOptions, CfDeployConfigQuestions } from '@sap-ux/cf-deploy-config-inquirer';

/**
 * Fetches the Cloud Foundry deployment configuration questions.
 *
 * @param options - the options required for retrieving the prompts.
 * @param options.projectRoot - the root path of the project.
 * @param options.cfDestination - the Cloud Foundry destination.
 * @param options.isCap - whether the project is a CAP project.
 * @param options.addOverwrite - whether to add the overwrite prompt.
 * @param options.apiHubConfig - the API Hub configuration.
 * @returns the cf deploy config questions.
 */
export async function getCFQuestions({
    projectRoot,
    cfDestination,
    isCap,
    addOverwrite,
    apiHubConfig
}: {
    projectRoot: string;
    cfDestination: string;
    isCap: boolean;
    addOverwrite: boolean;
    apiHubConfig?: ApiHubConfig;
}): Promise<CfDeployConfigQuestions[]> {
    const isBAS = isAppStudio();
    const isAbapDirectServiceBinding = await useAbapDirectServiceBinding(projectRoot, true);
    const mtaYamlExists = !!(await getMtaPath(projectRoot));
    const cfChoices = await getCFChoices({
        projectRoot,
        isCap,
        cfDestination,
        isAbapDirectServiceBinding,
        apiHubConfigType: apiHubConfig?.apiHubType
    });

    const options: CfDeployConfigPromptOptions = {
        [promptNames.destinationName]: {
            defaultValue: destinationQuestionDefaultOption(isAbapDirectServiceBinding, isBAS, cfDestination),
            hint: !!isAbapDirectServiceBinding,
            useAutocomplete: getHostEnvironment() === hostEnvironment.cli,
            addBTPDestinationList: isBAS ? !isAbapDirectServiceBinding : false,
            additionalChoiceList: cfChoices
        },
        [promptNames.addManagedAppRouter]: !mtaYamlExists && !isCap,
        [promptNames.overwrite]: addOverwrite
    };

    DeploymentGenerator.logger?.debug(t('cfGen.debug.promptOptions', { options: JSON.stringify(options) }));
    return getPrompts(options);
}
