import { getSystemSelectionQuestions, OdataServiceAnswers, promptNames } from '@sap-ux/odata-service-inquirer';
import { ApplicationAccess, createApplicationAccess, FileName, Manifest } from '@sap-ux/project-access';
import { readFile } from 'fs/promises';
import { Answers, CheckboxChoiceOptions, InputQuestion, PromptFunction, Question } from 'inquirer';
import { convertEdmxToConvertedMetadata } from '@sap-ux/inquirer-common';
import type { ConvertedMetadata, EntitySet, Singleton } from '@sap-ux/vocabularies-types';
import { join } from 'path';
import { UI5Config, type FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import { BackendSystem, BackendSystemKey, getService } from '@sap-ux/store';
import { createRelatedEntityChoices, SelectedEntityAnswer } from './utils';
import Generator from 'yeoman-generator';
import { ODataDownloadGenerator } from './odataDownloadGenerator';
import { Logger } from '@sap-ux/logger';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';

export type AppConfig = {
    referencedEntities?: ReferencedEntities;
    servicePath?: string;
    /** local backend config */
    backendConfig?: FioriToolsProxyConfigBackend;
};

type EntityKey = { name: string; type: string; value: string | undefined };

export type ReferencedEntities = {
    listEntity: {
        entitySetName: string;
        keys: EntityKey[];
    };
    pageObjectEntities?: Entity[];
    navPropEntities?: Map<Entity, Entity[]>;
};
export type Entity = { entitySetName: string; entityPath: string; entitySet: EntitySet | Singleton };

const navPropNameExclusions = ['DraftAdministrativeData', 'SiblingEntity'];

export async function getAppConfig(appAccess: ApplicationAccess): Promise<AppConfig | undefined> {
    let entities: ReferencedEntities | undefined;
    let backendConfig: FioriToolsProxyConfigBackend | undefined;
    const mainService = appAccess.app.services['mainService'];
    // todo: we may need to update the metadata if its outdated
    if (mainService.local) {
        const metadataPath = join(mainService.local);
        const convertedMetadata = convertEdmxToConvertedMetadata(await readFile(metadataPath, 'utf-8'));
        // Read the manifest to get the routing targets
        const manifest = JSON.parse(await readFile(appAccess.app.manifest, 'utf-8')) as Manifest;
        const routeTargets = manifest?.['sap.ui5']?.routing?.targets;

        if (routeTargets) {
            // todo: map to get all in one iteration
            const listPageTarget = Object.values(routeTargets).find((target) => {
                return (target as any).name === 'sap.fe.templates.ListReport';
            });
            if (listPageTarget) {
                const listEntity: string = (listPageTarget as any).options?.settings?.contextPath;
                const listEntitySetName = listEntity.replace(/^\//, '');
                const entityKeys = getEntityKeyProperties(listEntitySetName, convertedMetadata);
                entities = {
                    listEntity: {
                        entitySetName: listEntitySetName,
                        keys: entityKeys
                    }
                };

                const pageObjectEntities: Entity[] = [];
                const navPropEntities = new Map<Entity, Entity[]>();

                for (const target of Object.values(routeTargets)) {
                    if ((target as any).name === 'sap.fe.templates.ObjectPage') {
                        const contextPath = (target as any).options?.settings?.contextPath;
                        const entity = getEntityFromContextPath(
                            entities.listEntity.entitySetName,
                            contextPath.match(/[^\/]+$/)?.[0],
                            convertedMetadata
                        );
                        if (entity) {
                            //pageObjectEntities.push(contextPath.replace(/^\//, ''));
                            pageObjectEntities.push(entity);
                            const navEntities = getNavPropertyEntities(entity.entitySet as EntitySet);
                            if (navEntities) {
                                navPropEntities.set(entity, navEntities);
                            }
                        }
                    }
                }
                entities.pageObjectEntities = pageObjectEntities;
                entities.navPropEntities = navPropEntities;
            }
        }
        // Read backend middleware config
        const ui5Config = await UI5Config.newInstance(
            await readFile(join(appAccess.app.appRoot, FileName.Ui5Yaml), 'utf-8')
        );
        backendConfig = ui5Config.getBackendConfigsFromFioriToolsProxyMiddleware()[0];
    }

    return {
        referencedEntities: entities,
        servicePath: mainService.uri,
        backendConfig: backendConfig
    };
}

/**
 * Fond the key properties fo the specified entity set name in the specified metadata
 *
 * @param entitySetName
 * @param convertedEdmx
 * @returns
 */
function getEntityKeyProperties(entitySetName: string, convertedEdmx: ConvertedMetadata): EntityKey[] {
    const entity = convertedEdmx.entitySets.find((es) => es.name === entitySetName);
    const keyNames: EntityKey[] = [];
    if (entity) {
        entity.entityType.keys.forEach((key) => {
            keyNames.push({
                name: key.name,
                type: key.type,
                value: undefined
            });
        });
    }
    return keyNames;
}

/**
 *
 * @param listEntity
 * @param contextPath
 */
function getEntityFromContextPath(
    mainEntitySetName: string,
    pageEntityPath: string,
    convertedEdmx: ConvertedMetadata
): Entity | undefined {
    const mainEntitySet = convertedEdmx.entitySets.find((es) => es.name === mainEntitySetName);
    const navProps = mainEntitySet?.entityType.navigationProperties.filter((navProp) => navProp.isCollection) ?? [];
    const pageObjectEntity = navProps.find((navProp) => {
        return pageEntityPath === navProp.name;
    });

    if (!pageObjectEntity) return;

    const entitySet = findEntitySet(convertedEdmx.entitySets, pageObjectEntity?.targetTypeName!)!;

    return {
        entitySetName: entitySet.name,
        entityPath: pageEntityPath,
        entitySet
    };
}

/**
 * Get all the navigation property entities (entity set name and path) of the specified entity set name
 */

function getNavPropertyEntities(entitySet: EntitySet): Entity[] | undefined {
    const entities: Entity[] = [];
    Object.entries(entitySet.navigationPropertyBinding).forEach(([path, entitySet]) => {
        if (!navPropNameExclusions.includes(path)) {
            entities.push({
                entitySet: entitySet,
                entityPath: path,
                entitySetName: entitySet.name
            });
        }
    });
    return entities;
}

/**
 * Copied from odata-service-inquirer
 */
function findEntitySet(entitySets: EntitySet[], entityType: string): EntitySet | undefined {
    const foundEntitySet = entitySets.find((entitySet) => {
        return entitySet.entityTypeName === entityType;
    });
    return foundEntitySet ? foundEntitySet : undefined;
}

// todo: consolidate this and AppConfig
type ApplicationInfo = {
    appAccess: ApplicationAccess | undefined;
    referencedEntities: ReferencedEntities | undefined;
    servicePaths: string[];
    backendConfig: FioriToolsProxyConfigBackend | undefined;
    /**
     * If the system url + client read from the backend config is available from the system store the matching name will be used to pre-select
     */
    systemName: { value: string | undefined };
};

/**
 * Load the system from store if available otherwise return as a new system choice
 *
 * @param systemUrl
 * @param client
 * @returns
 */
async function getSystemNameFromStore(systemUrl: string, client?: string): Promise<string | undefined> {
    const systemStore = await getService<BackendSystem, BackendSystemKey>({
        //logger, // todo: inti logger from YUI
        entityName: 'system'
    });
    const system = await systemStore.read(new BackendSystemKey({ url: systemUrl, client }));
    return system?.name ?? 'NewSystemChoice';
}

/**
 *
 *
 * @param mainEntity
 */
export async function getServiceSelectionPrompts(
    promptFunc: PromptFunction
): Promise<{ questions: Question[]; answers: { system: Partial<OdataServiceAnswers>; application: ApplicationInfo } }> {
    const selectSourceQuestions: Question[] = [];
    const promptFuncRef = promptFunc;
    let promptPromise: Promise<Answers>;
    let appAnswer: ApplicationInfo = {
        appAccess: undefined,
        referencedEntities: undefined,
        servicePaths: [],
        backendConfig: undefined,
        systemName: { value: undefined }
    };
    // to do we dont need app confoig and applicationInfo
    let appConfig: AppConfig | undefined;
    let keyPrompts: InputQuestion[] = [];
    const appSelectionQuestion = {
        type: 'input',
        guiType: 'folder-browser',
        name: 'appSelection',
        message: 'Select an application as data download target',
        default: (answers: Answers) => answers.appSelection || appAnswer.appAccess?.app.appRoot,
        guiOptions: { mandatory: true, breadcrumb: `Selected App` },
        validate: async (appPath: string, answers: Answers): Promise<string | boolean> => {
            if (!appPath) {
                return false;
            }
            // Already set, adding prompts will retrigger validation
            if (appPath === appAnswer.appAccess?.app.appRoot) {
                return true;
            }
            // validate application exists at path
            appAnswer.appAccess = await createApplicationAccess(appPath);
            // todo: dont need 2 refs (appAnswer and appConfig)
            appConfig = await getAppConfig(appAnswer.appAccess);

            appAnswer.referencedEntities = appConfig?.referencedEntities;
            // todo: update odata-service-inquirer to support service path in additiona to service id
            appAnswer.servicePaths.push(appConfig?.servicePath ?? '');
            appAnswer.backendConfig = appConfig?.backendConfig;
            if (appAnswer.backendConfig) {
                appAnswer.systemName.value =
                    appAnswer.backendConfig?.destination ??
                    (await getSystemNameFromStore(appAnswer.backendConfig.url, appAnswer.backendConfig?.client));
            }

            /* if (appAnswer.referencedEntities?.listEntity.keys) {
                selectSourceQuestions.push(...getKeyPrompts(appAnswer.referencedEntities?.listEntity.keys));
                generator;
                promptPromise.then(async () => {
                    systemSelectionQuestions.answers = await promptFuncRef(selectSourceQuestions);
                    return systemSelectionQuestions.answers;
                });
            } */
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
                defaultChoice: appAnswer.systemName
            },
            serviceSelection: {
                serviceFilter: appAnswer.servicePaths
            }
        },
        getHostEnvironment() !== hostEnvironment.cli,
        ODataDownloadGenerator.logger as Logger
    );

    let relatedEntityChoices: CheckboxChoiceOptions<SelectedEntityAnswer>[] = [];
    const relatedEntitySelectionQuestion = {
        when: () => {
            relatedEntityChoices = [];
            relatedEntityChoices.push(
                ...(appAnswer.referencedEntities?.navPropEntities
                    ? createRelatedEntityChoices(appAnswer.referencedEntities?.navPropEntities)
                    : [])
            );
            return relatedEntityChoices.length > 0;
        },
        name: 'relatedEntitySelection',
        type: 'checkbox',
        message: 'Select additional entities for data download',
        choices: () => relatedEntityChoices
    };

    // Generate the max size of key parts allowed
    keyPrompts = getKeyPrompts(3, appAnswer);

    selectSourceQuestions.push(
        appSelectionQuestion,
        ...(systemSelectionQuestions.prompts as Question[]),
        ...keyPrompts,
        relatedEntitySelectionQuestion
    );
    const selectSystemResult = systemSelectionQuestions.answers;

    return {
        questions: selectSourceQuestions,
        answers: { system: selectSystemResult, application: appAnswer }
    };
}

export function getKeyPrompts(size: number, appInfo: ApplicationInfo): InputQuestion[] {
    const questions: InputQuestion[] = [];

    const getEntityKeyInputPrompt = (keypart: number) =>
        ({
            when: () => {
                return !!appInfo.referencedEntities?.listEntity.keys[keypart]?.name;
            },
            name: `entityKeyIdx:${keypart}`,
            message: () => `Enter value for: ${appInfo.referencedEntities?.listEntity.keys[keypart]?.name}`,
            type: appInfo.referencedEntities?.listEntity.keys?.[keypart]?.type === 'Edm.Boolean' ? 'confirm' : 'input',
            validate: (keyValue: string) => {
                // todo: validate the input based on the key type
                if (keyValue && appInfo.referencedEntities?.listEntity.keys[keypart]) {
                    appInfo.referencedEntities.listEntity.keys[keypart].value = keyValue;
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

/* export function getKeyPrompts(entityKey: EntityKey): InputQuestion[] {
    const questions: InputQuestion[] = [];

    const getEntityKeyInputPrompt = (entityKeyName: string, keyValue: EntityKey[string]) =>
        ({
            name: `${entityKeyName}`,
            message: `Enter value for: ${entityKeyName}`,
            type: keyValue.type === 'Edm.Boolean' ? 'confirm' : 'input',
            validate: (keyValue: string) => {
                return true;
            }
        } as InputQuestion);
    // Generate a prompt for each key we need input for
    Object.entries(entityKey).forEach(([entityKeyName, entityKeyValue]) => {
        questions.push(getEntityKeyInputPrompt(entityKeyName, entityKeyValue));
    });
    return questions;
} */

//todo;
function insertPrompt(prompts: Question[], promptsToInsert: [], afterPromptName: string) {}
