import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { type CheckBoxQuestion, type ConfirmQuestion, type InputQuestion } from '@sap-ux/inquirer-common';
import type { Logger } from '@sap-ux/logger';
import type { OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';
import { getSystemSelectionQuestions, OdataVersion } from '@sap-ux/odata-service-inquirer';
import { createApplicationAccess } from '@sap-ux/project-access';
import type { Answers, CheckboxChoiceOptions, Question } from 'inquirer';
import { t } from '../../utils/i18n';
import type { EntitySetsFlat } from '../odata-query';
import { ODataDownloadGenerator } from '../odata-download-generator';
import { createEntityChoices, getData, getServiceDetails } from './prompt-helpers';
import type { AppConfig } from '../types';
import { getEntityModel } from '../utils';
import { Severity } from '@sap-devx/yeoman-ui-types';

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

    const appSelectionQuestion = getAppSelectionPrompt(appConfig, servicePaths, keyPrompts);

    const systemSelectionQuestions = await getSystemSelectionQuestions(
        {
            datasourceType: {
                includeNone: false
            },
            systemSelection: {
                includeCloudFoundryAbapEnvChoice: false,
                defaultChoice: appConfig.systemName, // todo: Destination test BAS
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
    const relatedEntityChoices: {
        choices: CheckboxChoiceOptions<SelectedEntityAnswerAsJSONString>[];
        entitySetsFlat: EntitySetsFlat;
    } = {
        choices: [],
        entitySetsFlat: {}
    };
    const odataQueryResult: { odata: []; entitySetsFlat: EntitySetsFlat } = {
        odata: [],
        entitySetsFlat: relatedEntityChoices.entitySetsFlat
    };

    const resetSelectionPrompt = getResetSelectionPrompt(appConfig, relatedEntityChoices);

    const relatedEntitySelectionQuestion: CheckBoxQuestion = getEntitySelectionPrompt(relatedEntityChoices);

    // Generate the max size of key parts allowed
    keyPrompts = getKeyPrompts(5, appConfig);

    selectSourceQuestions.push(
        appSelectionQuestion,
        ...(systemSelectionQuestions.prompts as Question[]),
        getUpdateMainServiceMetadataPrompt(systemSelectionQuestions.answers, appConfig),
        ...keyPrompts,
        resetSelectionPrompt,
        relatedEntitySelectionQuestion,
        getConfirmDownloadPrompt(systemSelectionQuestions.answers, appConfig, odataQueryResult)
    );
    return {
        questions: selectSourceQuestions,
        answers: { application: appConfig, odataQueryResult, odataServiceAnswers: systemSelectionQuestions.answers }
    };
}


/**
 * Gets the app selection prompt.
 * 
 * @param appConfig 
 * @param servicePaths 
 * @param keyPrompts 
 * @returns 
 */
function getAppSelectionPrompt(appConfig: AppConfig, servicePaths: string[], keyPrompts: InputQuestion<Answers>[]) {
    return {
        type: 'input',
        guiType: 'folder-browser',
        name: 'appSelection',
        message: t('prompts.appSelection.message'),
        default: (answers: Answers) => answers.appSelection ?? appConfig.appAccess?.app.appRoot,
        guiOptions: { mandatory: true, breadcrumb: t('prompts.appSelection.breadcrumb') },
        validate: async (appPath: string): Promise<string | boolean> => {
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
}

/**
 * Gets the entity selection prompt. 
 * 
 * @param relatedEntityChoices 
 * @returns 
 */
function getEntitySelectionPrompt(relatedEntityChoices: {
    choices: CheckboxChoiceOptions<SelectedEntityAnswerAsJSONString>[];
    entitySetsFlat: EntitySetsFlat;
}): CheckBoxQuestion<Answers> {
    return {
        when: async () => {
            return relatedEntityChoices.choices.length > 0;
        },
        name: promptNames.relatedEntitySelection,
        type: 'checkbox',
        guiOptions: {
            applyDefaultWhenDirty: true
        },
        message: t('prompts.relatedEntitySelection.message'),
        choices: () => relatedEntityChoices.choices,
        default: () => {
            const defaults: SelectedEntityAnswer[] = [];
            relatedEntityChoices.choices.forEach((entityChoice) => {
                // Parsing is a hack for https://github.com/SAP/inquirer-gui/issues/787
                if ((JSON.parse(entityChoice.value) as SelectedEntityAnswer).entity.selected) {
                    defaults.push(entityChoice.value);
                }
            });
            return defaults;
        },
        validate: (selectedEntities) => {
            selectedEntities.forEach((selectedEntity) => {
                const selectedEntityChoice = relatedEntityChoices.choices.find(
                    (entityChoice) => JSON.parse(entityChoice.value).fullPath === JSON.parse(selectedEntity).fullPath
                );
                if (selectedEntityChoice) {
                    // Parsing is a hack for https://github.com/SAP/inquirer-gui/issues/787
                    const choiceValue = JSON.parse(selectedEntityChoice.value) as SelectedEntityAnswer;
                    choiceValue.entity.selected = true;
                    // Hack for https://github.com/SAP/inquirer-gui/issues/787
                    selectedEntityChoice.value = JSON.stringify(choiceValue);
                }
            });
            return true;
        }
    };
}

/**
 * Gets the reset selection prompt. This prompt is responsible for loading the entity choices.
 *
 * @param appConfig
 * @param relatedEntityChoices
 * @param relatedEntityChoices.choices
 * @param relatedEntityChoices.entitySetsFlat
 * @returns
 */
function getResetSelectionPrompt(
    appConfig: AppConfig,
    relatedEntityChoices: {
        choices: CheckboxChoiceOptions<SelectedEntityAnswerAsJSONString>[];
        entitySetsFlat: EntitySetsFlat;
    }
): Question {
    const relatedEntityChoicesInitial: { choices: CheckboxChoiceOptions<SelectedEntityAnswerAsJSONString>[] } = {
        choices: []
    };
    let previousServicePath;
    let previousReset;
    const toggleSelectionPrompt = {
        when: () => {
            // todo: path is not sufficent to determine a change as another system selection may have the same service path
            if (appConfig.servicePath !== previousServicePath && appConfig.referencedEntities?.listEntity) {
                const entityChoices = createEntityChoices(
                    appConfig.referencedEntities.listEntity,
                    appConfig.referencedEntities.pageObjectEntities
                );
                if (entityChoices) {
                    relatedEntityChoices.choices = entityChoices.choices;
                    // Keep initial state for reset
                    relatedEntityChoicesInitial.choices = [...relatedEntityChoices.choices];
                    Object.assign(relatedEntityChoices.entitySetsFlat, entityChoices.entitySetsFlat);
                    previousServicePath = appConfig.servicePath;
                }
            }
            return relatedEntityChoices.choices.length > 0;
        },
        name: 'toggleSelection',
        type: 'confirm',
        message: 'Reset selection',
        labelTrue: 'Clear selected',
        labelFalse: 'Restore default selection',
        default: false,
        validate: (reset: boolean) => {
            // Dont apply a reset unless the value was changed as this validate function is triggered by any earlier prompt inputs
            if (reset !== previousReset) {
                if (reset) {
                    if (relatedEntityChoicesInitial.choices.length === 0) {
                        relatedEntityChoicesInitial.choices = structuredClone(relatedEntityChoices.choices);
                    }
                    relatedEntityChoices.choices.forEach((entityChoice) => {
                        // Parsing is a hack for https://github.com/SAP/inquirer-gui/issues/787
                        const entityChoiceValue = JSON.parse(entityChoice.value) as SelectedEntityAnswer;
                        entityChoiceValue.entity.selected = false;
                        entityChoice.value = JSON.stringify(entityChoiceValue);
                    });
                } else if (relatedEntityChoicesInitial.choices.length > 0) {
                    relatedEntityChoices.choices = structuredClone(relatedEntityChoicesInitial.choices);
                }
                previousReset = reset;
            }
            return true;
        }
    } as ConfirmQuestion;

    return toggleSelectionPrompt;
}

/**
 * Get the prompt for keys
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
            message: () =>
                t('prompts.entityKey.message', {
                    keyName: appConfig.referencedEntities?.listEntity.semanticKeys[keypart]?.name
                }),
            type: 'input',
            guiOptions: {
                hint: t('prompts.entityKey.hint')
            },
            validate: (keyValue: string) => {
                // todo : move to a validator
                if (invalidEntityKeyFilterChars.includes(keyValue)) {
                    return t('prompts.entityKey.validation.invalidKeyValueChars', {
                        chars: invalidEntityKeyFilterChars.join()
                    });
                }
                const keyRef = appConfig.referencedEntities?.listEntity.semanticKeys[keypart];
                // Clear key values
                if (!keyValue && keyRef) {
                    delete keyRef.value;
                }

                const filterAndParts = keyValue.split(',');
                filterAndParts.forEach((filterPart) => {
                    const filterRangeParts = filterPart.split('-');
                    if (filterRangeParts.length > 2) {
                        return t('prompts.entityKey.validation.invalidRangeSpecified');
                    }
                });

                // todo: validate the input based on the key type
                if (keyRef) {
                    if (keyRef.type === 'Edm.Boolean') {
                        try {
                            keyRef.value = JSON.parse(keyValue);
                        } catch {
                            return t('prompts.entityKey.validation.invalidBooleanValue');
                        }
                    } else {
                        keyRef.value = keyValue;
                    }
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
 */
function getConfirmDownloadPrompt(
    odataServiceAnswers: Partial<OdataServiceAnswers>,
    appConfig: AppConfig,
    odataQueryResult: { odata: undefined | [] }
): Question {
    let result: { odataQueryResult: [] } | string;
    return {
        when: () => {
            return !!odataServiceAnswers.metadata;
        },
        name: promptNames.confirmDownload,
        type: 'confirm',
        message: t('prompts.confirmDownload.message'),
        labelTrue: t('prompts.confirmDownload.labelTrue'),
        labelFalse: t('prompts.confirmDownload.labelFalse'),
        default: false,
        guiOptions: {
            mandatory: true
        },
        validate: async (download, answers: Answers) => {
            if (download) {
                result = await getData(odataServiceAnswers, appConfig, answers);
                if (typeof result === 'string') {
                    return result;
                }
                odataQueryResult.odata = result.odataQueryResult;
            }
            return true;
        },
        additionalMessages: (runQuery: boolean) => {
            if (runQuery && result && typeof result !== 'string') {
                return {
                    message: t('prompts.confirmDownload.querySuccess', {
                        rowsReturned: result.odataQueryResult.length
                    }),
                    severity: Severity.information
                };
            }
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
        message: t('prompts.updateMainServiceMetadata.message'),
        default: false
    };
    return question;
}
