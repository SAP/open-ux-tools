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
import type { ApplicationAccess } from '@sap-ux/project-access';
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

/**
 * Validates entity key input and fetches OData if valid.
 *
 * @param answers - The current answers object
 * @param odataServiceAnswers - The OData service answers
 * @param appConfig - The application configuration
 * @returns Validation result or fetched data
 */
async function validateKeysAndFetchData(
    answers: Answers,
    odataServiceAnswers: Partial<OdataServiceAnswers>,
    appConfig: AppConfig
): Promise<string | { odataQueryResult: [] }> {
    const hasKeyInput = Object.entries(answers).find(
        ([key, value]) => key.startsWith('entityKeyIdx:') && !!value?.trim()
    );
    if (!hasKeyInput) {
        return t('prompts.skipDataDownload.validation.keyRequired');
    }

    let entitySelections: SelectedEntityAnswer[] = [];
    // Prevents previous answers from being used when the app is switched and the new app has no entity selections (no nav props)
    if (appConfig.relatedEntityChoices?.choices?.length) {
        entitySelections = answers[promptNames.relatedEntitySelection];
    }

    const result = await debouncedGetData(odataServiceAnswers, appConfig, entitySelections);
    if (typeof result === 'string') {
        return result;
    }
    return result;
}

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
        systemName: { value: undefined, connectPath: undefined },
        relatedEntityChoices: {
            choices: [],
            entitySetsFlat: {}
        }
    };
    const servicePaths: string[] = [];

    const appSelectionQuestion = getAppSelectionPrompt(appConfig, servicePaths);

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

    const keyPrompts: InputQuestion[] = getKeyPrompts(5, appConfig, systemSelectionQuestions.answers, odataQueryResult);

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
        getSkipDataDownloadPrompt(systemSelectionQuestions.answers, appConfig),
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
 * @returns The app selection input question
 */
function getAppSelectionPrompt(appConfig: AppConfig, servicePaths: string[]): InputQuestion {
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
            resetAppConfig(appConfig);
            // validate application exists at path
            let appAccess: ApplicationAccess;
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
            // currently only the main service is supported
            const mainService = appAccess.app.services[appAccess.app.mainService ?? 'mainService'];
            if (!mainService?.odataVersion?.startsWith('4.')) {
                return t('prompts.appSelection.validation.appMainServiceOdataVersionNotSupported', {
                    serviceOdataVersion: mainService.odataVersion
                });
            }

            const specResult = await getSpecification(appAccess);

            if (typeof specResult === 'string') {
                return specResult;
            }

            appConfig.appAccess = appAccess;
            appConfig.specification = specResult;

            const { servicePath, systemName } = await getServiceDetails(appAccess.app.appRoot, mainService);

            if (servicePath) {
                appConfig.servicePath = servicePath;
                servicePaths.push(servicePath);
            }

            if (appConfig.systemName) {
                appConfig.systemName.value = systemName;
                appConfig.systemName.connectPath = servicePath;
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
        when: async (_answers): Promise<boolean> => relatedEntityChoices.choices.length > 0,
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
            if (answers && !answers[promptNames.skipDataDownload]?.[0]) {
                result = await validateKeysAndFetchData(answers, odataServiceAnswers, appConfig);
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
        when: () => {
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
            return relatedEntityChoices.choices.length > 0;
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
 * @param odataServiceAnswers - The OData service answers
 * @param odataQueryResult - Object to store query results
 * @param odataQueryResult.odata - The OData query results array
 * @returns Array of input questions for key entry
 */
function getKeyPrompts(
    size: number,
    appConfig: AppConfig,
    odataServiceAnswers: Partial<OdataServiceAnswers>,
    odataQueryResult: { odata: undefined | [] }
): InputQuestion[] {
    const questions: InputQuestion[] = [];
    let result: { odataQueryResult: [] } | string;
    let lastKeyPart = 0;
    const getEntityKeyInputPrompt = (keypart: number): InputQuestion =>
        ({
            when: async () => {
                /* !answers?.[promptNames.skipDataDownload]?.[0] && */
                const showPrompt = !!appConfig.referencedEntities?.listEntity.semanticKeys[keypart]?.name;
                // Store the index of the last shown prompt so we can run the query on this one only
                if (showPrompt && keypart > lastKeyPart) {
                    lastKeyPart = keypart;
                }
                return showPrompt;
            },
            name: `entityKeyIdx:${keypart}`,
            message: () =>
                t('prompts.entityKey.message', {
                    keyName: appConfig.referencedEntities?.listEntity.semanticKeys[keypart]?.name
                }),
            type: 'input',
            guiOptions: {
                hint: t('prompts.entityKey.hint')
            },
            validate: async (keyValue: string, answers: Answers): Promise<boolean | string> => {
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

                const filterAndParts = keyValue.split(',');
                // Dont validate as range if its a UUID, its not supported
                if (keyRef?.type !== 'Edm.UUID') {
                    for (const filterPart of filterAndParts) {
                        const filterRangeParts = filterPart.split('-');
                        if (filterRangeParts.length > 2) {
                            return t('prompts.entityKey.validation.invalidRangeSpecified');
                        }
                    }
                }

                // In case there are no entities we can also trigger the data request from the last key input
                if (
                    answers &&
                    !appConfig.relatedEntityChoices?.choices?.length &&
                    keypart === lastKeyPart &&
                    !answers[promptNames.skipDataDownload]?.[0] &&
                    !!appConfig.referencedEntities?.listEntity.semanticKeys[keypart]?.name
                ) {
                    result = await validateKeysAndFetchData(answers, odataServiceAnswers, appConfig);
                    if (typeof result === 'string') {
                        return result;
                    }
                    odataQueryResult.odata = result.odataQueryResult;
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
 * @param appConfig
 * @returns The confirm download question
 */
function getSkipDataDownloadPrompt(odataServiceAnswers: Partial<OdataServiceAnswers>, appConfig: AppConfig): Question {
    return {
        when: () => {
            return !!odataServiceAnswers.metadata && !!appConfig.servicePath; // Only show when we have a valid app with service metadata
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
