import { CheckBoxQuestion } from '@sap-ux/inquirer-common';
import { SelectedEntityAnswer } from './prompts';
import { getExternalServiceReferences } from '@sap-ux/odata-service-writer';
import { CheckboxChoiceOptions } from 'inquirer';
import merge from 'lodash/merge';
import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import {
    ValueListReference,
    type ExternalServiceReference,
    AbapServiceProvider,
    ExternalService,
    AxiosRequestConfig
} from '@sap-ux/axios-extension';
import { entityTypeExclusions } from './types';
import { join } from 'path';
import { PromptState } from './prompt-state';

export function getValueHelpSelectionPrompt(
    servicePath: string,
    metadata: string,
    abapServiceProvider: AbapServiceProvider
): { questions: CheckBoxQuestion[]; valueHelpData?: ExternalService[] } {
    PromptState.reset();
    const valueHelpChoices = getValueHelpChoices(servicePath, metadata);
    const valueHelpData: ExternalService[] = [];

    const vhSelectionQuestion: CheckBoxQuestion = {
        name: 'valueHelpSelection',
        type: 'checkbox',
        message: 'Select Value Help data',
        choices: () => valueHelpChoices,
        validate: async (selectedValueHelps: ExternalServiceReference[][]) => {
            if (!selectedValueHelps || selectedValueHelps.length === 0) {
                PromptState.reset();
                return true;
            }
            const valueHelpMetadata = await getExternalServiceMetadata(selectedValueHelps, abapServiceProvider);
            merge(valueHelpData, valueHelpMetadata);

            await getExternalServiceEntityData(valueHelpData, abapServiceProvider);

            return true;
        }
    };
    return { questions: [vhSelectionQuestion], valueHelpData };
}

async function getExternalServiceEntityData(
    selectedValueHelpRefs: ExternalService[],
    abapServiceProvider: AbapServiceProvider
): Promise<ExternalService[]> {
    const externalServiceEntityData: ExternalService[] = [];

    const reqConfig: AxiosRequestConfig = {
        responseType: 'json',
        params: { '$format': 'json' },
        headers: {
            Accept: 'application/json'
        },
        transitional: {
            forcedJSONParsing: true
        },
        transformResponse: (data) => {
            if (typeof data === 'string') {
                return JSON.parse(data);
            }
            return data;
        }
    };
    const allPromises = selectedValueHelpRefs.map(async (externalServiceRef) => {
        const valueHelpEntityData: ExternalService = externalServiceRef;
        const [servicePath] = valueHelpEntityData.path.split(';');
        // Create a request cache entry
        PromptState.externalServiceRequestCache[servicePath] = PromptState.externalServiceRequestCache[servicePath]
            ? PromptState.externalServiceRequestCache[servicePath]
            : [];

        const serviceMetadata = convert(parse(externalServiceRef.metadata));
        const entitySets = serviceMetadata.entitySets;
        const requestPromises = entitySets.map(async (entitySet) => {
            const entitySetName = entitySet.name;
            // If we already have this entity data dont request again
            if (PromptState.externalServiceRequestCache[servicePath].includes(entitySetName)) {
                return Promise.resolve();
            }
            PromptState.externalServiceRequestCache[servicePath].push(entitySetName);

            const response = await abapServiceProvider.get(join(valueHelpEntityData.path, entitySetName), reqConfig);
            valueHelpEntityData.entityData = valueHelpEntityData.entityData ? valueHelpEntityData.entityData : [];
            valueHelpEntityData.entityData?.push({
                entitySetName,
                items: response.data.value
            });
        });
        await Promise.allSettled(requestPromises);
        if (valueHelpEntityData.entityData) {
            externalServiceEntityData.push(valueHelpEntityData);
        }
    });
    await Promise.allSettled(allPromises);

    return externalServiceEntityData;
}

async function getExternalServiceMetadata(
    selectedValueHelps: ExternalServiceReference[][],
    abapServiceProvider: AbapServiceProvider
): Promise<ExternalService[]> {
    let flatExtSerRefs = selectedValueHelps.flat();
    const extServiceData = await abapServiceProvider.fetchExternalServices(flatExtSerRefs);
    return extServiceData;
}

function getValueHelpChoices(
    servicePath: string,
    metadata: string
): CheckboxChoiceOptions<{ name: string; value: ExternalServiceReference }>[] {
    const choices: { name: string; value: ExternalServiceReference[] }[] = [];
    const externalServiceRefs = getExternalServiceReferences(servicePath, metadata, []) as ValueListReference[];
    const uniqueByServicePaths: {
        [path: string]: ExternalServiceReference[];
    } = {};

    // Convert the external service refs into a service path keyed map
    externalServiceRefs.forEach((ref) => {
        // Skip specific target names
        if (ref.type === 'value-list' && entityTypeExclusions.includes(ref.target)) {
            return;
        }
        const [vhServicePath] = ref.value.split(';');
        if (uniqueByServicePaths[vhServicePath]) {
            uniqueByServicePaths[vhServicePath].push(ref);
        } else {
            uniqueByServicePaths[vhServicePath] = [ref];
        }
    });

    // 2 levels path -> vh entity -> externalRefs[]
    let choiceNameByPathAndEntity: {
        [path: string]: {
            [targetEntity: string]: ExternalServiceReference[];
        };
    } = {};
    // todo: Combine woth previous iteration
    Object.entries(uniqueByServicePaths).forEach(([path, serviceRefs]) => {
        serviceRefs.forEach((ref) => {
            if (ref.type === 'value-list') {
                const targetEntity = ref.target.match(/[^\/]+$/)?.[0];
                if (targetEntity) {
                    if (choiceNameByPathAndEntity[path]?.[targetEntity]) {
                        choiceNameByPathAndEntity[path][targetEntity].push(ref);
                    } else if (!choiceNameByPathAndEntity[path]) {
                        choiceNameByPathAndEntity[path] = {
                            [targetEntity]: [ref]
                        };
                    }
                }
            } else if (ref.type === 'code-list' && ref.collectionPath) {
                if (choiceNameByPathAndEntity?.[ref.collectionPath]) {
                    choiceNameByPathAndEntity[ref.collectionPath][ref.collectionPath].push(ref);
                } else if (!choiceNameByPathAndEntity?.[ref.collectionPath]) {
                    choiceNameByPathAndEntity[ref.collectionPath] = { [ref.collectionPath]: [ref] };
                }
            }
        });
    });

    // create choices
    Object.entries(choiceNameByPathAndEntity).forEach(([path, targetEntities]) => {
        Object.entries(targetEntities).forEach(([targetEntity, entityRefs]) => {
            const choiceNameTargets: string[] = [];
            entityRefs.forEach((entityRef) => {
                if (entityRef.type === 'value-list') {
                    choiceNameTargets.push(entityRef.target.split(/\/([^/]*)$/)[0]);
                } else if (entityRef.type === 'code-list') {
                    choiceNameTargets.push(entityRef.collectionPath!);
                }
            });
            const choiceName = `${targetEntity} (${choiceNameTargets.join()})`;
            choices.push({ name: choiceName, value: entityRefs });

        });
    });

    return choices.sort((a, b) => a.name.localeCompare(b.name));
}
