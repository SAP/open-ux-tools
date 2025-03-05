import { getSubGenPrompts, getDeployTargetQuestion } from '../prompts';
import type { CommonPromptOptions } from '@sap-ux/inquirer-common';
import type { AbapDeployConfigAnswersInternal } from '@sap-ux/abap-deploy-config-sub-generator';
import type { ApiHubConfig, CfDeployConfigAnswers } from '@sap-ux/cf-deploy-config-sub-generator';
import type { Answers } from 'inquirer';
import type { Target, DeployConfigOptions } from '../types';
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
 * @param promptOpts.extensionPromptOpts - extension prompt options
 * @param promptOpts.supportedTargets - supported deployment targets
 * @param promptOpts.backendConfig - backend configuration
 * @param promptOpts.cfDestination - CF destination
 * @param promptOpts.isCap - whether the project is a CAP project
 * @param promptOpts.apiHubConfig - API Hub configuration
 * @param promptOpts.isLibrary - whether the project is a library
 * @returns - target deployment CF | ABAP and answers
 */
export async function promptDeployConfigQuestions(
    fs: Editor,
    options: DeployConfigOptions,
    prompt: GeneratorOptions['prompt'],
    {
        launchDeployConfigAsSubGenerator,
        launchStandaloneFromYui,
        extensionPromptOpts,
        supportedTargets,
        backendConfig,
        cfDestination,
        isCap,
        apiHubConfig,
        isLibrary
    }: {
        launchDeployConfigAsSubGenerator: boolean;
        launchStandaloneFromYui: boolean;
        extensionPromptOpts?: Record<string, CommonPromptOptions>;
        supportedTargets: Target[];
        backendConfig: FioriToolsProxyConfigBackend;
        cfDestination: string;
        isCap: boolean;
        apiHubConfig: ApiHubConfig;
        isLibrary: boolean;
    }
): Promise<{
    target?: string;
    answers?: AbapDeployConfigAnswersInternal | CfDeployConfigAnswers;
}> {
    let answers: AbapDeployConfigAnswersInternal | CfDeployConfigAnswers = {};

    if (launchDeployConfigAsSubGenerator) {
        const { questions, abapAnswers } = await getSubGenPrompts(fs, options, {
            launchDeployConfigAsSubGenerator,
            launchStandaloneFromYui,
            extensionPromptOpts,
            supportedTargets,
            backendConfig,
            cfDestination,
            isCap,
            apiHubConfig,
            isLibrary
        });
        const subGenAnswers = await prompt(questions);
        Object.assign(answers, subGenAnswers, abapAnswers);
    } else {
        answers = await prompt(getDeployTargetQuestion([...supportedTargets], options.projectRoot));
    }
    const target = supportedTargets.find((t) => t.name === (answers as Answers)?.targetName)?.name;

    return { target, answers };
}
