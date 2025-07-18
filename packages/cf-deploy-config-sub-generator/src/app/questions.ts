import { isAppStudio } from '@sap-ux/btp-utils';
import { DeploymentGenerator, getConfirmMtaContinuePrompt } from '@sap-ux/deploy-config-generator-shared';
import { getMtaPath } from '@sap-ux/project-access';
import {
    appRouterPromptNames,
    type CfAppRouterDeployConfigPromptOptions,
    type CfAppRouterDeployConfigQuestions,
    type CfDeployConfigQuestions,
    type CfDeployConfigPromptOptions,
    getAppRouterPrompts,
    getPrompts,
    promptNames
} from '@sap-ux/cf-deploy-config-inquirer';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { destinationQuestionDefaultOption, getCFChoices } from './utils';
import { t } from '../utils';
import type { ApiHubConfig } from '@sap-ux/cf-deploy-config-writer';
import type { Answers, Question } from 'inquirer';
import { withCondition } from '@sap-ux/inquirer-common';
import type { Logger } from '@sap-ux/logger';

/**
 * Fetches the Cloud Foundry deployment configuration questions.
 *
 * @param options - the options required for retrieving the prompts.
 * @param options.projectRoot - the root path of the project.
 * @param options.isAbapDirectServiceBinding - whether the destination is an ABAP direct service binding.
 * @param options.cfDestination - the Cloud Foundry destination.
 * @param options.isCap - whether the project is a CAP project.
 * @param options.addOverwrite - whether to add the overwrite prompt.
 * @param options.apiHubConfig - the API Hub configuration.
 * @param options.promptOptions - additional prompt options.
 * @returns the cf deploy config questions.
 */
export async function getCFQuestions({
    projectRoot,
    isAbapDirectServiceBinding,
    cfDestination,
    isCap,
    addOverwrite,
    apiHubConfig,
    promptOptions
}: {
    projectRoot: string;
    isAbapDirectServiceBinding: boolean;
    cfDestination: string;
    isCap: boolean;
    addOverwrite: boolean;
    apiHubConfig?: ApiHubConfig;
    promptOptions?: CfDeployConfigPromptOptions;
}): Promise<CfDeployConfigQuestions[]> {
    const isBAS = isAppStudio();
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
            additionalChoiceList: cfChoices,
            ...promptOptions?.destinationName
        },
        [promptNames.addManagedAppRouter]: { hide: true, ...promptOptions?.addManagedAppRouter },
        [promptNames.routerType]: { hide: mtaYamlExists || isCap, ...promptOptions?.routerType },
        [promptNames.overwrite]: { hide: !addOverwrite, ...promptOptions?.overwrite }
    };

    DeploymentGenerator.logger?.debug(t('cfGen.debug.promptOptions', { options: JSON.stringify(options) }));
    return getPrompts(options, DeploymentGenerator.logger as unknown as Logger);
}

/**
 * Retrieve the CF Approuter questions, certain prompts are restricted to support CAP project.
 *
 * @param options - the options required for retrieving the prompts.
 * @param options.projectRoot - the root path of the project.
 * @returns the cf approuter config questions.
 */
async function getCFApprouterQuestionsForCap({
    projectRoot
}: {
    projectRoot: string;
}): Promise<CfAppRouterDeployConfigQuestions[]> {
    // Disable some prompts, not required for CAP flow
    const appRouterPromptOptions: CfAppRouterDeployConfigPromptOptions = {
        [appRouterPromptNames.mtaPath]: projectRoot,
        [appRouterPromptNames.mtaId]: false, // CDS Flow will auto generate this based on the package.json name property
        [appRouterPromptNames.mtaDescription]: false,
        [appRouterPromptNames.mtaVersion]: false,
        [appRouterPromptNames.routerType]: true,
        [appRouterPromptNames.addConnectivityService]: true,
        [appRouterPromptNames.addABAPServiceBinding]: false
    };

    return getAppRouterPrompts(appRouterPromptOptions);
}

/**
 * Generate CF Approuter questions for CAP project with an existing HTML5 app and missing MTA configuration.
 *
 * @param options - the options required for retrieving the prompts.
 * @param options.projectRoot - the root path of the project.
 * @returns the cf approuter config questions, restricting prompts being shown to the user
 */
export async function getCAPMTAQuestions({ projectRoot }: { projectRoot: string }): Promise<Question[]> {
    // If launched as root generator, add a prompt to allow user decide if they want to add an MTA config
    let questions = (await getCFApprouterQuestionsForCap({
        projectRoot
    })) as Question[];
    questions = withCondition(questions, (answers: Answers) => answers.addCapMtaContinue === true);
    questions.unshift(...getConfirmMtaContinuePrompt());
    return questions;
}
