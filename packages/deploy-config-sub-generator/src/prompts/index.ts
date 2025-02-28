import { AbapDeployConfigAnswersInternal } from '@sap-ux/abap-deploy-config-sub-generator';
import { ApiHubConfig, CfDeployConfigAnswers } from '@sap-ux/cf-deploy-config-sub-generator';
import { Answers } from 'inquirer';
import { getConfirmConfigUpdatePrompts } from './config-update';
import { Target, DeployConfigOptions } from '../types';
import { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import { Editor } from 'mem-fs-editor';
import { GeneratorOptions } from 'yeoman-generator';
import { promptSubGenerators } from './sub-gen';
import { getDeployTargetPrompts } from './deploy-target';

/**
 * Determines the target deployment and runs all prompting if required.
 *
 * @returns - target deployment CF | ABAP and answers
 */
export async function promptDeployConfigQuestions(
    fs: Editor,
    options: DeployConfigOptions,
    prompt: GeneratorOptions['prompt'],
    launchDeployConfigAsSubGenerator: boolean,
    launchStandaloneFromYui: boolean,
    supportedTargets: Target[],
    {
        backendConfig,
        cfDestination,
        isCap,
        apiHubConfig,
        isLibrary
    }: {
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
    let target: string | undefined;
    let answers: AbapDeployConfigAnswersInternal | CfDeployConfigAnswers = {};

    const configUpdatePrompts = getConfirmConfigUpdatePrompts(
        launchStandaloneFromYui,
        options.data?.additionalPrompts?.confirmConfigUpdate
    );

    if (launchDeployConfigAsSubGenerator) {
        answers = await promptSubGenerators(
            fs,
            options,
            prompt,
            launchDeployConfigAsSubGenerator,
            launchStandaloneFromYui,
            configUpdatePrompts,
            supportedTargets,
            {
                backendConfig,
                cfDestination,
                isCap,
                apiHubConfig,
                isLibrary
            }
        );
    } else {
        answers = await prompt(getDeployTargetPrompts([...supportedTargets], configUpdatePrompts, options.projectRoot));
    }

    target = supportedTargets.find((t) => t.name === (answers as Answers)?.targetName)?.name;

    return { target, answers };
}
