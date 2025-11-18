import { Severity } from '@sap-devx/yeoman-ui-types';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { CheckBoxQuestion, ConfirmQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { Logger } from '@sap-ux/logger';
import {
    getSystemSelectionQuestions,
    OdataServiceAnswers,
    promptNames as servicePromptNames
} from '@sap-ux/odata-service-inquirer';
import { createApplicationAccess } from '@sap-ux/project-access';
import { Answers, CheckboxChoiceOptions, InputQuestion, PromptFunction, Question } from 'inquirer';
import { ODataDownloadGenerator } from './odataDownloadGenerator';
import type { AppConfig, Entity } from './types';
import { getAppConfig, getSystemNameFromStore } from './utils';
import { getData } from './prompt-helpers';

export const promptNames = {
    relatedEntitySelection: 'relatedEntitySelection',
    confirmDownload: 'confirmDownload'
};

export interface SelectedEntityAnswer extends Answers {
    fullPath: string;
    entity: Entity;
    choiceId: string; // Used for reselection (fix for all cleared when key is entered)
}
// Temp workaround for checkbox selection issue:
export type SelectedEntityAnswerAsJSONString = string & Answers;

function createRelatedEntityChoices(
    relatedEntities: Map<Entity, Entity[]>
): CheckboxChoiceOptions<SelectedEntityAnswerAsJSONString>[] {
    const choices: CheckboxChoiceOptions[] = [];
    relatedEntities.forEach((entities, parentEntity) => {
        entities.forEach((entity) => {
            // fix issue with prompt values containing `name
            const entityClone = {
                entityPath: entity.entityPath,
                entitySetName: entity.entitySetName
            };
            const choiceId = `${parentEntity.entitySetName} (${parentEntity.entityPath}) > ${entity.entitySetName} (${entity.entityPath})`;
            choices.push({
                name: choiceId,
                value: JSON.stringify({
                    // Nasty workaround for checkbox selection issue: https://github.com/SAP/inquirer-gui/issues/787
                    fullPath: `${parentEntity.entityPath}/${entity.entityPath}`,
                    entity: entityClone
                })
            });
        });
    });
    return choices;
}

/**
 *
 *
 * @param mainEntity
 */
export async function getODataDownloaderPrompts(): Promise<{
    questions: Question[];
    answers: { application: AppConfig; odataQueryResult: { odata: object | undefined } };
}> {
    const selectSourceQuestions: Question[] = [];
    let appConfig: AppConfig = {
        appAccess: undefined,
        referencedEntities: undefined,
        servicePath: undefined,
        backendConfig: undefined,
        systemName: { value: undefined }
    };
    let servicePaths: string[] = [];

    let keyPrompts: InputQuestion[] = [];

    const appSelectionQuestion = {
        type: 'input',
        guiType: 'folder-browser',
        name: 'appSelection',
        message: 'Select an application as data download target',
        default: (answers: Answers) => answers.appSelection || appConfig.appAccess?.app.appRoot,
        guiOptions: { mandatory: true, breadcrumb: `Selected App` },
        validate: async (appPath: string, answers: Answers): Promise<string | boolean> => {
            // todo: validate required files presence...deleting the metadata file crashes the gen.
            if (!appPath) {
                return false;
            }
            // Already set, adding prompts will retrigger validation
            if (appPath === appConfig.appAccess?.app.appRoot) {
                return true;
            }
            // validate application exists at path
            appConfig.appAccess = await createApplicationAccess(appPath);
            // Update the app config with entity data from the manifest and main service metadata
            Object.assign(appConfig, await getAppConfig(appConfig.appAccess));
            servicePaths.push(appConfig?.servicePath ?? '');

            // appAnswer.referencedEntities = appConfig?.referencedEntities;
            // todo: update odata-service-inquirer to support service path in additiona to service id
            //appAnswer.servicePaths.push(appConfig?.servicePath ?? '');
            //appAnswer.backendConfig = appConfig?.backendConfig;
            if (appConfig.backendConfig && appConfig.systemName) {
                appConfig.systemName.value =
                    appConfig.backendConfig?.destination ??
                    (await getSystemNameFromStore(appConfig.backendConfig.url, appConfig.backendConfig?.client));
            }
            return true;
        }
    } as InputQuestion;
    const systemSelectionQuestions = await getSystemSelectionQuestions(
        {
            datasourceType: {
                includeNone: false
            },
            systemSelection: {
                includeCloudFoundryAbapEnvChoice: false,
                defaultChoice: appConfig.systemName
            },
            serviceSelection: {
                serviceFilter: servicePaths
            }
        },
        getHostEnvironment() !== hostEnvironment.cli,
        ODataDownloadGenerator.logger as Logger
    );
    // Additional manually selected nav prop entittes
    let relatedEntityChoices: CheckboxChoiceOptions<SelectedEntityAnswerAsJSONString>[] = [];
    let previousServicePath: string | undefined;
    const relatedEntitySelectionQuestion: CheckBoxQuestion = {
        when: () => {
            // todo: reset when service changed
            if (systemSelectionQuestions.answers.servicePath !== previousServicePath) {
                previousServicePath = systemSelectionQuestions.answers.servicePath;
                if (relatedEntityChoices.length === 0) {
                    relatedEntityChoices = [];
                    relatedEntityChoices.push(
                        ...(appConfig.referencedEntities?.navPropEntities
                            ? createRelatedEntityChoices(appConfig.referencedEntities?.navPropEntities)
                            : [])
                    );
                }
            }
            return relatedEntityChoices.length > 0;
        },
        name: promptNames.relatedEntitySelection,
        type: 'checkbox',
        guiOptions: {
            applyDefaultWhenDirty: true
        },
        message: 'Select additional entities for data download',
        choices: () => relatedEntityChoices,
        default: (previousAnswers: Answers) => {
            const defaults = (previousAnswers?.[promptNames.relatedEntitySelection] as SelectedEntityAnswer[])?.map(
                (entityAnswer) => entityAnswer
            );
            return defaults;
        }
    };

    // Generate the max size of key parts allowed
    keyPrompts = getKeyPrompts(3, appConfig);
    let odataQueryResult = {
        odata: undefined
    };

    selectSourceQuestions.push(
        appSelectionQuestion,
        ...(systemSelectionQuestions.prompts as Question[]),
        ...keyPrompts,
        relatedEntitySelectionQuestion,
        getConfirmDownloadPrompt(systemSelectionQuestions.answers, appConfig, odataQueryResult)
    );
    return {
        questions: selectSourceQuestions,
        answers: { application: appConfig, odataQueryResult }
    };
}

function getKeyPrompts(size: number, appInfo: AppConfig): InputQuestion[] {
    const questions: InputQuestion[] = [];

    const getEntityKeyInputPrompt = (keypart: number) =>
        ({
            when: () => {
                return !!appInfo.referencedEntities?.listEntity.semanticKeys[keypart]?.name;
            },
            name: `entityKeyIdx:${keypart}`,
            message: () => `Enter value for: ${appInfo.referencedEntities?.listEntity.semanticKeys[keypart]?.name}`,
            type:
                appInfo.referencedEntities?.listEntity.semanticKeys?.[keypart]?.type === 'Edm.Boolean'
                    ? 'confirm'
                    : 'input',
            validate: (keyValue: string) => {
                // todo: validate the input based on the key type
                if (keyValue && appInfo.referencedEntities?.listEntity.semanticKeys[keypart]) {
                    appInfo.referencedEntities.listEntity.semanticKeys[keypart].value = keyValue;
                }
                return true;
            }
        } as InputQuestion);
    // Generate a prompt for each key we need input for
    for (let i = 0; i < size; i++) {
        questions.push(getEntityKeyInputPrompt(i));
    }

    /*  Object.entries(entityKey).forEach(([entityKeyName, entityKeyValue]) => {
        questions.push(getEntityKeyInputPrompt(entityKeyName, entityKeyValue));
    });
    */
    return questions;
}

function getConfirmDownloadPrompt(
    odataServiceAnswers: Partial<OdataServiceAnswers>,
    appConfig: AppConfig,
    odataQueryResult: { odata: undefined | object }
): Question {
    return {
        when: () => {
            return !!odataServiceAnswers.metadata;
        },
        name: promptNames.confirmDownload,
        type: 'confirm',
        message: 'Confirm files to be generated',
        labelTrue: 'Download and create files (will replace existing contents)',
        labelFalse: 'Cancel and exit',
        default: false,
        guiOptions: {
            mandatory: true
        },
        validate: async (download, answers: Answers) => {
            if (download) {
                const result = await getData(odataServiceAnswers, appConfig, answers);
                if (typeof result === 'string') {
                    return result;
                }
                odataQueryResult.odata = result;
            }
            return true;
        },
        additionalMessages: (confirmDownload, answers) => {
            // All entities to be created
            const allEntities = [
                appConfig.referencedEntities?.listEntity.entitySetName,
                ...(appConfig.referencedEntities?.pageObjectEntities?.map((entity) => entity.entitySetName) ?? []),
                ...((answers?.[promptNames.relatedEntitySelection] as SelectedEntityAnswerAsJSONString[])?.map(
                    (selEntityAnswer) => JSON.parse(selEntityAnswer).entity.entitySetName // silly workaround for YUI checkbox issue
                ) ?? [])
            ];

            return {
                message: `The following entity files will be created: ${allEntities.join(', ')}`,
                severity: Severity.information
            };
        }
    } as ConfirmQuestion;
}
