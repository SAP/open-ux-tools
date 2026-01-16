import { Severity } from '@sap-devx/yeoman-ui-types';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { type CheckBoxQuestion, type ConfirmQuestion, type InputQuestion } from '@sap-ux/inquirer-common';
import type { Logger } from '@sap-ux/logger';
import type { OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';
import { getSystemSelectionQuestions, OdataVersion } from '@sap-ux/odata-service-inquirer';
import { createApplicationAccess } from '@sap-ux/project-access';
import type { Answers, CheckboxChoiceOptions, Question } from 'inquirer';
import type { EntitySetsFlat } from './odata-query';
import { ODataDownloadGenerator } from './odataDownloadGenerator';
import { createEntityChoices, getData, getServiceDetails } from './prompt-helpers';
import type { AppConfig } from './types';
import { getEntityModel } from './utils';

export const promptNames = {
    relatedEntitySelection: 'relatedEntitySelection',
    confirmDownload: 'confirmDownload',
    updateMainServiceMetadata: 'updateMainServiceMetadata'
};

const invalidEntityKeyFilterChars = ['.'];

// Temp workaround for checkbox selection issue:
export type SelectedEntityAnswerAsJSONString = string & Answers;

export type SelectedEntityAnswer = {
    fullPath: string;
    entity: {
        entityPath: string;
        entitySetName: string;
        selected?: boolean;
    };
};

/**
 * Reset the values of the passed app config reference otherwise create a new object reference
 *
 * @param appConfig
 * @returns
 */
function resetAppConfig(appConfig?: AppConfig): AppConfig {
    if (appConfig) {
        appConfig.appAccess = undefined;
        appConfig.referencedEntities = undefined;
        appConfig.servicePath = undefined;
        if (appConfig.systemName) {
            appConfig.systemName.value = undefined;
        }
        return appConfig;
    }
    return {
        appAccess: undefined,
        referencedEntities: undefined,
        servicePath: undefined,
        systemName: { value: undefined }
    };
}

/**
 *
 */
export async function getODataDownloaderPrompts(): Promise<{
    questions: Question[];
    answers: {
        application: AppConfig;
        odataQueryResult: { odata: []; entitySetsFlat: EntitySetsFlat };
        odataServiceAnswers: Partial<OdataServiceAnswers>;
    };
}> {
    const selectSourceQuestions: Question[] = [];
    // Local state
    const appConfig: AppConfig = resetAppConfig();
    const servicePaths: string[] = [];
    let keyPrompts: InputQuestion[] = [];

    const appSelectionQuestion = {
        type: 'input',
        guiType: 'folder-browser',
        name: 'appSelection',
        message: 'Select an application as data download target',
        default: (answers: Answers) => answers.appSelection ?? appConfig.appAccess?.app.appRoot,
        guiOptions: { mandatory: true, breadcrumb: `Selected App` },
        validate: async (appPath: string): Promise<string | boolean> => {
            // todo: validate required files presence...deleting the metadata file crashes the gen.
            if (!appPath) {
                return false;
            }
            // Already set, adding prompts will retrigger validation
            if (appPath === appConfig.appAccess?.app.appRoot) {
                return true;
            }
            // Selected app has changed reset local state
            servicePaths.length = 0;
            keyPrompts.length = 0;
            resetAppConfig(appConfig);
            // validate application exists at path
            const appAccess = await createApplicationAccess(appPath);
            appConfig.appAccess = appAccess;

            const { servicePath, systemName } = await getServiceDetails(
                appAccess.app.appRoot,
                appAccess.app.services[appAccess.app.mainService ?? 'mainService']
            );

            if (servicePath) {
                appConfig.servicePath = servicePath;
                servicePaths.push(servicePath);
            }

            if (appConfig.systemName) {
                appConfig.systemName.value = systemName;
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
                defaultChoice: appConfig.systemName,
                hideNewSystem: true
            },
            serviceSelection: {
                serviceFilter: servicePaths,
                requiredOdataVersion: OdataVersion.v4
            }
        },
        getHostEnvironment() !== hostEnvironment.cli,
        ODataDownloadGenerator.logger as Logger
    );

    // Additional manually selected nav prop entittes
    let relatedEntityChoices: { choices: CheckboxChoiceOptions<SelectedEntityAnswerAsJSONString>[] } = {
        choices: []
    };
    let previousServicePath: string | undefined;

    const relatedEntitySelectionQuestion: CheckBoxQuestion = {
        when: async () => {
            // No selected service connection
            if (!systemSelectionQuestions.answers.metadata || !appConfig.referencedEntities?.listEntity) {
                return false;
            }

            if (
                systemSelectionQuestions.answers.servicePath !== previousServicePath &&
                appConfig.referencedEntities?.listEntity
            ) {
                const entityChoices = createEntityChoices(
                    appConfig.referencedEntities.listEntity,
                    appConfig.referencedEntities.pageObjectEntities
                );
                if (entityChoices) {
                    relatedEntityChoices = entityChoices;
                    previousServicePath = systemSelectionQuestions.answers.servicePath;
                }
            }
            return relatedEntityChoices.choices.length > 0;
        },
        name: promptNames.relatedEntitySelection,
        type: 'checkbox',
        guiOptions: {
            applyDefaultWhenDirty: true
        },
        message: 'Select entities for data download (pre-selected entities are referenced by the application)',
        choices: () => relatedEntityChoices.choices,
        default: (previousAnswers: Answers) => {
            let defaults: SelectedEntityAnswer[] = [];
            const previousEntitySelections = previousAnswers?.[promptNames.relatedEntitySelection];
            if (
                !previousEntitySelections ||
                (Array.isArray(previousEntitySelections) && previousEntitySelections.length === 0)
            ) {
                // Pre-select entities with default selection property
                relatedEntityChoices.choices.forEach((entityChoice) => {
                    // Parsing is a hack for https://github.com/SAP/inquirer-gui/issues/787
                    if ((JSON.parse(entityChoice.value) as SelectedEntityAnswer).entity.selected) {
                        defaults.push(entityChoice.value);
                    }
                });
            } else {
                defaults = (previousAnswers?.[promptNames.relatedEntitySelection] as SelectedEntityAnswer[])?.map(
                    (entityAnswer) => entityAnswer
                );
            }
            return defaults;
        }
    };

    // Generate the max size of key parts allowed
    keyPrompts = getKeyPrompts(3, appConfig);
    const odataQueryResult: { odata: []; entitySetsFlat: EntitySetsFlat } = {
        odata: [],
        entitySetsFlat: {}
    };

    selectSourceQuestions.push(
        appSelectionQuestion,
        ...(systemSelectionQuestions.prompts as Question[]),
        getUpdateMainServiceMetadataPrompt(systemSelectionQuestions.answers, appConfig),
        ...keyPrompts,
        relatedEntitySelectionQuestion,
        getConfirmDownloadPrompt(systemSelectionQuestions.answers, appConfig, odataQueryResult)
    );
    return {
        questions: selectSourceQuestions,
        answers: { application: appConfig, odataQueryResult, odataServiceAnswers: systemSelectionQuestions.answers }
    };
}

/**
 *
 * @param size
 * @param appConfig
 */
function getKeyPrompts(size: number, appConfig: AppConfig): InputQuestion[] {
    const questions: InputQuestion[] = [];

    const getEntityKeyInputPrompt = (keypart: number) =>
        ({
            when: async () => !!appConfig.referencedEntities?.listEntity.semanticKeys[keypart]?.name,
            name: `entityKeyIdx:${keypart}`,
            message: () => `Enter values for: ${appConfig.referencedEntities?.listEntity.semanticKeys[keypart]?.name}`,
            type:
                appConfig.referencedEntities?.listEntity.semanticKeys?.[keypart]?.type === 'Edm.Boolean'
                    ? 'confirm'
                    : 'input',
            guiOptions: {
                hint: "For range selection use '-' between values. Use commas to select non-contigous values."
            },
            validate: (keyValue: string) => {
                // todo : move to a validator
                if (invalidEntityKeyFilterChars.includes(keyValue)) {
                    return `Invalid key value contain not allowed characters: ${invalidEntityKeyFilterChars.join()}`;
                }
                // Clear key values
                if (!keyValue && appConfig.referencedEntities?.listEntity.semanticKeys[keypart]) {
                    delete appConfig.referencedEntities.listEntity.semanticKeys[keypart].value;
                }

                const filterAndParts = keyValue.split(',');
                filterAndParts.forEach((filterPart) => {
                    const filterRangeParts = filterPart.split('-');
                    if (filterRangeParts.length > 2) {
                        return "Invalid range specified, only the lowest and highest values allowed. e.g. '1-10'";
                    }
                });

                // todo: validate the input based on the key type
                if (appConfig.referencedEntities?.listEntity.semanticKeys[keypart]) {
                    appConfig.referencedEntities.listEntity.semanticKeys[keypart].value = keyValue;
                }
                return true;
            }
        }) as InputQuestion;
    // Generate a prompt for each key we need input for
    for (let i = 0; i < size; i++) {
        questions.push(getEntityKeyInputPrompt(i));
    }

    return questions;
}

/**
 *
 * @param odataServiceAnswers
 * @param appConfig
 * @param odataQueryResult
 * @param odataQueryResult.odata
 * @param odataQueryResult.entitySetsFlat
 */
function getConfirmDownloadPrompt(
    odataServiceAnswers: Partial<OdataServiceAnswers>,
    appConfig: AppConfig,
    odataQueryResult: { odata: undefined | []; entitySetsFlat: EntitySetsFlat }
): Question {
    return {
        when: () => {
            return !!odataServiceAnswers.metadata;
        },
        name: promptNames.confirmDownload,
        type: 'confirm',
        message: 'Confirm entity files to be generated',
        labelTrue: 'Run odata query (files will be generated on finish)',
        labelFalse: 'Dont generate files',
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
                odataQueryResult.odata = result.odataQueryResult;
                odataQueryResult.entitySetsFlat = result.entitySetsFlat;
            }
            return true;
        },
        additionalMessages: (confirmDownload, answers) => {
            // All entities to be created
            const allEntities = [
                appConfig.referencedEntities?.listEntity.entitySetName,
                //...(appConfig.referencedEntities?.pageObjectEntities?.map((entity) => entity.entitySetName) ?? []),
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

/**
 *
 * @param odataServiceAnswers
 * @param appConfig
 * @returns
 */
function getUpdateMainServiceMetadataPrompt(
    odataServiceAnswers: Partial<OdataServiceAnswers>,
    appConfig: AppConfig
): ConfirmQuestion {
    const question: ConfirmQuestion = {
        when: async () => {
            // Use this when condition to load the entity data
            if (appConfig.appAccess && odataServiceAnswers.metadata) {
                Object.assign(appConfig, await getEntityModel(appConfig.appAccess, odataServiceAnswers.metadata));
                return true;
            }
            return false;
        },
        name: promptNames.updateMainServiceMetadata,
        type: 'confirm',
        message: 'Update local metadata file from backend (remote service metadata is always used for data download):',
        default: false
        /* additionalMessages: (updateMetadata: unknown) => {
            if (updateMetadata === true) {
                return {
                    message: 'The local metadata file will be updated from the backend',
                    severity: Severity.information 
                }
            }
            return;
        } */
    };
    return question;
}
