import { getSubGenPrompts, getDeployTargetQuestion } from '../prompts';
import type { AbapDeployConfigAnswersInternal } from '@sap-ux/abap-deploy-config-sub-generator';
import type { ApiHubConfig, CfDeployConfigAnswers } from '@sap-ux/cf-deploy-config-sub-generator';
import type { Answers } from 'inquirer';
import type { Target, DeployConfigOptions, DeployConfigSubGenPromptOptions } from '../types';
import type { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import type { Editor } from 'mem-fs-editor';
import type { GeneratorOptions } from 'yeoman-generator';

/**
 * Determines the target deployment and runs all prompting if required.
 *
 * @param fs - instance of fs
 * @param options - deploy config options
 * @param prompt - yeoman prompt function
 * @param promptOpts - options for prompting
 * @param promptOpts.launchDeployConfigAsSubGenerator - whether the generator is launched as a sub generator
 * @param promptOpts.launchStandaloneFromYui - whether the generator is launched standalone from YUI
 * @param promptOpts.promptOptions - extension prompt options
 * @param promptOpts.supportedTargets - supported deployment targets
 * @param promptOpts.backendConfig - backend configuration
 * @param promptOpts.cfDestination - CF destination
 * @param promptOpts.isCap - whether the project is a CAP project
 * @param promptOpts.apiHubConfig - API Hub configuration
 * @param promptOpts.isLibrary - whether the project is a library
 * @param targetDeployment - target deployment
 * @returns - target deployment CF | ABAP and answers
 */
export async function promptDeployConfigQuestions(
    fs: Editor,
    options: DeployConfigOptions,
    prompt: GeneratorOptions['prompt'],
    {
        launchDeployConfigAsSubGenerator,
        launchStandaloneFromYui,
        promptOptions,
        supportedTargets,
        backendConfig,
        cfDestination,
        isCap,
        apiHubConfig,
        isLibrary
    }: {
        launchDeployConfigAsSubGenerator: boolean;
        launchStandaloneFromYui: boolean;
        promptOptions?: DeployConfigSubGenPromptOptions;
        supportedTargets: Target[];
        backendConfig: FioriToolsProxyConfigBackend;
        cfDestination: string;
        isCap: boolean;
        apiHubConfig: ApiHubConfig;
        isLibrary: boolean;
    },
    targetDeployment?: string
): Promise<{
    target?: string;
    answers?: AbapDeployConfigAnswersInternal | CfDeployConfigAnswers;
}> {
    let answers: AbapDeployConfigAnswersInternal | CfDeployConfigAnswers = {};

    if (launchDeployConfigAsSubGenerator) {
        const { questions, abapAnswers } = await getSubGenPrompts(
            fs,
            options,
            {
                launchDeployConfigAsSubGenerator,
                launchStandaloneFromYui,
                promptOptions,
                supportedTargets,
                backendConfig,
                cfDestination,
                isCap,
                apiHubConfig,
                isLibrary
            },
            targetDeployment
        );
        const subGenAnswers = await prompt(questions);
        Object.assign(answers, subGenAnswers, abapAnswers);
    } else {
        answers = await prompt(getDeployTargetQuestion([...supportedTargets], options.projectRoot));
    }
    const target = supportedTargets.find(
        (t) => t.name === (answers as Answers)?.targetName || t.name === targetDeployment
    )?.name;

    return { target, answers };
}
