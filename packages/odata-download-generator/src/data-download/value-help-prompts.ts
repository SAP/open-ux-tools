import { convert } from '@sap-ux/annotation-converter';
import type { AbapServiceProvider, AxiosRequestConfig, ExternalService, ValueListReference } from '@sap-ux/axios-extension';
import { type ExternalServiceReference } from '@sap-ux/axios-extension';
import { parse } from '@sap-ux/edmx-parser';
import type { CheckBoxQuestion } from '@sap-ux/inquirer-common';
import { getExternalServiceReferences } from '@sap-ux/odata-service-writer';
import type { CheckboxChoiceOptions } from 'inquirer';
import merge from 'lodash/merge';
import { join } from 'path';
import { PromptState } from './prompt-state';
import { entityTypeExclusions } from './types';

/**
 *
 * @param servicePath
 * @param metadata
 * @param abapServiceProvider
 * @returns
 */
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

/**
 *
 * @param selectedValueHelpRefs
 * @param abapServiceProvider
 * @returns
 */
async function getExternalServiceEntityData(selectedValueHelpRefs: ExternalService[], abapServiceProvider: AbapServiceProvider): Promise<ExternalService[]> {
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
        PromptState.externalServiceRequestCache[servicePath] = PromptState.externalServiceRequestCache[servicePath] ? PromptState.externalServiceRequestCache[servicePath] : [];

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

/**
 *
 * @param selectedValueHelps
 * @param abapServiceProvider
 * @returns
 */
async function getExternalServiceMetadata(selectedValueHelps: ExternalServiceReference[][], abapServiceProvider: AbapServiceProvider): Promise<ExternalService[]> {
    const flatExtSerRefs = selectedValueHelps.flat();
    const extServiceData = await abapServiceProvider.fetchExternalServices(flatExtSerRefs);
    return extServiceData;
}

/**
 *
 * @param servicePath
 * @param metadata
 * @returns
 */
function getValueHelpChoices(servicePath: string, metadata: string): CheckboxChoiceOptions<{ name: string; value: ExternalServiceReference }>[] {
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
    const choiceNameByPathAndEntity: {
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
            } else if (ref.type === 'code-list') {
                //Put all code list entities for the same service on the same choice as its a single request
                if (choiceNameByPathAndEntity?.[ref.value]) {
                    choiceNameByPathAndEntity[ref.value]['Code list'].push(ref);
                } else if (!choiceNameByPathAndEntity?.[ref.value]) {
                    choiceNameByPathAndEntity[ref.value] = { ['Code list']: [ref] };
                }
            }
        });
    });

    // create choices
    Object.values(choiceNameByPathAndEntity).forEach((targetEntities) => {
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
