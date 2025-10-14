import { extendWithOptions, withCondition } from '@sap-ux/inquirer-common';
import { join } from 'node:path';
import { t } from '../utils';
import { DeploymentGenerator, showOverwriteQuestion, TargetName } from '@sap-ux/deploy-config-generator-shared';
import { getAbapQuestions, indexHtmlExists } from '@sap-ux/abap-deploy-config-sub-generator';
import { getCFQuestions } from '@sap-ux/cf-deploy-config-sub-generator';
import { FileName } from '@sap-ux/project-access';
import { getDeployTargetQuestion } from './deploy-target';
import type { CommonPromptOptions, YUIQuestion } from '@sap-ux/inquirer-common';
import type { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import type { Editor } from 'mem-fs-editor';
import type {
    ApiHubConfig,
    CfDeployConfigPromptOptions,
    CfDeployConfigQuestions
} from '@sap-ux/cf-deploy-config-sub-generator';
import type {
    AbapDeployConfigAnswersInternal,
    AbapDeployConfigPromptOptions,
    AbapDeployConfigQuestion
} from '@sap-ux/abap-deploy-config-sub-generator';
import type { Answers, Question } from 'inquirer';
import type { DeployConfigOptions, DeployConfigSubGenPromptOptions, Target } from '../types';

/**
 * Retrieves the combined sub generator prompts.
 *
 * @param fs - instance of fs
 * @param options - deploy config options
 * @param promptOpts - options for prompts
 * @param promptOpts.launchDeployConfigAsSubGenerator - whether the generator is launched as a sub generator
 * @param promptOpts.launchStandaloneFromYui - whether the generator is launched standalone from YUI
 * @param promptOpts.promptOptions - sub gen prompt options
 * @param promptOpts.supportedTargets - supported deployment targets
 * @param promptOpts.backendConfig - backend configuration
 * @param promptOpts.cfDestination - CF destination
 * @param promptOpts.isCap - whether the project is a CAP project
 * @param promptOpts.apiHubConfig - API Hub configuration
 * @param promptOpts.isLibrary - whether the project is a library
 * @param targetDeployment - target deployment
 * @returns - deployment configuration answers
 */
export async function getSubGenPrompts(
    fs: Editor,
    options: DeployConfigOptions,
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
): Promise<{ questions: Question[]; abapAnswers: Partial<AbapDeployConfigAnswersInternal> }> {
    DeploymentGenerator.logger?.debug(t('debug.loadingPrompts'));
    const configExists = fs.exists(join(options.appRootPath, options.config || FileName.UI5DeployYaml));
    const showOverwrite = showOverwriteQuestion(
        configExists,
        launchDeployConfigAsSubGenerator,
        launchStandaloneFromYui,
        options.overwrite
    );
    const indexGenerationAllowed =
        !isLibrary && launchStandaloneFromYui && !(await indexHtmlExists(fs, options.appRootPath));

    let abapPrompts: AbapDeployConfigQuestion[] = [];
    let abapAnswers: Partial<AbapDeployConfigAnswersInternal> = {};

    // ABAP prompts
    if (!targetDeployment || targetDeployment === TargetName.ABAP) {
        ({ prompts: abapPrompts, answers: abapAnswers } = await getAbapQuestions({
            appRootPath: options.appRootPath,
            connectedSystem: options.connectedSystem,
            backendConfig,
            configFile: options.config,
            indexGenerationAllowed,
            showOverwriteQuestion: showOverwrite,
            promptOptions: options?.subGenPromptOptions as AbapDeployConfigPromptOptions,
            logger: DeploymentGenerator.logger
        }));
    }

    // CF prompts
    let cfPrompts: CfDeployConfigQuestions[] = [];
    if (!targetDeployment || targetDeployment === TargetName.CF) {
        cfPrompts = await getCFQuestions({
            projectRoot: options.projectRoot,
            isAbapDirectServiceBinding: options.isAbapDirectServiceBinding,
            cfDestination: cfDestination,
            isCap: isCap,
            addOverwrite: showOverwrite,
            apiHubConfig: apiHubConfig,
            promptOptions: options?.subGenPromptOptions as CfDeployConfigPromptOptions
        });
    }

    // Combine all prompts
    let questions: Question[] = [];
    if (!targetDeployment) {
        questions = combineAllPrompts(options.projectRoot, {
            supportedTargets,
            abapPrompts,
            cfPrompts,
            promptOptions
        });
    } else {
        questions = targetDeployment === TargetName.ABAP ? (abapPrompts as Question[]) : (cfPrompts as Question[]);
    }

    return { questions, abapAnswers: abapAnswers };
}

/**
 * Merges all prompts for deployment configuration.
 *
 * @param projectRoot - the project root path
 * @param opts - the prompt opts for the deployment configuration prompts
 * @param opts.supportedTargets - the support deployment targets
 * @param opts.abapPrompts - abap specific prompts
 * @param opts.cfPrompts - cf specific prompts
 * @param opts.promptOptions - sub gen prompt options
 * @returns - all the different prompts combined
 */
function combineAllPrompts(
    projectRoot: string,
    {
        supportedTargets,
        abapPrompts,
        cfPrompts,
        promptOptions
    }: {
        supportedTargets: Target[];
        abapPrompts: AbapDeployConfigQuestion[];
        cfPrompts: CfDeployConfigQuestions[];
        promptOptions?: DeployConfigSubGenPromptOptions;
    }
): Question[] {
    const questions = getDeployTargetQuestion(supportedTargets, projectRoot);
    questions.push(
        ...withCondition(abapPrompts as Question[], (answers: Answers) => answers.targetName === TargetName.ABAP)
    );
    questions.push(...withCondition(cfPrompts, (answers: Answers) => answers.targetName === TargetName.CF));

    return promptOptions
        ? extendWithOptions(questions as YUIQuestion[], promptOptions as Record<string, CommonPromptOptions>)
        : questions;
}
