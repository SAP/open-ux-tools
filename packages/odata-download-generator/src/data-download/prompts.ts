import { Severity } from '@sap-devx/yeoman-ui-types';
import { isAppStudio } from '@sap-ux/btp-utils';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { CheckBoxQuestion, ConfirmQuestion, InputQuestion } from '@sap-ux/inquirer-common';
import { Logger } from '@sap-ux/logger';
import {
    getSystemSelectionQuestions,
    OdataServiceAnswers,
    OdataVersion,
    promptNames as servicePromptNames
} from '@sap-ux/odata-service-inquirer';
import { createApplicationAccess } from '@sap-ux/project-access';
import { Answers, CheckboxChoiceOptions, Question } from 'inquirer';
import { ODataDownloadGenerator } from './odataDownloadGenerator';
import type { AppConfig, Entity } from './types';
import { getAppConfig, getSystemNameFromStore } from './utils';
import { getData } from './prompt-helpers';
import { EntityType } from '@sap-ux/vocabularies-types';
import { UIAnnotationTypes } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { lastIndexOf } from 'lodash';

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
        defaultSelection?: boolean;
    };
};

function createRelatedEntityChoices(
    relatedEntities: Map<Entity, Entity[]>
): CheckboxChoiceOptions<SelectedEntityAnswerAsJSONString>[] {
    const choices: CheckboxChoiceOptions[] = [];

    relatedEntities.forEach((entities, parentEntity) => {
        // Check the entity types assigned annotations for cross refs to other entities that should be selected by default
        // Reference entities of the parent have a path of the nav property entity which we are iterating next so we can pre-select
        const defaultSelectionPaths = getDefaultSelectionPaths(parentEntity.entitySet.entityType);

        entities.forEach((entity) => {
            // fix issue with prompt values containing `name
            const entityChoice: SelectedEntityAnswer = {
                // Nasty workaround for checkbox selection issue: https://github.com/SAP/inquirer-gui/issues/787
                fullPath: `${parentEntity.entityPath}/${entity.entityPath}`,
                entity: {
                    entityPath: entity.entityPath,
                    entitySetName: entity.entitySetName,
                    defaultSelection: defaultSelectionPaths.includes(entity.entityPath)
                }
            };

            const choiceId = `${parentEntity.entityPath} > ${entity.entityPath} :${entityChoice.entity.defaultSelection}`;
            choices.push({
                name: choiceId,
                value: JSON.stringify(entityChoice)
            });
        });
    });

    return choices;
}

function getDefaultSelectionPaths(entityType: EntityType): string[] {
    const refTargetPaths = entityType.annotations.UI?.Facets?.map((facet) => {
        if (facet.$Type === UIAnnotationTypes.ReferenceFacet && facet.Target.type === 'AnnotationPath') {
            const value = facet.Target.value;
            return value.substring(0, value.lastIndexOf('/'));
        }
    }).filter((val) => !!val) as string[];

    return refTargetPaths ?? [];
}

/**
 *
 *
 * @param mainEntity
 */
export async function getODataDownloaderPrompts(): Promise<{
    questions: Question[];
    answers: {
        application: AppConfig;
        odataQueryResult: { odata: object | undefined };
        odataServiceAnswers: Partial<OdataServiceAnswers>;
    };
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
                appConfig.systemName.value = isAppStudio()
                    ? appConfig.backendConfig?.destination
                    : await getSystemNameFromStore(appConfig.backendConfig.url, appConfig.backendConfig?.client);
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
                serviceFilter: servicePaths,
                requiredOdataVersion: OdataVersion.v4
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
            // No selected service connection
            if (!systemSelectionQuestions.answers.metadata) {
                return false;
            }
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
            let defaults: SelectedEntityAnswer[] = [];
            const previousEntitySelections = previousAnswers?.[promptNames.relatedEntitySelection];
            if (
                !previousEntitySelections ||
                (Array.isArray(previousEntitySelections) && previousEntitySelections.length === 0)
            ) {
                // Pre-select entities with default selection property
                relatedEntityChoices.forEach((entityChoice) => {
                    // Parsing is a hack for https://github.com/SAP/inquirer-gui/issues/787
                    if ((JSON.parse(entityChoice.value) as SelectedEntityAnswer).entity.defaultSelection) {
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
    keyPrompts = getKeyPrompts(3, appConfig, systemSelectionQuestions.answers);
    let odataQueryResult = {
        odata: undefined
    };

    selectSourceQuestions.push(
        appSelectionQuestion,
        ...(systemSelectionQuestions.prompts as Question[]),
        getUpdateMainServiceMetadataPrompt(systemSelectionQuestions.answers),
        ...keyPrompts,
        relatedEntitySelectionQuestion,
        getConfirmDownloadPrompt(systemSelectionQuestions.answers, appConfig, odataQueryResult)
    );
    return {
        questions: selectSourceQuestions,
        answers: { application: appConfig, odataQueryResult, odataServiceAnswers: systemSelectionQuestions.answers }
    };
}

function getKeyPrompts(
    size: number,
    appInfo: AppConfig,
    odataServiceAnswers: Partial<OdataServiceAnswers>
): InputQuestion[] {
    const questions: InputQuestion[] = [];

    const getEntityKeyInputPrompt = (keypart: number) =>
        ({
            when: () => {
                return (
                    !!odataServiceAnswers.connectedSystem?.serviceProvider &&
                    !!appInfo.referencedEntities?.listEntity.semanticKeys[keypart]?.name
                );
            },
            name: `entityKeyIdx:${keypart}`,
            message: () => `Enter values for: ${appInfo.referencedEntities?.listEntity.semanticKeys[keypart]?.name}`,
            type:
                appInfo.referencedEntities?.listEntity.semanticKeys?.[keypart]?.type === 'Edm.Boolean'
                    ? 'confirm'
                    : 'input',
            guiOptions: {
                hint: "For range selection use '-' between values. Use commas to select non-contigous values."
            },
            validate: (keyValue: string) => {
                let validationMsg;
                // todo : move to a validator
                if (invalidEntityKeyFilterChars.includes(keyValue)) {
                    return `Invalid key value contain not allowed characters: ${invalidEntityKeyFilterChars.join()}`;
                }
                const filterAndParts = keyValue.split(',');
                filterAndParts.forEach((filterPart) => {
                    const filterRangeParts = filterPart.split('-');
                    if (filterAndParts.length > 2) {
                        return "Invalid range specified, only the lowest and highest values allowed. e.g. '1-10'";
                    }
                });

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
            return !!odataServiceAnswers.connectedSystem?.serviceProvider;
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

function getUpdateMainServiceMetadataPrompt(odataServiceAnswers: Partial<OdataServiceAnswers>): ConfirmQuestion {
    const question: ConfirmQuestion = {
        when: () => {
            // Do we have an active connection
            return !!odataServiceAnswers.connectedSystem?.serviceProvider;
        },
        name: promptNames.updateMainServiceMetadata,
        type: 'confirm',
        message: 'Update local metadata file from backend:',
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
