import { Severity } from '@sap-devx/yeoman-ui-types';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import {
    withCondition,
    type CheckBoxQuestion,
    type ConfirmQuestion,
    type InputQuestion
} from '@sap-ux/inquirer-common';
import type { Logger } from '@sap-ux/logger';
import type { OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';
import { getSystemSelectionQuestions, OdataVersion } from '@sap-ux/odata-service-inquirer';
import { createApplicationAccess } from '@sap-ux/project-access';
import type { Answers, CheckboxChoiceOptions, Question } from 'inquirer';
import { t } from '../../utils/i18n';
import { ODataDownloadGenerator } from '../odata-download-generator';
import type { EntitySetsFlat } from '../odata-query';
import type { AppConfig } from '../types';
import { getEntityModel } from '../utils';
import { createEntityChoices, getData, getServiceDetails, getSpecification } from './prompt-helpers';
import { PromptState } from '../prompt-state';

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
const debouncedGetData = (...args: Parameters<typeof getData>): Promise<Awaited<ReturnType<typeof getData>>> => {
    return new Promise((resolve) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => resolve(await getData(...args)), 1000);
    });
};

export const promptNames = {
    appSelection: 'appSelection',
    toggleSelection: 'toggleSelection',
    relatedEntitySelection: 'relatedEntitySelection',
    skipDataDownload: 'skipDataDownload',
    updateMainServiceMetadata: 'updateMainServiceMetadata'
};

const invalidEntityKeyFilterChars = ['.'];

export type SelectedEntityAnswer = {
    fullPath: string;
    entity: {
        entityPath: string;
        entitySetName: string;
        defaultSelected?: boolean;
    };
};

/**
 * Reset the values of the passed app config reference or initialises a new reference.
 * Preserves the original object references. Reset any caches.
 *
 * @param appConfig - The app configuration to reset
 * @returns A null state app config
 */
function resetAppConfig(appConfig: AppConfig): AppConfig {
    PromptState.resetServiceCaches();
    appConfig.appAccess = undefined;
    appConfig.referencedEntities = undefined;
    appConfig.servicePath = undefined;
    if (appConfig.systemName) {
        appConfig.systemName.value = undefined;
    }
    appConfig.relatedEntityChoices.choices = [];
    appConfig.relatedEntityChoices.entitySetsFlat = {};
    return appConfig;
}

/**
 * Gets all prompts for the OData downloader flow.
 *
 * @returns Object containing questions and answer references
 */
export async function getODataDownloaderPrompts(): Promise<{
    questions: Question[];
    answers: {
        application: AppConfig;
        odataQueryResult: { odata: [] };
        odataServiceAnswers: Partial<OdataServiceAnswers>;
    };
}> {
    const selectSourceQuestions: Question[] = [];
    // Local state
    const appConfig: AppConfig = {
        appAccess: undefined,
        referencedEntities: undefined,
        servicePath: undefined,
        systemName: { value: undefined },
        relatedEntityChoices: {
            choices: [],
            entitySetsFlat: {}
        }
    };
    const servicePaths: string[] = [];
    const keyPrompts: InputQuestion[] = getKeyPrompts(5, appConfig);

    const appSelectionQuestion = getAppSelectionPrompt(appConfig, servicePaths, keyPrompts);

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
    // Dont show the system/service selection prompts unless we have a valid app loaded
    systemSelectionQuestions.prompts = withCondition(
        systemSelectionQuestions.prompts as Question<Answers>[],
        () => !!appConfig.appAccess
    );

    const odataQueryResult: { odata: [] } = {
        odata: []
    };

    const resetSelectionPrompt = getResetSelectionPrompt(appConfig, appConfig.relatedEntityChoices);

    const relatedEntitySelectionQuestion: CheckBoxQuestion = getEntitySelectionPrompt(
        appConfig.relatedEntityChoices,
        systemSelectionQuestions.answers,
        appConfig,
        odataQueryResult
    );

    selectSourceQuestions.push(
        appSelectionQuestion,
        ...(systemSelectionQuestions.prompts as Question[]),
        getUpdateMainServiceMetadataPrompt(systemSelectionQuestions.answers, appConfig),
        getSkipDataDownloadPrompt(systemSelectionQuestions.answers),
        ...keyPrompts,
        resetSelectionPrompt,
        relatedEntitySelectionQuestion
    );
    return {
        questions: selectSourceQuestions,
        answers: { application: appConfig, odataQueryResult, odataServiceAnswers: systemSelectionQuestions.answers }
    };
}

/**
 * Gets the app selection prompt.
 *
 * @param appConfig - The application configuration reference
 * @param servicePaths - Array to store service paths
 * @param keyPrompts - Array to store key prompts
 * @returns The app selection input question
 */
function getAppSelectionPrompt(
    appConfig: AppConfig,
    servicePaths: string[],
    keyPrompts: InputQuestion<Answers>[]
): InputQuestion {
    return {
        type: 'input',
        guiType: 'folder-browser',
        name: promptNames.appSelection,
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
            let appAccess;
            try {
                appAccess = await createApplicationAccess(appPath);
            } catch (error: unknown) {
                let errorMsg = error;
                if (error instanceof Error) {
                    errorMsg = error.message;
                }
                ODataDownloadGenerator.logger.error(
                    t('prompts.appSelection.validation.selectedPathDoesNotContainValidApp', { error: errorMsg })
                );
                return `${t('prompts.appSelection.validation.selectedPathDoesNotContainValidApp')}${t('texts.seeLogForDetails')}`;
            }
            const specResult = await getSpecification(appAccess);

            if (typeof specResult === 'string') {
                return specResult;
            }

            appConfig.appAccess = appAccess;
            appConfig.specification = specResult;

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
 * @param relatedEntityChoices - Object containing choices and entitySetsFlat
 * @param relatedEntityChoices.choices - The checkbox choices for entity selection
 * @param relatedEntityChoices.entitySetsFlat - Map of entity paths to entity set names
 * @param odataServiceAnswers - The OData service answers object containing the connection configuration and service metadata
 * @param appConfig - The application configuration object retrieved from ux-specification containing app settings
 * @param odataQueryResult - An object that serves as a container for storing the OData query results
 * @param odataQueryResult.odata - The array of OData entities that were downloaded from the service
 * @returns The checkbox question for entity selection
 */
function getEntitySelectionPrompt(
    relatedEntityChoices: {
        choices: CheckboxChoiceOptions<Answers>[];
        entitySetsFlat: EntitySetsFlat;
    },
    odataServiceAnswers: Partial<OdataServiceAnswers>,
    appConfig: AppConfig,
    odataQueryResult: { odata: undefined | [] }
): CheckBoxQuestion<Answers> {
    let result: { odataQueryResult: [] } | string;
    return {
        when: async (answers): Promise<boolean> =>
            relatedEntityChoices.choices.length > 0 && !answers?.[promptNames.skipDataDownload]?.[0],
        name: promptNames.relatedEntitySelection,
        type: 'checkbox',
        guiOptions: {
            applyDefaultWhenDirty: true // Required to update when reset of selection is triggered
        },
        message: t('prompts.relatedEntitySelection.message'),
        choices: () => relatedEntityChoices.choices,
        validate: async (selectedEntities, answers: Answers): Promise<boolean | string> => {
            // Set `checked` to avoid deselection when re-running `default`.
            selectedEntities.forEach((selectedEntity) => {
                const selectedEntityChoice = relatedEntityChoices.choices.find(
                    (entityChoice) => entityChoice.value.fullPath === selectedEntity.fullPath
                );
                if (selectedEntityChoice) {
                    selectedEntityChoice.checked = true;
                }
            });
            if (answers) {
                const hasKeyInput = Object.entries(answers).find(
                    ([key, value]) => key.startsWith('entityKeyIdx:') && !!value?.trim()
                );
                if (!hasKeyInput) {
                    return t('prompts.skipDataDownload.validation.keyRequired');
                }
                result = await debouncedGetData(
                    odataServiceAnswers,
                    appConfig,
                    answers[promptNames.relatedEntitySelection]
                );
                if (typeof result === 'string') {
                    return result;
                }
                odataQueryResult.odata = result.odataQueryResult;
            }
            return true;
        },
        additionalMessages: () => {
            if (result && typeof result !== 'string') {
                return {
                    message: t('prompts.skipDataDownload.querySuccess', {
                        count: result.odataQueryResult.length
                    }),
                    severity: Severity.information
                };
            }
            return undefined;
        }
    };
}

/**
 * Gets the reset selection prompt. This prompt is responsible for loading the entity choices.
 *
 * @param appConfig - The application configuration
 * @param relatedEntityChoices - Object containing choices and entitySetsFlat
 * @param relatedEntityChoices.choices - The checkbox choices for entity selection
 * @param relatedEntityChoices.entitySetsFlat - Map of entity paths to entity set names
 * @returns The reset selection confirm question
 */
function getResetSelectionPrompt(
    appConfig: AppConfig,
    relatedEntityChoices: {
        choices: CheckboxChoiceOptions<SelectedEntityAnswer>[];
        entitySetsFlat: EntitySetsFlat;
    }
): Question {
    let previousServicePath;
    let previousSystemName;
    let previousReset;
    const toggleSelectionPrompt = {
        when: (answers) => {
            // System was changed, rebuild choices even if service path is the same, otherwise if service is different
            if (previousSystemName !== appConfig.systemName?.value || appConfig.servicePath !== previousServicePath) {
                if (appConfig.referencedEntities?.listEntity) {
                    const entityChoices = createEntityChoices(
                        appConfig.referencedEntities.listEntity,
                        appConfig.referencedEntities.pageObjectEntities
                    );
                    if (entityChoices) {
                        relatedEntityChoices.choices = entityChoices.choices;
                        Object.assign(relatedEntityChoices.entitySetsFlat, entityChoices.entitySetsFlat);
                    }
                }
                previousServicePath = appConfig.servicePath;
                previousSystemName = appConfig.systemName?.value;
            }
            return relatedEntityChoices.choices.length > 0 && !answers?.[promptNames.skipDataDownload]?.[0];
        },
        name: promptNames.toggleSelection,
        type: 'confirm',
        message: t('prompts.toggleSelection.message'),
        labelTrue: t('prompts.toggleSelection.labelTrue'),
        labelFalse: t('prompts.toggleSelection.labelFalse'),
        default: false,
        validate: (reset: boolean) => {
            // Dont apply a reset unless the value was changed as this validate function is triggered by any earlier prompt inputs
            if (reset !== previousReset) {
                relatedEntityChoices.choices.forEach((entityChoice) => {
                    const entityChoiceValue = entityChoice.value as SelectedEntityAnswer;
                    entityChoice.checked = reset === false ? entityChoiceValue.entity.defaultSelected : false; // Restore default selection
                });
                previousReset = reset;
            }
            return true;
        }
    } as ConfirmQuestion;

    return toggleSelectionPrompt;
}

/**
 * Get the prompt for keys.
 *
 * @param size - The number of key prompts to generate
 * @param appConfig - The application configuration
 * @returns Array of input questions for key entry
 */
function getKeyPrompts(size: number, appConfig: AppConfig): InputQuestion[] {
    const questions: InputQuestion[] = [];

    const getEntityKeyInputPrompt = (keypart: number): InputQuestion =>
        ({
            when: async (answers) =>
                !answers?.[promptNames.skipDataDownload]?.[0] &&
                !!appConfig.referencedEntities?.listEntity.semanticKeys[keypart]?.name,
            name: `entityKeyIdx:${keypart}`,
            message: () =>
                t('prompts.entityKey.message', {
                    keyName: appConfig.referencedEntities?.listEntity.semanticKeys[keypart]?.name
                }),
            type: 'input',
            guiOptions: {
                hint: t('prompts.entityKey.hint')
            },
            validate: (keyValue: string): boolean | string => {
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
                for (const filterPart of filterAndParts) {
                    const filterRangeParts = filterPart.split('-');
                    if (filterRangeParts.length > 2) {
                        return t('prompts.entityKey.validation.invalidRangeSpecified');
                    }
                }

                if (keyRef) {
                    if (keyRef.type === 'Edm.Boolean') {
                        try {
                            keyRef.value = JSON.parse(keyValue);
                        } catch {
                            return t('prompts.entityKey.validation.invalidBooleanValue');
                        }
                    } else {
                        keyRef.value = keyValue.trim();
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
 * Gets the confirm download prompt that triggers data fetch.
 *
 * @param odataServiceAnswers - The OData service answers
 * @returns The confirm download question
 */
function getSkipDataDownloadPrompt(odataServiceAnswers: Partial<OdataServiceAnswers>): Question {
    return {
        when: () => {
            return !!odataServiceAnswers.metadata;
        },
        name: promptNames.skipDataDownload,
        type: 'checkbox',
        message: t('prompts.skipDataDownload.message'),
        default: false,
        choices: [
            {
                name: 'Skip data download',
                value: 'skipDownload',
                checked: false
            }
        ]
    } as CheckBoxQuestion;
}

/**
 * Gets the prompt for updating main service metadata.
 *
 * @param odataServiceAnswers - The OData service answers
 * @param appConfig - The application configuration
 * @returns The confirm question for updating metadata
 */
function getUpdateMainServiceMetadataPrompt(
    odataServiceAnswers: Partial<OdataServiceAnswers>,
    appConfig: AppConfig
): ConfirmQuestion {
    const question: ConfirmQuestion = {
        when: async () => {
            // Use this when condition to load the entity data
            if (appConfig.appAccess && appConfig.specification && odataServiceAnswers?.metadata) {
                appConfig.referencedEntities = await getEntityModel(
                    appConfig.appAccess,
                    appConfig.specification,
                    odataServiceAnswers.metadata
                );
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
