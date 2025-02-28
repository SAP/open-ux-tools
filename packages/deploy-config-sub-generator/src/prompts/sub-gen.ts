import { t } from '../utils';
import type { Answers, Question } from 'inquirer';
import { withCondition } from '@sap-ux/inquirer-common';
import type { DeployConfigOptions, Target } from '../types';
import { ILogWrapper } from '@sap-ux/fiori-generator-shared';
import { DeploymentGenerator, showOverwriteQuestion, TargetName } from '@sap-ux/deploy-config-generator-shared';
import {
    AbapDeployConfigAnswersInternal,
    getAbapQuestions,
    indexHtmlExists,
    type AbapDeployConfigQuestion
} from '@sap-ux/abap-deploy-config-sub-generator';
import {
    CfDeployConfigAnswers,
    getCFQuestions,
    type ApiHubConfig,
    type CfDeployConfigQuestions
} from '@sap-ux/cf-deploy-config-sub-generator';
import { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import { FileName } from '@sap-ux/project-access';
import { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { GeneratorOptions } from 'yeoman-generator';
import { getDeployTargetQuestion } from './deploy-target';

export async function promptSubGenerators(
    fs: Editor,
    options: DeployConfigOptions,
    prompt: GeneratorOptions['prompt'],
    launchDeployConfigAsSubGenerator: boolean,
    launchStandaloneFromYui: boolean,
    configUpdatePrompts: Question[],
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
): Promise<AbapDeployConfigAnswersInternal | CfDeployConfigAnswers> {
    DeploymentGenerator.logger?.debug(t('debug.loadingPrompts'));
    const deployConfigAnswers = {} as AbapDeployConfigAnswersInternal | CfDeployConfigAnswers;

    const configExists = fs.exists(join(options.appRootPath, options.config || FileName.UI5DeployYaml));
    const showOverwrite = showOverwriteQuestion(
        configExists,
        launchDeployConfigAsSubGenerator,
        launchStandaloneFromYui,
        options.overwrite
    );

    const indexGenerationAllowed = !isLibrary && !(await indexHtmlExists(fs, options.appRootPath));

    // Combine all prompts
    const { questions: questions, abapAnswers: abapAnswers } = await getSubGenPrompts({
        options: options as DeployConfigOptions,
        supportedTargets,
        configUpdatePrompts,
        indexGenerationAllowed,
        showOverwrite,
        backendConfig: backendConfig,
        logger: DeploymentGenerator.logger,
        cfDestination: cfDestination,
        isCap: isCap,
        apiHubConfig: apiHubConfig
    });

    // Prompt and assign answers
    const answers = await prompt(questions);
    Object.assign(deployConfigAnswers, answers, abapAnswers);
    return deployConfigAnswers;
}

async function getSubGenPrompts({
    options,
    supportedTargets,
    configUpdatePrompts = [],
    indexGenerationAllowed,
    showOverwrite,
    backendConfig,
    logger,
    cfDestination,
    isCap,
    apiHubConfig
}: {
    options: DeployConfigOptions;
    supportedTargets: Target[];
    configUpdatePrompts: Question[];
    indexGenerationAllowed: boolean;
    showOverwrite: boolean;
    backendConfig: FioriToolsProxyConfigBackend;
    logger: ILogWrapper;
    cfDestination: string;
    isCap: boolean;
    apiHubConfig: ApiHubConfig;
}): Promise<{ questions: Question[]; abapAnswers: Partial<AbapDeployConfigAnswersInternal> }> {
    // ABAP prompts
    const { prompts: abapPrompts, answers: abapAnswers } = await getAbapQuestions({
        appRootPath: options.appRootPath,
        connectedSystem: options.connectedSystem,
        backendConfig,
        configFile: options.config,
        indexGenerationAllowed,
        showOverwriteQuestion: showOverwrite,
        logger
    });

    // CF prompts
    const cfPrompts = await getCFQuestions({
        projectRoot: options.projectRoot,
        isAbapDirectServiceBinding: options.isAbapDirectServiceBinding, // todo: check if this can be removed
        cfDestination: cfDestination,
        isCap: isCap,
        addOverwrite: showOverwrite,
        apiHubConfig: apiHubConfig
    });

    // Combine all prompts
    const questions = combineAllPrompts(options.projectRoot, {
        supportedTargets,
        abapPrompts,
        cfPrompts,
        configUpdatePrompts
    });

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
 * @param opts.configUpdatePrompts - confirm config update prompts
 * @returns - all the different prompts combined
 */

function combineAllPrompts(
    projectRoot: string,
    {
        supportedTargets,
        abapPrompts,
        cfPrompts,
        configUpdatePrompts = []
    }: {
        supportedTargets: Target[];
        abapPrompts: AbapDeployConfigQuestion[];
        cfPrompts: CfDeployConfigQuestions[];
        configUpdatePrompts: Question[];
    }
): Question[] {
    let questions = getDeployTargetQuestion(supportedTargets, projectRoot);
    questions.push(
        ...withCondition(abapPrompts as Question[], (answers: Answers) => answers.targetName === TargetName.ABAP)
    );
    questions.push(...withCondition(cfPrompts, (answers: Answers) => answers.targetName === TargetName.CF));
    if (configUpdatePrompts.length > 0) {
        questions = withCondition(questions, (answers: Answers) => answers.confirmConfigUpdate);
        questions.unshift(...configUpdatePrompts);
    }
    return questions;
}
