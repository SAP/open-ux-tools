import { convert } from '@sap-ux/annotation-converter';
import type {
    AbapServiceProvider,
    AxiosRequestConfig,
    ExternalService,
    ValueListReference,
    ExternalServiceReference
} from '@sap-ux/axios-extension';
import { parse } from '@sap-ux/edmx-parser';
import type { CheckBoxQuestion } from '@sap-ux/inquirer-common';
import { getExternalServiceReferences } from '@sap-ux/odata-service-writer';
import type { CheckboxChoiceOptions } from 'inquirer';
import merge from 'lodash/merge';
import { join } from 'node:path';
import { t } from '../../utils/i18n';
import { PromptState } from '../prompt-state';
import { entityTypeExclusions } from '../types';

/**
 * Gets the value help selection prompt.
 *
 * @param servicePath - The service path
 * @param metadata - The service metadata
 * @param abapServiceProvider - The ABAP service provider
 * @returns Object containing questions and value help data reference
 */
export function getValueHelpSelectionPrompt(
    servicePath: string,
    metadata: string,
    abapServiceProvider: AbapServiceProvider
): { questions: CheckBoxQuestion[]; valueHelpData?: ExternalService[] } {
    PromptState.resetExternalServiceCache();
    const valueHelpChoices = getValueHelpChoices(servicePath, metadata);
    const valueHelpData: ExternalService[] = [];

    const vhSelectionQuestion: CheckBoxQuestion = {
        name: 'valueHelpSelection',
        type: 'checkbox',
        message: t('prompts.valueHelpSelection.message'),
        choices: () => valueHelpChoices,
        validate: async (selectedValueHelps: ExternalServiceReference[][]) => {
            if (!selectedValueHelps || selectedValueHelps.length === 0) {
                PromptState.resetExternalServiceCache();
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
 * Fetches entity data for selected external services.
 *
 * @param selectedValueHelpRefs - The selected external service references
 * @param abapServiceProvider - The ABAP service provider
 * @returns Array of external services with entity data
 */
async function getExternalServiceEntityData(
    selectedValueHelpRefs: ExternalService[],
    abapServiceProvider: AbapServiceProvider
): Promise<ExternalService[]> {
    const externalServiceEntityData: ExternalService[] = [];

    const reqConfig: AxiosRequestConfig = {
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
        PromptState.externalServiceRequestCache[servicePath] ??= [];

        const serviceMetadata = convert(parse(externalServiceRef.metadata));
        const entitySets = serviceMetadata.entitySets;
        const requestPromises = entitySets.map(async (entitySet) => {
            const entitySetName = entitySet.name;
            // If we already have this entity data dont request again
            if (PromptState.externalServiceRequestCache[servicePath].includes(entitySetName)) {
                return;
            }
            PromptState.externalServiceRequestCache[servicePath].push(entitySetName);

            const response = await abapServiceProvider.get(join(valueHelpEntityData.path, entitySetName), reqConfig);
            valueHelpEntityData.entityData = valueHelpEntityData.entityData ?? [];
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
 * Fetches metadata for selected external services.
 *
 * @param selectedValueHelps - The selected value help references
 * @param abapServiceProvider - The ABAP service provider
 * @returns Array of external services with metadata
 */
async function getExternalServiceMetadata(
    selectedValueHelps: ExternalServiceReference[][],
    abapServiceProvider: AbapServiceProvider
): Promise<ExternalService[]> {
    const flatExtSerRefs = selectedValueHelps.flat();
    const extServiceData = await abapServiceProvider.fetchExternalServices(flatExtSerRefs);
    return extServiceData;
}

/**
 * Gets the checkbox choices for value help selection.
 *
 * @param servicePath - The service path
 * @param metadata - The service metadata
 * @returns Array of checkbox choices for value help entities
 */
function getValueHelpChoices(
    servicePath: string,
    metadata: string
): CheckboxChoiceOptions<{ name: string; value: ExternalServiceReference }>[] {
    const externalServiceRefs = getExternalServiceReferences(servicePath, metadata, []) as ValueListReference[];

    // Build path -> entity -> refs map in a single pass
    const choiceNameByPathAndEntity: {
        [path: string]: {
            [targetEntity: string]: ExternalServiceReference[];
        };
    } = {};

    for (const ref of externalServiceRefs) {
        if (ref.type === 'value-list') {
            // Skip specific target names
            if (entityTypeExclusions.includes(ref.target)) {
                continue;
            }
            const [vhServicePath] = ref.value.split(';');
            const targetEntity = ref.target.split('/').pop();
            if (targetEntity) {
                choiceNameByPathAndEntity[vhServicePath] ??= {};
                choiceNameByPathAndEntity[vhServicePath][targetEntity] ??= [];
                choiceNameByPathAndEntity[vhServicePath][targetEntity].push(ref);
            }
        } else if (ref.type === 'code-list') {
            // Put all code list entities for the same service on the same choice
            choiceNameByPathAndEntity[ref.value] ??= {};
            choiceNameByPathAndEntity[ref.value]['Code list'] ??= [];
            choiceNameByPathAndEntity[ref.value]['Code list'].push(ref);
        }
    }

    // Create choices
    const choices: { name: string; value: ExternalServiceReference[] }[] = [];
    for (const targetEntities of Object.values(choiceNameByPathAndEntity)) {
        for (const [targetEntity, entityRefs] of Object.entries(targetEntities)) {
            const choiceNameTargets = entityRefs
                .map((entityRef) => {
                    if (entityRef.type === 'value-list') {
                        return entityRef.target.replace(/\/[^/]*$/, '');
                    } else if (entityRef.type === 'code-list' && entityRef.collectionPath) {
                        return entityRef.collectionPath;
                    }
                    return undefined;
                })
                .filter((t): t is string => t !== undefined);

            choices.push({ name: `${targetEntity} (${choiceNameTargets.join()})`, value: entityRefs });
        }
    }

    return choices.sort((a, b) => a.name.localeCompare(b.name));
}
